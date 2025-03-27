const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        // Verifica se o admin já existe
        const existingAdmin = await prisma.user.findUnique({
            where: {
                email: 'admin@sistema.com'
            }
        });

        if (existingAdmin) {
            console.log('Usuário admin já existe');
            return;
        }

        // Cria o hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('P@ssw0rd450', salt);

        // Cria o usuário admin
        const adminUser = await prisma.user.create({
            data: {
                name: 'Administrador',
                email: 'admin@sistema.com',
                password: hashedPassword,
                company: 'C&D Estoque',
                isAdmin: true,
                isApproved: true,
                isBlocked: false,
            }
        });

        console.log('Usuário admin criado com sucesso:', adminUser);

    } catch (error) {
        console.error('Erro ao criar usuário admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser(); 