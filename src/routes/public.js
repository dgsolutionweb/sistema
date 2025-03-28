const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rota pública para listar produtos em estoque de uma empresa específica
router.get('/company/:userId/products', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // Verificar se o usuário existe e está ativo
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                isBlocked: false,
                isApproved: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Empresa não encontrada ou não está ativa' });
        }

        console.log(`Buscando produtos da empresa ${user.company} (ID: ${userId})`);
        
        const products = await prisma.product.findMany({
            where: {
                userId: userId,
                quantity: {
                    gt: 0
                }
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                quantity: true,
                category: true,
                user: {
                    select: {
                        company: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        console.log(`Encontrados ${products.length} produtos para a empresa ${user.company}`);
        res.json({
            company: user.company,
            products: products
        });
    } catch (error) {
        console.error('Erro detalhado ao buscar produtos:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar produtos',
            error: error.message 
        });
    }
});

// Rota pública para buscar um produto específico
router.get('/products/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: {
                id: parseInt(req.params.id)
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                quantity: true,
                category: true
            }
        });

        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        res.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar produto',
            error: error.message 
        });
    }
});

module.exports = router; 