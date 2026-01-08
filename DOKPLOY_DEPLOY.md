# Deploy to Dokploy

## 🚀 Quick Setup

### 1. Push code to GitHub
```bash
git add -A
git commit -m "Ready for Dokploy deployment"
git push origin master
```

### 2. Dokploy Setup

1. **Create New Application**
   - Go to your Dokploy dashboard
   - Click "New Application"
   - Select "Docker Compose" or "Dockerfile"

2. **Connect Repository**
   - Repository: `https://github.com/RuriMeiko/randomfood-newver`
   - Branch: `master`
   - Build Path: `/`

3. **Configure Environment Variables**
   ```
   API_TELEGRAM=your_bot_token
   BOT_USERNAME=your_bot_username
   NEON_DATABASE_URL=postgresql://...
   WEBHOOK_ADMIN_USER=admin
   WEBHOOK_ADMIN_PASSWORD=your_password
   PORT=3000
   NODE_ENV=production
   ```

4. **Domain Setup**
   - Domain: `mayishere.wtfdev.qzz.io`
   - Port: `3000`
   - SSL: Auto (Let's Encrypt) ✅

5. **Deploy**
   - Click "Deploy"
   - Wait for build (~2-3 minutes)
   - Check health at: `https://mayishere.wtfdev.qzz.io/health`

### 3. Setup Telegram Webhook

Visit: `https://mayishere.wtfdev.qzz.io/webhook-ui`

Username: `admin` (from env)
Password: (from env)

Set webhook URL to: `https://mayishere.wtfdev.qzz.io/webhook`

## ✅ Verification

```bash
# Check health
curl https://mayishere.wtfdev.qzz.io/health

# Should return:
# {"status":"ok","timestamp":"2026-01-08T...","uptime":123.45}
```

## 🔄 Updates

Dokploy auto-deploys on git push to master:

```bash
git add -A
git commit -m "Update something"
git push origin master
```

## 🐛 Troubleshooting

### Container not starting
- Check logs in Dokploy dashboard
- Verify environment variables
- Check PORT is 3000

### Webhook not working
- Verify domain is accessible
- Check SSL certificate is valid
- Test: `curl https://mayishere.wtfdev.qzz.io/webhook`

### Database connection issues
- Verify NEON_DATABASE_URL is correct
- Check Neon database is accessible from Dokploy IP

## 📊 Architecture on Dokploy

```
Internet
   ↓
Traefik (Dokploy's built-in proxy)
   ↓ SSL termination
   ↓ Domain routing
Express Server (Container Port 3000)
   ↓
PostgreSQL (Neon)
```

## 💰 Cost

- Dokploy hosting: Free or self-hosted
- Database: Neon free tier or $10/month
- Domain: Already have
- **Total: $0-10/month**

## 🎯 Advantages

- ✅ Auto SSL with Let's Encrypt
- ✅ Auto deploy on git push
- ✅ Built-in reverse proxy (no nginx needed)
- ✅ Easy rollback
- ✅ Monitoring & logs
- ✅ No cold starts
- ✅ No CPU limits
