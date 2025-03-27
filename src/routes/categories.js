const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar categorias do usuário
router.get('/', auth, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { userId: req.user.userId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ message: 'Erro ao buscar categorias' });
    }
});

// Criar nova categoria
router.post('/',
    auth,
    [
        body('name').notEmpty().withMessage('Nome da categoria é obrigatório')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name } = req.body;

            // Verificar se já existe uma categoria com o mesmo nome para o usuário
            const existingCategory = await prisma.category.findFirst({
                where: { 
                    name,
                    userId: req.user.userId
                }
            });

            if (existingCategory) {
                return res.status(400).json({ message: 'Já existe uma categoria com este nome' });
            }

            const category = await prisma.category.create({
                data: {
                    name,
                    userId: req.user.userId
                }
            });

            res.status(201).json(category);
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            res.status(500).json({ message: 'Erro ao criar categoria' });
        }
    }
);

// Excluir categoria
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se a categoria pertence ao usuário
        const category = await prisma.category.findFirst({
            where: { 
                id: parseInt(id),
                userId: req.user.userId
            }
        });

        if (!category) {
            return res.status(404).json({ message: 'Categoria não encontrada' });
        }

        // Verificar se existem produtos usando esta categoria
        const productsWithCategory = await prisma.product.findFirst({
            where: { 
                category: category.name,
                userId: req.user.userId
            }
        });

        if (productsWithCategory) {
            return res.status(400).json({ 
                message: 'Não é possível excluir esta categoria pois existem produtos vinculados a ela' 
            });
        }

        await prisma.category.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        res.status(500).json({ message: 'Erro ao excluir categoria' });
    }
});

module.exports = router; 