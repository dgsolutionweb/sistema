const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Relatório de vendas
router.get('/sales', auth, async (req, res) => {
    try {
        const { startDate, endDate, clientId, status } = req.query;
        
        const where = {
            userId: req.user.userId
        };
        
        // Filtro por data
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateObj;
            }
        }
        
        // Filtro por cliente
        if (clientId) {
            where.clientId = parseInt(clientId);
        }
        
        // Filtro por status
        if (status) {
            where.status = status;
        }
        
        const sales = await prisma.sale.findMany({
            where,
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
        
        // Calcular estatísticas
        const totalAmount = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
        const totalItems = sales.reduce((sum, sale) => sum + sale.items.length, 0);
        const totalQuantity = sales.reduce(
            (sum, sale) => sum + sale.items.reduce(
                (itemSum, item) => itemSum + item.quantity, 0
            ), 0
        );
        
        const topProducts = await getTopProducts(req.user.userId, startDate, endDate);
        const dailySales = await getDailySales(req.user.userId, startDate, endDate);
        
        res.json({
            sales,
            stats: {
                count: sales.length,
                totalAmount,
                totalItems,
                totalQuantity,
                average: sales.length > 0 ? totalAmount / sales.length : 0
            },
            topProducts,
            dailySales
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório de vendas' });
    }
});

// Relatório de estoque
router.get('/inventory', auth, async (req, res) => {
    try {
        const { belowMinimum, category } = req.query;
        
        const where = {
            userId: req.user.userId
        };
        
        // Filtro por categoria
        if (category) {
            where.category = category;
        }
        
        // Filtro por quantidade mínima (opcional, poderia ser implementado com campo adicional no modelo)
        let products = await prisma.product.findMany({
            where,
            orderBy: {
                name: 'asc'
            }
        });
        
        // Filtrar produtos com estoque baixo (menos de 5 unidades por padrão)
        if (belowMinimum === 'true') {
            const minimumStock = 5; // Poderia ser um campo no modelo de produto
            products = products.filter(product => product.quantity < minimumStock);
        }
        
        // Estatísticas de inventário
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => sum + (Number(product.price) * product.quantity), 0);
        const outOfStock = products.filter(product => product.quantity === 0).length;
        const lowStock = products.filter(product => product.quantity > 0 && product.quantity < 5).length;
        
        // Distribuição por categoria
        const categoriesMap = {};
        products.forEach(product => {
            if (!categoriesMap[product.category]) {
                categoriesMap[product.category] = {
                    count: 0,
                    value: 0
                };
            }
            
            categoriesMap[product.category].count += 1;
            categoriesMap[product.category].value += Number(product.price) * product.quantity;
        });
        
        const categoryStats = Object.entries(categoriesMap).map(([name, stats]) => ({
            name,
            productCount: stats.count,
            stockValue: stats.value
        }));
        
        res.json({
            products,
            stats: {
                totalProducts,
                totalValue,
                outOfStock,
                lowStock
            },
            categoryStats
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de estoque:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório de estoque' });
    }
});

// Relatório de clientes
router.get('/clients', auth, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            where: { userId: req.user.userId },
            orderBy: { name: 'asc' }
        });
        
        // Buscar dados de vendas por cliente
        const clientSales = await prisma.sale.groupBy({
            by: ['clientId'],
            where: {
                userId: req.user.userId,
                status: 'concluída'
            },
            _count: {
                _all: true
            },
            _sum: {
                total: true
            }
        });
        
        // Mapear estatísticas para cada cliente
        const clientsWithStats = clients.map(client => {
            const stats = clientSales.find(cs => cs.clientId === client.id);
            return {
                ...client,
                stats: {
                    totalSales: stats ? stats._count._all : 0,
                    totalSpent: stats ? Number(stats._sum.total || 0) : 0
                }
            };
        });
        
        // Top clientes por valor gasto
        const topClients = [...clientsWithStats]
            .sort((a, b) => b.stats.totalSpent - a.stats.totalSpent)
            .slice(0, 5);
        
        // Estatísticas gerais
        const totalClients = clients.length;
        const activeClients = clientsWithStats.filter(c => c.stats.totalSales > 0).length;
        
        res.json({
            clients: clientsWithStats,
            stats: {
                totalClients,
                activeClients,
                inactiveClients: totalClients - activeClients
            },
            topClients
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de clientes:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório de clientes' });
    }
});

// Relatório de movimentações
router.get('/movements', auth, async (req, res) => {
    try {
        const { startDate, endDate, type, productId } = req.query;
        
        const where = {
            userId: req.user.userId
        };
        
        // Filtro por data
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateObj;
            }
        }
        
        // Filtro por tipo de movimentação
        if (type) {
            where.type = type;
        }
        
        // Filtro por produto
        if (productId) {
            where.productId = parseInt(productId);
        }
        
        const movements = await prisma.movement.findMany({
            where,
            include: {
                product: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        // Estatísticas de movimentações
        const entradas = movements.filter(m => m.type === 'entrada');
        const saidas = movements.filter(m => m.type === 'saida');
        
        const totalEntradas = entradas.reduce((sum, m) => sum + m.quantity, 0);
        const totalSaidas = saidas.reduce((sum, m) => sum + m.quantity, 0);
        
        // Movimentações por produto
        const productMovements = await prisma.movement.groupBy({
            by: ['productId'],
            where: {
                userId: req.user.userId,
                ...where
            },
            _sum: {
                quantity: true
            }
        });
        
        // Buscar detalhes dos produtos
        const productsDetails = await prisma.product.findMany({
            where: {
                id: {
                    in: productMovements.map(pm => pm.productId)
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        
        // Mapear estatísticas por produto
        const movementsByProduct = productMovements.map(pm => {
            const product = productsDetails.find(p => p.id === pm.productId);
            return {
                productId: pm.productId,
                productName: product ? product.name : 'Produto não encontrado',
                totalQuantity: pm._sum.quantity
            };
        }).sort((a, b) => b.totalQuantity - a.totalQuantity);
        
        res.json({
            movements,
            stats: {
                totalMovements: movements.length,
                totalEntradas,
                totalSaidas,
                balance: totalEntradas - totalSaidas
            },
            movementsByProduct
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de movimentações:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório de movimentações' });
    }
});

// Funções auxiliares para relatórios
async function getTopProducts(userId, startDate, endDate) {
    const where = {
        sale: {
            userId,
            status: 'concluída'
        }
    };
    
    // Filtro por data
    if (startDate || endDate) {
        where.sale.createdAt = {};
        if (startDate) {
            where.sale.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            where.sale.createdAt.lte = endDateObj;
        }
    }
    
    const productSales = await prisma.saleItem.groupBy({
        by: ['productId'],
        where,
        _sum: {
            quantity: true,
            total: true
        }
    });
    
    // Buscar detalhes dos produtos
    const productIds = productSales.map(ps => ps.productId);
    const products = await prisma.product.findMany({
        where: {
            id: {
                in: productIds
            }
        },
        select: {
            id: true,
            name: true,
            category: true
        }
    });
    
    // Mapear detalhes dos produtos com estatísticas de vendas
    const topProducts = productSales.map(ps => {
        const product = products.find(p => p.id === ps.productId);
        return {
            productId: ps.productId,
            name: product ? product.name : 'Produto não encontrado',
            category: product ? product.category : 'N/A',
            totalQuantity: ps._sum.quantity,
            totalValue: Number(ps._sum.total || 0)
        };
    }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
    
    return topProducts;
}

async function getDailySales(userId, startDate, endDate) {
    const where = {
        userId,
        status: 'concluída'
    };
    
    // Filtro por data
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
            where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            where.createdAt.lte = endDateObj;
        }
    }
    
    const sales = await prisma.sale.findMany({
        where,
        select: {
            createdAt: true,
            total: true
        }
    });
    
    // Agrupar vendas por dia
    const dailyMap = {};
    sales.forEach(sale => {
        const date = sale.createdAt.toISOString().split('T')[0];
        if (!dailyMap[date]) {
            dailyMap[date] = {
                date,
                count: 0,
                total: 0
            };
        }
        
        dailyMap[date].count += 1;
        dailyMap[date].total += Number(sale.total);
    });
    
    // Converter mapa para array e ordenar por data
    const dailySales = Object.values(dailyMap).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    return dailySales;
}

module.exports = router; 