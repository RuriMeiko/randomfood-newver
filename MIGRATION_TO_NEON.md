# Migration từ MongoDB sang Neon PostgreSQL

## Tóm tắt thay đổi

### 1. Packages đã thay đổi
- ❌ Removed: MongoDB Atlas SDK
- ✅ Added: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`

### 2. Database Schema (Code-first approach)
- File: `src/db/schema.ts` - Định nghĩa tất cả tables
- File: `src/db/neon.ts` - Database connection và wrapper class
- File: `drizzle.config.ts` - Drizzle configuration

### 3. Environment Variables
```bash
# Thay đổi từ:
API_MONGO_TOKEN=your_mongo_token
URL_API_MONGO=your_mongo_url

# Sang:
DATABASE_URL=your_neon_connection_string
```

### 4. Table Structure
```sql
-- mainfood: Món ăn chính
-- subfood: Món ăn phụ  
-- historyfood: Lịch sử gợi ý
-- command: Tracking user commands
-- credit: Help data
-- tag: Tagged users
-- debt: Debt tracking (sẵn sàng cho tương lai)
```

## Hướng dẫn Migration

### Bước 1: Setup Neon Database
1. Tạo account tại https://neon.tech
2. Tạo database mới
3. Copy connection string
4. Update `wrangler.toml`:
```toml
[vars]
DATABASE_URL = "your_neon_connection_string"
```

### Bước 2: Generate và Push Schema
```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push
```

### Bước 3: Seed Database
```bash
# Chạy seeder để tạo dữ liệu mẫu
node -r esbuild-register src/db/seed.ts
```

### Bước 4: Test
```bash
# Build project
npm run build

# Deploy
wrangler deploy
```

## Các thay đổi Code chính

### MongoDB Query → PostgreSQL Query
```typescript
// Trước (MongoDB)
await this.database
  .db("randomfood")
  .collection("mainfood")
  .find({ filter: { _id: objectId } });

// Sau (Neon)  
await this.database
  .collection("mainfood")
  .find({ filter: { id: userId } });
```

### Field Mapping
- `_id` → `id` (auto increment)
- `RandomAt` → `randomAt` (camelCase)
- `userid` → `userid` (string)
- MongoDB ObjectId → PostgreSQL integer

## Lưu ý quan trọng

1. **Code-first**: Schema được định nghĩa trong code, tự động generate DB
2. **Auto-increment IDs**: Thay vì ObjectId, dùng serial integers
3. **Typed queries**: Drizzle ORM cung cấp type safety
4. **Serverless**: Neon tối ưu cho serverless functions
5. **Migration script**: Sử dụng drizzle-kit để manage schema changes

## Các method đã được update

✅ `randomfood()` - Random food suggestion  
✅ `help()` - Show help menu
✅ `executeCommand()` - Command processing
✅ `update()` - Message processing
⏳ `randomfoodhistory()` - Cần update (trong file tiếp theo)
⏳ `debtcreate()` - Cần update
⏳ `tagall()` - Cần update

## Script tiếp theo sẽ complete các method còn lại.