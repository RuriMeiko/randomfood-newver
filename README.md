# AI Debt Tracking Bot

Bot AI thông minh để quản lý nợ và theo dõi tài chính cá nhân trên Telegram, được xây dựng với Cloudflare Workers, Drizzle ORM và Google Gemini AI.

## Tính năng

- **AI Context-Aware**: Hiểu ngữ cảnh từ lịch sử chat và thông tin nợ hiện tại
- **Smart Intent Detection**: Tự động phân tích intent từ tin nhắn tự nhiên
- **Intelligent Debt Recording**: Trích xuất thông tin nợ từ câu nói phức tạp
- **Name Learning**: Tự động học và ánh xạ tên gọi, biệt danh  
- **SQL Generation**: Tự động tạo và thực thi SQL queries an toàn
- **Conversation Memory**: Lưu trữ và sử dụng lịch sử hội thoại
- **Multi-group Support**: Hỗ trợ cả chat riêng và group chat

## Cài đặt

1. **Clone repository**
```bash
git clone <repo-url>
cd debt-tracking-bot
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Thiết lập database**
```bash
# Generate migration
npm run db:generate

# Push schema to database
npm run db:push
```

4. **Cấu hình environment variables**
Tạo file `.env` hoặc cấu hình trong Cloudflare Workers:
```bash
GEMINI_API_KEY=your_gemini_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_neon_database_url
```

5. **Deploy lên Cloudflare Workers**
```bash
npx wrangler deploy
```

## Sử dụng

### Setup Webhook
Sau khi deploy, gọi endpoint để thiết lập webhook:
```bash
curl -X POST https://your-worker-domain.workers.dev/setup-webhook
```

### Ví dụ tin nhắn

Bot có thể hiểu các tin nhắn như:

**Ghi nợ:**
- "bot ơi, ghi nợ giúp tôi, tôi nợ Ngọc Long 503k nhe"
- "Ngọc Long nợ Hưng Thịnh 28k và tôi nợ Hưng Thịnh 28k"
- "ghi nợ: A nợ B 100k"

**Tra cứu nợ:**
- "ai nợ ai bao nhiêu vậy?"
- "kiểm tra nợ đi"
- "xem nợ hiện tại"

**Trả nợ:**
- "Thịnh đã trả tôi 50k"
- "thanh toán nợ 100k cho Mai"

## API Endpoints

- `POST /webhook` - Telegram webhook
- `POST /setup-webhook` - Thiết lập webhook
- `POST /test` - Test bot với message
- `GET /health` - Health check

### Test API
```bash
curl -X POST https://your-worker-domain.workers.dev/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "first_name": "Test User",
        "username": "testuser"
      },
      "chat": {
        "id": 123456789,
        "type": "private"
      },
      "date": 1640995200,
      "text": "bot ơi, tôi nợ Ngọc Long 100k"
    }
  }'
```

## Database Schema

### Các bảng chính:
- `tg_users`: Thông tin người dùng Telegram
- `tg_groups`: Thông tin group/chat
- `debts`: Thông tin nợ
- `name_aliases`: Ánh xạ tên gọi
- `chat_sessions`: Phiên chat
- `chat_messages`: Tin nhắn chat

## Công nghệ sử dụng

- **Cloudflare Workers**: Runtime serverless
- **Drizzle ORM**: Type-safe database ORM
- **Neon Database**: Serverless PostgreSQL
- **Google Gemini AI**: AI language model
- **Telegram Bot API**: Telegram integration

## Development

```bash
# Generate database schema
npm run db:generate

# Push schema changes
npm run db:push

# Open database studio
npm run db:studio

# Build project
npm run build

# Type check
npm run types
```

## Cấu trúc thư mục

```
src/
├── db/
│   ├── schema.ts          # Database schema
│   └── neon.ts           # Database connection
├── services/
│   └── debt-bot.service.ts # Main bot logic
└── index.ts              # Main entry point
```

## Ví dụ sử dụng

### Tin nhắn mẫu đã test:
```
"bot iui à, ghi nợ giúp tụi anh, anh nợ Ngọc Long 503k nhe, còn Ngọc Long nợ Hưng Thịnh 28k và a nợ Hưng Thịnh 28k"
```

Bot sẽ phân tích và trả về:
```
✅ Đã ghi: anh nợ Ngọc Long 503000VND
✅ Đã ghi: Ngọc Long nợ Hưng Thịnh 28000VND  
✅ Đã ghi: a nợ Hưng Thịnh 28000VND
```

## License

MIT License