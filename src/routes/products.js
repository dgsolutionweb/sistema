const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar produtos do usuário
router.get('/', auth, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.user.userId }
    });
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ message: 'Erro ao buscar produtos' });
  }
});

// Criar novo produto
router.post('/',
  auth,
  [
    body('name').notEmpty(),
    body('price').isNumeric(),
    body('quantity').isInt({ min: 0 }),
    body('category').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, price, quantity, category } = req.body;

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          quantity: parseInt(quantity),
          category,
          userId: req.user.userId
        }
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({ message: 'Erro ao criar produto' });
    }
  }
);

// Atualizar produto
router.put('/:id',
  auth,
  [
    body('name').notEmpty(),
    body('price').isNumeric(),
    body('quantity').isInt({ min: 0 }),
    body('category').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, price, quantity, category } = req.body;

      // Verificar se o produto pertence ao usuário
      const existingProduct = await prisma.product.findFirst({
        where: { id: parseInt(id), userId: req.user.userId }
      });

      if (!existingProduct) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }

      const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          price: parseFloat(price),
          quantity: parseInt(quantity),
          category
        }
      });

      res.json(product);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({ message: 'Erro ao atualizar produto' });
    }
  }
);

// Excluir produto
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o produto pertence ao usuário
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: parseInt(id), 
        userId: req.user.userId 
      },
      include: {
        movements: true
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Primeiro, excluir todas as movimentações relacionadas
    if (existingProduct.movements.length > 0) {
      await prisma.movement.deleteMany({
        where: { productId: parseInt(id) }
      });
    }

    // Depois, excluir o produto
    await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ message: 'Erro ao excluir produto' });
  }
});

module.exports = router; 