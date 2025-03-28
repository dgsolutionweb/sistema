# C&D Estoque - Sistema de Gestão de Estoque

Sistema completo de gestão de estoque com controle de usuários, produtos, categorias e movimentações.

## Requisitos do Sistema

- Node.js 16.x ou superior
- MySQL 8.x
- Nginx
- PM2 (para gerenciamento de processos)
- Git

## Estrutura do Projeto

```
/sistema/
├── src/              # Código fonte do backend
│   ├── routes/       # Rotas da API
│   ├── controllers/  # Controladores
│   └── middleware/   # Middlewares
├── prisma/           # Configurações do Prisma
├── public/           # Frontend estático
│   ├── js/          # Scripts JavaScript
│   ├── css/         # Estilos CSS
│   └── index.html   # Página principal
└── logs/            # Logs da aplicação
```

## Instalação em Produção (VPS)

### 1. Preparação do Ambiente

```bash
# Atualizar o sistema
sudo apt update
sudo apt upgrade -y

# Instalar dependências
sudo apt install -y nginx mysql-server nodejs npm git

# Instalar PM2 globalmente
sudo npm install -y pm2 -g
```

### 2. Configuração do MySQL

```bash
# Acessar o MySQL
sudo mysql

# Criar banco de dados e usuário
CREATE DATABASE cd_estoque;
CREATE USER 'cd_user'@'localhost' IDENTIFIED BY 'sua_senha_forte';
GRANT ALL PRIVILEGES ON cd_estoque.* TO 'cd_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Configuração do Backend

```bash
# Clonar o repositório
cd /sistema
git clone [URL_DO_REPOSITORIO] .

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cat > .env << EOL
DATABASE_URL="mysql://cd_user:sua_senha_forte@localhost:3306/cd_estoque"
JWT_SECRET="sua_chave_secreta_muito_segura"
PORT=3005
NODE_ENV=production
EOL

# Executar migrações do banco
npx prisma migrate deploy

# Configurar PM2
pm2 start npm --name "cd-estoque-api" -- start
pm2 startup
pm2 save
```

### 4. Configuração do Nginx

Criar arquivo de configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/cd-estoque
```

Conteúdo do arquivo:

```nginx
# Configuração do Frontend
server {
    listen 80;
    server_name seu_dominio.com;

    root /sistema/public;
    index index.html;

    # Logs
    access_log /sistema/logs/nginx-access.log;
    error_log /sistema/logs/nginx-error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml;
    gzip_disable "MSIE [1-6]\.";

    # Cache estático
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Roteamento do frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para a API
    location /api/ {
        proxy_pass http://localhost:3005/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;

        # Tratamento de OPTIONS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Ativar a configuração:

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/cd-estoque /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 5. Configuração de SSL (Certbot)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu_dominio.com

# Renovação automática
sudo certbot renew --dry-run
```

### 6. Manutenção e Monitoramento

#### Logs

```bash
# Criar diretório de logs
mkdir -p /sistema/logs

# Monitorar logs da API
pm2 logs cd-estoque-api

# Monitorar logs do Nginx
tail -f /sistema/logs/nginx-error.log
```

#### Backup do Banco de Dados

Criar script de backup:

```bash
cat > /sistema/backup.sh << EOL
#!/bin/bash
BACKUP_DIR="/sistema/backups"
MYSQL_USER="cd_user"
MYSQL_PASS="sua_senha_forte"
DATABASE="cd_estoque"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Realizar backup
mysqldump -u $MYSQL_USER -p$MYSQL_PASS $DATABASE > $BACKUP_DIR/backup_$DATE.sql

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOL

# Tornar executável
chmod +x /sistema/backup.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /sistema/backup.sh") | crontab -
```

### 7. Atualizações

Para atualizar o sistema:

```bash
cd /sistema
git pull

# Atualizar dependências e banco
npm install
npx prisma migrate deploy
pm2 restart cd-estoque-api

# Limpar cache do Nginx
sudo nginx -s reload
```

### 8. Segurança Adicional

```bash
# Configurar firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Instalar fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Usuário Administrador Padrão

Após a instalação, você pode acessar o sistema com as seguintes credenciais:

- Email: admin@cdestoque.com
- Senha: admin123

**IMPORTANTE:** Altere a senha do administrador após o primeiro acesso.

## Suporte

Para suporte técnico ou dúvidas, entre em contato através do email: suporte@cdestoque.com

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes. 