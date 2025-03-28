const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar vendas do usuário
router.get('/', auth, async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            where: { userId: req.user.userId },
            include: {
                client: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(sales);
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        res.status(500).json({ message: 'Erro ao buscar vendas' });
    }
});

// Obter venda específica
router.get('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                userId: req.user.userId
            },
            include: {
                client: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        
        if (!sale) {
            return res.status(404).json({ message: 'Venda não encontrada' });
        }
        
        res.json(sale);
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({ message: 'Erro ao buscar venda' });
    }
});

// Criar nova venda (PDV)
router.post('/', [
    auth,
    body('items').isArray().withMessage('Itens devem ser uma lista'),
    body('items.*.productId').isInt().withMessage('ID do produto deve ser um número'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantidade deve ser maior que zero'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Preço deve ser maior ou igual a zero'),
    body('total').isFloat({ min: 0 }).withMessage('Total deve ser maior ou igual a zero'),
    body('paymentMethod').notEmpty().withMessage('Método de pagamento é obrigatório'),
    body('clientId').optional().isInt().withMessage('ID do cliente deve ser um número'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Desconto deve ser maior ou igual a zero'),
    body('notes').optional()
], async (req, res) => {
    // Iniciar transação
    const result = await prisma.$transaction(async (prisma) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw { status: 400, errors: errors.array() };
            }

            const { items, total, discount, paymentMethod, clientId, notes } = req.body;
            
            // Verificar estoque dos produtos
            for (const item of items) {
                const product = await prisma.product.findFirst({
                    where: {
                        id: item.productId,
                        userId: req.user.userId
                    }
                });
                
                if (!product) {
                    throw { status: 404, message: `Produto com ID ${item.productId} não encontrado` };
                }
                
                if (product.quantity < item.quantity) {
                    throw { 
                        status: 400, 
                        message: `Quantidade insuficiente em estoque para o produto ${product.name}. Disponível: ${product.quantity}` 
                    };
                }
            }
            
            // Obter o próximo número da venda
            const lastSale = await prisma.sale.findFirst({
                where: { userId: req.user.userId },
                orderBy: { number: 'desc' },
                select: { number: true }
            });
            
            const saleNumber = lastSale ? lastSale.number + 1 : 1;
            
            // Criar a venda
            const sale = await prisma.sale.create({
                data: {
                    number: saleNumber,
                    total,
                    discount: discount || 0,
                    paymentMethod,
                    status: 'concluída',
                    clientId: clientId || null,
                    notes: notes || null,
                    userId: req.user.userId,
                    items: {
                        create: items.map(item => ({
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount || 0,
                            total: item.quantity * item.price - (item.discount || 0),
                            productId: item.productId
                        }))
                    }
                },
                include: {
                    client: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            
            // Atualizar estoque dos produtos
            for (const item of items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        quantity: {
                            decrement: item.quantity
                        }
                    }
                });
                
                // Registrar movimentação de saída
                await prisma.movement.create({
                    data: {
                        type: 'saida',
                        quantity: item.quantity,
                        productId: item.productId,
                        userId: req.user.userId
                    }
                });
            }
            
            return sale;
        } catch (error) {
            // Capturar erros personalizados e repassar
            if (error.status) {
                throw error;
            }
            
            // Logar e repassar outros erros
            console.error('Erro na transação de venda:', error);
            throw { status: 500, message: 'Erro ao processar a venda' };
        }
    }).catch(error => {
        // Retornar o erro da transação
        return { error };
    });
    
    // Verificar se ocorreu um erro
    if (result.error) {
        const { status, message, errors } = result.error;
        if (errors) {
            return res.status(status).json({ errors });
        }
        return res.status(status || 500).json({ message });
    }
    
    res.status(201).json(result);
});

// Cancelar venda
router.put('/:id/cancel', auth, async (req, res) => {
    console.log(`Recebido pedido de cancelamento para venda ID: ${req.params.id}`);
    console.log('Usuário requisitando:', req.user.userId);
    
    // Iniciar transação
    const result = await prisma.$transaction(async (prisma) => {
        try {
            const id = parseInt(req.params.id);
            console.log(`ID após conversão: ${id}`);
            
            // Verificar se a venda pertence ao usuário e está ativa
            const sale = await prisma.sale.findFirst({
                where: {
                    id,
                    userId: req.user.userId,
                    status: 'concluída'
                },
                include: {
                    items: true
                }
            });
            
            console.log('Venda encontrada:', sale ? 'Sim' : 'Não');
            
            if (!sale) {
                throw { status: 404, message: 'Venda não encontrada ou já cancelada' };
            }
            
            // Atualizar status da venda
            const updatedSale = await prisma.sale.update({
                where: { id },
                data: {
                    status: 'cancelada'
                },
                include: {
                    client: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            
            // Devolver produtos ao estoque
            for (const item of sale.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        quantity: {
                            increment: item.quantity
                        }
                    }
                });
                
                // Registrar movimentação de entrada (devolução)
                await prisma.movement.create({
                    data: {
                        type: 'entrada',
                        quantity: item.quantity,
                        productId: item.productId,
                        userId: req.user.userId
                    }
                });
            }
            
            return updatedSale;
        } catch (error) {
            // Capturar erros personalizados e repassar
            if (error.status) {
                throw error;
            }
            
            // Logar e repassar outros erros
            console.error('Erro ao cancelar venda:', error);
            throw { status: 500, message: 'Erro ao cancelar a venda' };
        }
    }).catch(error => {
        // Retornar o erro da transação
        return { error };
    });
    
    // Verificar se ocorreu um erro
    if (result.error) {
        const { status, message } = result.error;
        return res.status(status || 500).json({ message });
    }
    
    res.json(result);
});

// Gerar recibo/cupom fiscal da venda
router.get('/:id/receipt', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                userId: req.user.userId
            },
            include: {
                client: true,
                user: {
                    select: {
                        company: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        
        if (!sale) {
            return res.status(404).json({ message: 'Venda não encontrada' });
        }
        
        // Formatar dados para recibo
        const receipt = {
            empresa: sale.user.company,
            numero: sale.number,
            data: sale.createdAt,
            cliente: sale.client ? sale.client.name : 'Cliente não informado',
            itens: sale.items.map(item => ({
                produto: item.product.name,
                quantidade: item.quantity,
                precoUnitario: Number(item.price),
                total: Number(item.total)
            })),
            subtotal: sale.items.reduce((acc, item) => acc + Number(item.total), 0),
            desconto: Number(sale.discount || 0),
            total: Number(sale.total),
            formaPagamento: sale.paymentMethod,
            status: sale.status
        };
        
        res.json(receipt);
    } catch (error) {
        console.error('Erro ao gerar recibo:', error);
        res.status(500).json({ message: 'Erro ao gerar recibo' });
    }
});

module.exports = router; 