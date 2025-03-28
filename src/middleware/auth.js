const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : '';
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Verificar se o usuário existe e não está bloqueado
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.isBlocked) {
      return res.status(403).json({ message: 'Acesso negado. Usuário não encontrado ou bloqueado.' });
    }

    if (!user.isApproved && !user.isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Sua conta está pendente de aprovação.' });
    }

    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

module.exports = auth; 