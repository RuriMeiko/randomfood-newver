# Debt Tracking Bot - Autonomous AI Agent

Bot Telegram ghi nợ thông minh với AI tự động, hỗ trợ khấu trừ nợ qua lại.

## Tính năng

- ✅ Ghi nợ tự động: "anh nợ Long 500k"
- ✅ Xem nợ: "em nợ ai bao nhiêu?"
- ✅ Trả nợ: "anh trả Long 200k"
- ✅ **Tự động khấu trừ nợ qua lại**
- ✅ AI tự học schema database (không cần hardcode)
- ✅ Hỗ trợ chat riêng và nhóm

## Cài đặt nhanh

```bash
# 1. Tạo database
npm run db:init

# 2. Tạo file .dev.vars với:
# GEMINI_API_KEY=your_key
# API_TELEGRAM=your_bot_token
# NEON_DATABASE_URL=postgresql://...

# 3. Deploy
npm install
npm run deploy
```

## Khấu trừ nợ tự động

```
A nợ B: 500k
B nợ A: 300k
→ Tự động: A nợ B 200k
```

Chi tiết: [DEBT_CONSOLIDATION.md](DEBT_CONSOLIDATION.md)

## Kiến trúc

- **Autonomous AI Agent** - AI tự khám phá database
- **Tool-based** - inspect_schema, execute_sql
- **PostgreSQL** - Neon database + views + functions
- **Cloudflare Workers** - Serverless
- **Gemini Flash** - LLM

## Tài liệu

- [AUTONOMOUS_AGENT_README.md](AUTONOMOUS_AGENT_README.md) - Kiến trúc chi tiết
- [DEBT_CONSOLIDATION.md](DEBT_CONSOLIDATION.md) - Hướng dẫn khấu trừ nợ
- [init-database.sql](init-database.sql) - Database schema

## Testing

```bash
npm run dev

# Test:
"mây ơi"
"anh nợ Long 500k"
"Long nợ anh 300k"  → khấu trừ tự động
"em nợ ai bao nhiêu?"
```

## License

MIT
