require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
    origin: ['https://strongzonefit.com', 'http://strongzonefit.com'],
    credentials: true
}));
app.use(express.json());

// Rotas públicas (sem autenticação)
app.use('/api/public', require('./routes/public'));

// Rotas protegidas (com autenticação)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/categories', require('./routes/categories'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({ 
        message: 'Algo deu errado!',
        error: err.message 
    });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
}); 