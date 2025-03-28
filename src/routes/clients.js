const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar clientes do usuário
router.get('/', auth, async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            where: { userId: req.user.userId },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ message: 'Erro ao buscar clientes' });
    }
});

// Obter cliente específico
router.get('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const client = await prisma.client.findFirst({
            where: {
                id,
                userId: req.user.userId
            }
        });
        
        if (!client) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }
        
        res.json(client);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ message: 'Erro ao buscar cliente' });
    }
});

// Criar novo cliente
router.post('/', [
    auth,
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phone').optional(),
    body('address').optional(),
    body('document').optional(),
    body('notes').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, phone, address, document, notes } = req.body;
        
        const client = await prisma.client.create({
            data: {
                name,
                email,
                phone,
                address,
                document,
                notes,
                userId: req.user.userId
            }
        });
        
        res.status(201).json(client);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ message: 'Erro ao criar cliente' });
    }
});

// Atualizar cliente
router.put('/:id', [
    auth,
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phone').optional(),
    body('address').optional(),
    body('document').optional(),
    body('notes').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const id = parseInt(req.params.id);
        const { name, email, phone, address, document, notes } = req.body;
        
        // Verificar se o cliente pertence ao usuário
        const existingClient = await prisma.client.findFirst({
            where: {
                id,
                userId: req.user.userId
            }
        });
        
        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }
        
        const client = await prisma.client.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                document,
                notes
            }
        });
        
        res.json(client);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ message: 'Erro ao atualizar cliente' });
    }
});

// Excluir cliente
router.delete('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Verificar se o cliente pertence ao usuário
        const existingClient = await prisma.client.findFirst({
            where: {
                id,
                userId: req.user.userId
            }
        });
        
        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }
        
        // Verificar se o cliente possui vendas associadas
        const hasSales = await prisma.sale.findFirst({
            where: {
                clientId: id
            }
        });
        
        if (hasSales) {
            return res.status(400).json({ 
                message: 'Não é possível excluir este cliente pois ele possui vendas associadas' 
            });
        }
        
        await prisma.client.delete({
            where: { id }
        });
        
        res.json({ message: 'Cliente excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ message: 'Erro ao excluir cliente' });
    }
});

module.exports = router; 