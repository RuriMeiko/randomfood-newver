# VPS Deployment Guide

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
```

### 2. Setup Environment
```bash
# Clone repository
git clone https://github.com/RuriMeiko/randomfood-newver.git
cd randomfood-newver

# Copy and edit environment file
cp env.example .env
nano .env
```

### 3. Deploy with Docker

#### Development
```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Access webhook UI
http://localhost:3000/webhook-ui
```

#### Production
```bash
# Build and start containers
docker-compose up -d

# Check logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Telegram
API_TELEGRAM=your_bot_token
BOT_USERNAME=your_bot_username

# Database
NEON_DATABASE_URL=postgresql://...

# Webhook UI Auth
WEBHOOK_ADMIN_USER=admin
WEBHOOK_ADMIN_PASSWORD=your_secure_password

# Server
PORT=3000
NODE_ENV=production
```

### SSL Setup (for HTTPS webhook)
```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
```

### Update Nginx Config
Edit `nginx.conf` and change `your-domain.com` to your actual domain.

## 📊 Monitoring

### Check Status
```bash
# Container status
docker-compose ps

# App logs
docker-compose logs -f app

# Redis logs
docker-compose logs -f redis

# Health check
curl http://localhost:3000/health
```

### Restart Services
```bash
# Restart app only
docker-compose restart app

# Restart all
docker-compose restart
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin master

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app

# Check disk space
df -h

# Check memory
free -h
```

### Webhook not receiving messages
1. Check webhook URL is set: `/api/webhook-info`
2. Verify domain is accessible from internet
3. Ensure SSL certificate is valid
4. Check Telegram webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

## 🔐 Security Best Practices

1. **Use strong passwords** for webhook UI
2. **Keep SSL certificates updated** (use certbot auto-renewal)
3. **Restrict port access** in firewall (only 80, 443)
4. **Regular backups** of database
5. **Monitor logs** for suspicious activity

## 🏗️ Architecture

```
Internet
   ↓
Nginx (Port 80/443)
   ↓
Express Server (Port 3000)
   ↓
AI Bot Service
   ↓
PostgreSQL (Neon) + Redis
```

## 📈 Performance

- **No cold starts** - Always warm
- **No CPU time limits** - Full VPS resources
- **In-memory cache** - Optional Redis for caching
- **Direct database access** - No rate limits

## 💰 Cost Estimation

- VPS: $5-10/month (2GB RAM, 1 CPU)
- Database: Neon Free tier or $10/month
- Domain: $10-15/year
- **Total: ~$6-11/month**

vs Cloudflare Workers: $5-25+/month (depends on usage)
