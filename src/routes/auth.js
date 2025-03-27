const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Middleware para verificar se o usuário é admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        res.status(500).json({ message: 'Erro ao verificar permissões' });
    }
};

// Listar todos os usuários (apenas admin)
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                isAdmin: true,
                isApproved: true,
                isBlocked: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
});

// Aprovar usuário (apenas admin)
router.put('/users/:userId/approve', auth, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { isApproved: true }
        });
        res.json(user);
    } catch (error) {
        console.error('Erro ao aprovar usuário:', error);
        res.status(500).json({ message: 'Erro ao aprovar usuário' });
    }
});

// Bloquear/Desbloquear usuário (apenas admin)
router.put('/users/:userId/:action', auth, isAdmin, async (req, res) => {
    try {
        const { userId, action } = req.params;
        if (action !== 'block' && action !== 'unblock') {
            return res.status(400).json({ message: 'Ação inválida' });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { isBlocked: action === 'block' }
        });
        res.json(user);
    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({ message: 'Erro ao alterar status do usuário' });
    }
});

// Excluir usuário (apenas admin)
router.delete('/users/:userId', auth, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(userId) }
        });
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ message: 'Erro ao excluir usuário' });
    }
});

// Obter dados do usuário atual
router.get('/me', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                isAdmin: true,
                isApproved: true,
                isBlocked: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
});

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
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Formatar os erros de validação em uma mensagem mais amigável
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json({ message: errorMessages.join(', ') });
      }

      const { email, password } = req.body;

      // Buscar usuário
      const user = await prisma.user.findUnique({ 
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          company: true,
          isAdmin: true,
          isApproved: true,
          isBlocked: true
        }
      });

      if (!user) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }

      // Verificar se o usuário está bloqueado
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Sua conta está bloqueada. Entre em contato com o administrador.' });
      }

      // Verificar se o usuário está aprovado
      if (!user.isApproved && !user.isAdmin) {
        return res.status(403).json({ message: 'Sua conta está aguardando aprovação do administrador.' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remover a senha do objeto de usuário antes de enviar
      const { password: _, ...userWithoutPassword } = user;

      res.json({ 
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro ao fazer login. Por favor, tente novamente.' });
    }
  }
);

module.exports = router; 