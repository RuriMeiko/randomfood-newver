# Hướng dẫn Khấu trừ Nợ Qua Lại

## Tính năng

Bot tự động phát hiện và khấu trừ nợ qua lại giữa 2 người.

## Cách hoạt động

### Ví dụ 1: Khấu trừ cơ bản

```
Bước 1: Anh nợ Long 500k
→ Database: debt #1 (lender: Long, borrower: Anh, amount: 500k)

Bước 2: Long nợ anh 300k
→ AI phát hiện nợ qua lại
→ AI gọi view `mutual_debts` hoặc query trực tiếp
→ AI tính toán: 500k - 300k = 200k
→ AI xóa 2 nợ cũ (set settled = true)
→ AI tạo nợ mới: Anh nợ Long 200k
```

### Ví dụ 2: Khấu trừ hoàn toàn

```
Bước 1: Anh nợ Long 500k
Bước 2: Long nợ anh 500k
→ AI khấu trừ: 500k - 500k = 0
→ Không còn nợ nào
→ 2 nợ cũ được đánh dấu settled = true
```

## Database Support

### View: mutual_debts

```sql
SELECT * FROM mutual_debts;
```

Trả về:
- debt1_id, debt2_id: IDs của 2 nợ qua lại
- net_amount: Số tiền sau khấu trừ
- net_lender_id: Người cho vay sau khấu trừ
- net_borrower_id: Người nợ sau khấu trừ

### Function: consolidate_mutual_debts()

```sql
SELECT * FROM consolidate_mutual_debts(debt1_id, debt2_id);
```

Tự động:
1. Validate 2 nợ có phải nợ qua lại không
2. Tính toán số tiền sau khấu trừ
3. Set settled = true cho 2 nợ cũ
4. Tạo nợ mới (nếu net_amount > 0)
5. Trả về thông tin nợ mới

## AI Workflow

### Cách AI phát hiện và xử lý

1. **User ghi nợ mới**
   ```
   User: "Long nợ anh 300k"
   ```

2. **AI inspect schema** (nếu chưa biết)
   ```
   Tool: inspect_schema()
   → AI hiểu có bảng `debts`, view `mutual_debts`, function `consolidate_mutual_debts`
   ```

3. **AI check nợ qua lại**
   ```sql
   SELECT * FROM mutual_debts 
   WHERE (user1_id = <current_user> AND user2_id = <Long>) 
      OR (user1_id = <Long> AND user2_id = <current_user>);
   ```

4. **Nếu có nợ qua lại:**
   ```sql
   SELECT * FROM consolidate_mutual_debts(debt1_id, debt2_id);
   ```

5. **AI response**
   ```
   "ơ để e tính lại nợ nàaa"
   "anh nợ Long 500k, Long nợ anh 300k"
   "vậy anh chỉ nợ Long 200k thui nhaaa 🥰"
   ```

## Manual Consolidation

Bạn cũng có thể khấu trừ thủ công:

```sql
-- Tìm nợ qua lại
SELECT * FROM mutual_debts WHERE user1_id = 10 AND user2_id = 42;

-- Khấu trừ
SELECT * FROM consolidate_mutual_debts(123, 456);
```

## Testing

### Test Case 1: Khấu trừ một phần
```
1. "anh nợ Long 500k"
2. "Long nợ anh 300k"
→ Expected: "anh nợ Long 200k"
```

### Test Case 2: Khấu trừ hoàn toàn
```
1. "anh nợ Long 500k"
2. "Long nợ anh 500k"
→ Expected: "không còn nợ nhau nữa nhaaa"
```

### Test Case 3: Nhiều lần khấu trừ
```
1. "anh nợ Long 1000k"
2. "Long nợ anh 400k" → còn 600k
3. "Long nợ anh 200k" → còn 400k
4. "Long nợ anh 500k" → Long nợ anh 100k (đảo chiều)
```

## Notes

- Khấu trừ chỉ áp dụng cho cùng 1 group (hoặc cả 2 đều NULL)
- Khấu trừ theo cặp (2 nợ qua lại)
- Nếu net_amount = 0 → không tạo nợ mới
- Nợ cũ được giữ lại với flag `settled = true` để audit

## Monitoring

Check logs để thấy AI consolidate:
```
🔧 [ToolExecutor] Executing tool: execute_sql
Query: SELECT * FROM mutual_debts WHERE ...
✅ [ToolExecutor] Found mutual debt, consolidating...
🔧 [ToolExecutor] Executing tool: execute_sql
Query: SELECT * FROM consolidate_mutual_debts(123, 456)
✅ [ToolExecutor] Consolidated successfully
```
