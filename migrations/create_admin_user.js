const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function createAdminUser() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/estoque';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const users = db.collection('users');

        // Verifica se o admin já existe
        const existingAdmin = await users.findOne({ email: 'admin@sistema.com' });
        if (existingAdmin) {
            console.log('Usuário admin já existe');
            return;
        }

        // Cria o hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('P@ssw0rd450', salt);

        // Cria o usuário admin
        const adminUser = {
            name: 'Administrador',
            email: 'admin@sistema.com',
            password: hashedPassword,
            company: 'C&D Estoque',
            isAdmin: true,
            isApproved: true,
            isBlocked: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await users.insertOne(adminUser);
        console.log('Usuário admin criado com sucesso');

    } catch (error) {
        console.error('Erro ao criar usuário admin:', error);
    } finally {
        await client.close();
    }
}

createAdminUser(); 