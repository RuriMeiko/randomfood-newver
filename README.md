# Telegram Bot - VPS Version

Telegram AI Bot chạy trên VPS với Bun + Express

## 🎯 Thay đổi từ Cloudflare Workers

### ✅ Ưu điểm
- ❌ **Không giới hạn CPU time** (80ms → unlimited)
- ❌ **Không cold start** - instance luôn warm  
- ✅ **Realtime 100%** - Bỏ cache, mọi data đều fresh
- ✅ **Chi phí thấp hơn** - VPS $5-10/tháng
- ✅ **Full control** - Tự quản lý infrastructure

### 📦 Tech Stack
- **Runtime**: Bun (faster than Node.js)
- **Framework**: Express
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis (optional)
- **Deployment**: Docker + Docker Compose
- **Reverse Proxy**: Nginx

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Run development
bun run dev

# Run with Docker
docker-compose up -d
```

## 📚 Documentation
- [VPS Deployment Guide](./VPS_DEPLOYMENT.md)
- [Workers Optimization](./WORKERS_OPTIMIZATION.md) - Backup reference

## 🔗 Branches
- `master` - VPS version (current)
- `worker-backup-2026-01-08` - Cloudflare Workers version (backup)

## 📝 Migration Notes
- Removed: wrangler.toml, Workers-specific code
- Removed: Schema cache (realtime 100%)
- Added: Express server, Docker setup
- Added: Nginx reverse proxy config
