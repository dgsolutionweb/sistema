const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Registro de usuário
router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
    body('company').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, company } = req.body;

      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      // Criar hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          company
        }
      });

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({ token });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ message: 'Erro ao registrar usuário' });
    }
  }
);

// Login de usuário
router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Buscar usuário
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro ao fazer login' });
    }
  }
);

module.exports = router; 