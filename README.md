# Debt Tracking Bot - Autonomous AI Agent

Bot Telegram ghi nợ thông minh với AI tự động, hỗ trợ khấu trừ nợ qua lại và quản lý API key tự động.

## ✨ Tính năng

- ✅ **Ghi nợ tự động:** "anh nợ Long 500k"
- ✅ **Xem nợ:** "em nợ ai bao nhiêu?"
- ✅ **Trả nợ:** "anh trả Long 200k"
- ✅ **Tự động khấu trừ nợ qua lại**
- ✅ **AI tự học schema database** (không cần hardcode)
- ✅ **API key rotation** với rate limiting (RPM/RPD)
- ✅ **Emotional state tracking** - Bot có cảm xúc
- ✅ **Hỗ trợ chat riêng và nhóm**

## 🚀 Cài đặt nhanh

```bash
# 1. Clone và install
git clone <repo>
cd randomfood-newver
npm install

# 2. Setup database
psql $NEON_DATABASE_URL -f migrations/init-database.sql
psql $NEON_DATABASE_URL -f migrations/init-api-keys.sql

# 3. Insert API keys vào database
psql $NEON_DATABASE_URL -c "
INSERT INTO api_keys (key_name, api_key, rpm_limit, rpd_limit, is_active)
VALUES 
  ('primary', 'AIza...your_key...', 5, 20, TRUE),
  ('key_1', 'AIza...another_key...', 5, 20, TRUE);
"

# 4. Tạo .dev.vars
cat > .dev.vars << EOF
API_TELEGRAM=your_bot_token_here
NEON_DATABASE_URL=postgresql://...
WEBHOOK_ADMIN_USER=admin
WEBHOOK_ADMIN_PASSWORD=admin123
EOF

# 5. Test local
npm run dev

# 6. Deploy production
npm run deploy
```

## 🔑 API Key Management

**Thay đổi quan trọng:** API keys giờ được quản lý trong database thay vì environment variables!

**Lợi ích:**
- ✅ Automatic rotation khi hit rate limits
- ✅ Không cần redeploy khi thêm/xóa keys
- ✅ Track usage per key (RPM/RPD)
- ✅ Auto-block keys khi có lỗi 429

**Chi tiết:** [migrations/README.md](migrations/README.md)

## 💰 Khấu trừ nợ tự động

```
A nợ B: 500k
B nợ A: 300k
→ Tự động: A nợ B 200k
```

**Chi tiết:** [DEBT_CONSOLIDATION.md](DEBT_CONSOLIDATION.md)

## 🏗️ Kiến trúc

### Core Components
- **Autonomous AI Agent** - Self-discovering database structure
- **Tool-based Architecture** - inspect_schema, execute_sql, analyze_interaction
- **Database as External Memory** - PostgreSQL với views và functions
- **API Key Rotation** - Database-backed với RPM/RPD tracking
- **Cloudflare Workers** - Serverless deployment
- **Google Gemini Flash** - LLM engine

### Tech Stack
- **Runtime:** Cloudflare Workers (Edge)
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **AI:** Google Gemini API với function calling
- **Build:** Worktop (optimized for Workers)
- **Language:** TypeScript

## 📚 Tài liệu

- [SYSTEM_FLOW_ANALYSIS.md](SYSTEM_FLOW_ANALYSIS.md) - Phân tích luồng hệ thống chi tiết
- [AUTONOMOUS_AGENT_README.md](AUTONOMOUS_AGENT_README.md) - Kiến trúc autonomous agent
- [DEBT_CONSOLIDATION.md](DEBT_CONSOLIDATION.md) - Hướng dẫn khấu trừ nợ
- [EMOTION_SYSTEM.md](EMOTION_SYSTEM.md) - Hệ thống cảm xúc của bot
- [migrations/README.md](migrations/README.md) - Database migrations

## 🧪 Testing

```bash
# Run local dev server
npm run dev

# Test commands:
"mây ơi"                      # Trigger bot
"anh nợ Long 500k"            # Ghi nợ
"Long nợ anh 300k"            # Ghi nợ ngược (tự động khấu trừ)
"em nợ ai bao nhiêu?"         # Xem nợ
"anh trả Long 200k"           # Trả nợ
```

## 🔍 Monitoring

Check API key status:
```sql
SELECT 
  key_name, 
  requests_per_minute, rpm_limit,
  requests_per_day, rpd_limit,
  is_active, is_blocked
FROM api_keys;
```

## 📝 License

MIT

