const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar movimentações do usuário
router.get('/', auth, async (req, res) => {
  try {
    const movements = await prisma.movement.findMany({
      where: { userId: req.user.userId },
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(movements);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ message: 'Erro ao buscar movimentações' });
  }
});

// Registrar nova movimentação
router.post('/',
  auth,
  [
    body('type').isIn(['entrada', 'saida']),
    body('quantity').isInt({ min: 1 }),
    body('productId').isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, quantity, productId } = req.body;

      // Verificar se o produto pertence ao usuário
      const product = await prisma.product.findFirst({
        where: { id: productId, userId: req.user.userId }
      });

      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }

      // Verificar estoque para saída
      if (type === 'saida' && product.quantity < quantity) {
        return res.status(400).json({ message: 'Quantidade insuficiente em estoque' });
      }

      // Criar movimentação
      const movement = await prisma.movement.create({
        data: {
          type,
          quantity,
          productId,
          userId: req.user.userId
        }
      });

      // Atualizar quantidade do produto
      const newQuantity = type === 'entrada' 
        ? product.quantity + quantity 
        : product.quantity - quantity;

      await prisma.product.update({
        where: { id: productId },
        data: { quantity: newQuantity }
      });

      res.status(201).json(movement);
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      res.status(500).json({ message: 'Erro ao registrar movimentação' });
    }
  }
);

// Obter estatísticas
router.get('/stats', auth, async (req, res) => {
  try {
    const movements = await prisma.movement.findMany({
      where: { userId: req.user.userId },
      include: {
        product: true
      }
    });

    const stats = {
      totalEntradas: movements.filter(m => m.type === 'entrada').length,
      totalSaidas: movements.filter(m => m.type === 'saida').length,
      quantidadeTotalEntrada: movements
        .filter(m => m.type === 'entrada')
        .reduce((acc, m) => acc + m.quantity, 0),
      quantidadeTotalSaida: movements
        .filter(m => m.type === 'saida')
        .reduce((acc, m) => acc + m.quantity, 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router; 