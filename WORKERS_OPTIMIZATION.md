# Tối ưu cho Cloudflare Workers

## 📊 Vấn đề với cache trên Workers:
- ❌ In-memory cache **không shared** giữa worker instances
- ❌ Workers có thể bị **restart** bất cứ lúc nào
- ⚠️ Cache chỉ có ích trong **warm instances** (requests liên tiếp)

## ✅ Giải pháp đã implement:

### 1. **Giảm cache time**: 5 phút → **60 giây**
   - Giảm risk khi worker restart
   - Vẫn có lợi cho warm instances

### 2. **Offload computation sang PostgreSQL**
   - File: `migrations/optimize-for-workers.sql`
   
   **Đã tạo:**
   - ✅ `mv_schema_info` - Materialized view cho schema (faster than information_schema)
   - ✅ `get_user_context()` - 1 DB call thay vì 2 (getUserId + getGroupId)
   - ✅ `get_recent_messages_optimized()` - Query tối ưu với JOIN
   - ✅ `get_cross_chat_context()` - 1 complex query thay vì multiple queries
   - ✅ Indexes cho faster queries

### 3. **Kết quả dự kiến:**
   - Schema query: ~20ms → **~5ms** (materialized view)
   - User context: 2 queries → **1 query**
   - Recent messages: N+1 queries → **1 query with JOIN**
   - Cross-chat: 5+ queries → **1 complex query**
   
   **Tổng cải thiện: ~35-45ms → ~20-30ms** (giảm thêm ~40%)

## 🚀 Cách deploy:

```bash
# 1. Chạy migration
psql $NEON_DATABASE_URL -f migrations/optimize-for-workers.sql

# 2. Deploy code (đã tự động fallback nếu chưa có functions)
npm run deploy
```

## 📝 Optional: Sử dụng DB functions (thay vì ORM)

Nếu muốn tối ưu tối đa, có thể thay thế code trong `DatabaseService` để gọi trực tiếp SQL functions:

```typescript
// Thay vì:
const userId = await this.getUserId(tgId);
const groupId = await this.getGroupId(chatId);

// Dùng:
const context = await this.sql.query(
  'SELECT get_user_context($1, $2)', 
  [tgId, chatId]
);
// → 1 query thay vì 2
```

Hiện tại code đã:
- ✅ Giữ parallel queries (vẫn fast)
- ✅ Auto-fallback nếu chưa có DB functions
- ✅ Cache 60s cho warm instances
- ✅ Sẵn sàng migrate sang DB functions khi cần
