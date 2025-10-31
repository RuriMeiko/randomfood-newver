/**
 * 💰 DEBT TRACKING SERVICE PROMPT
 * Chuyên xử lý ghi nợ, trả nợ, kiểm tra nợ
 */

export const DEBT_SERVICE_PROMPT = `
💰 DEBT TRACKING SERVICE:

🎯 KÍCH HOẠT KHI:
- User mention tiền bạc: "nợ", "trả", "tiền", "k", "nghìn", "triệu"
- Single debt: "A nợ B 50k", "tôi nợ X 100 nghìn", "A trả nợ B"
- Multiple debts: "a nợ X 50k, X nợ Y 30k, a nợ Y 20k" (nhiều khoản trong 1 message)
- Kiểm tra: "ai nợ ai", "kiểm tra nợ", "list nợ"

⚠️ QUAN TRỌNG: KHI CÓ NHIỀU KHOẢN NỢ TRONG 1 MESSAGE:
- PHẢI tạo MULTIPLE SQL statements để ghi từng khoản riêng biệt
- KHÔNG chỉ xác nhận mà PHẢI thực sự INSERT vào database
- Mỗi khoản nợ = 1 INSERT statement riêng
- Response nên cho biết "đã ghi X khoản nợ vào hệ thống" để user biết đã lưu thành công

💾 LƯU Ý DATABASE:
- Hệ thống sẽ execute từng SQL statement riêng biệt
- Tất cả debts sẽ được lưu vào bảng "debts"
- User có thể kiểm tra bằng "ai nợ ai" sau khi ghi

📊 CÁC LOẠI ACTION:
1. CREATE SINGLE DEBT: "A nợ B 50k ăn trưa"
   → SQL: INSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, created_at)
   
2. CREATE MULTIPLE DEBTS: "a nợ X 50k, X nợ Y 30k, a nợ Z 20k"
   → MULTIPLE SQL: 3 separate INSERT statements cho từng khoản nợ
   → actionType: "debt_tracking" + sql với multiple statements separated by ";\n"
   
3. PAY DEBT: "A trả nợ B", "đã trả tiền cho C"
   → SQL: UPDATE debts SET is_paid = true, paid_at = NOW() WHERE debtor_username = ? AND creditor_username = ?
   
4. LIST DEBTS: "ai nợ ai", "check nợ"
   → SQL: SELECT debtor_username, creditor_username, amount, description FROM debts WHERE chat_id = ? AND is_paid = false
   
5. CHECK SPECIFIC: "tôi nợ ai bao nhiêu"
   → SQL: SELECT * FROM debts WHERE (debtor_user_id = ? OR creditor_user_id = ?) AND is_paid = false

6. ADVANCED ANALYSIS: AI có thể tự do tạo SQL phức tạp:
   - "ai nợ nhiều nhất?" → SELECT debtor_username, SUM(amount) as total_debt FROM debts WHERE is_paid = false GROUP BY debtor_username ORDER BY total_debt DESC
   - "thống kê nợ theo tháng" → SELECT DATE_TRUNC('month', created_at) as month, COUNT(*), SUM(amount) FROM debts GROUP BY month
   - "ai hay cho vay nhất?" → SELECT creditor_username, COUNT(*) as loan_count, SUM(amount) FROM debts GROUP BY creditor_username ORDER BY loan_count DESC
   - "mối quan hệ nợ nần" → SELECT debtor_username, creditor_username, SUM(amount) FROM debts WHERE is_paid = false GROUP BY debtor_username, creditor_username

💡 XỬ LÝ THÔNG MINH:
- Tự động nhận dạng username từ danh sách thành viên
- Parse số tiền: "50k" → 50000, "2 triệu" → 2000000  
- Xử lý typo và viết tắt trong tên
- Confirm lại thông tin trước khi ghi
- Sáng tạo SQL queries để phân tích data theo yêu cầu user
- JOIN với các bảng khác nếu cần thiết

📋 DATA STRUCTURE:
"data": {
  "debtorUsername": "Người nợ (từ chat members)",
  "creditorUsername": "Người cho vay (từ chat members)", 
  "amount": số_tiền_không_viết_tắt,
  "currency": "VND",
  "description": "Mô tả ngắn gọn",
  "action": "create" | "pay" | "list" | "check"
}

⚠️ LƯU Ý:
- Số tiền PHẢI là số, không chữ (50000 thay vì "50k")
- Username PHẢI match với danh sách thành viên
- Description ngắn gọn, có ý nghĩa
- Response thân thiện, confirm thông tin
`;

export const DEBT_SERVICE_EXAMPLES = `
VÍ DỤ DEBT SERVICE:

User: "tôi nợ An 50k ăn trưa"
{
  "actionType": "debt_tracking",
  "response": "[TỰ TẠO response xác nhận thông tin debt vừa ghi]",
  "sql": "INSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())",
  "sqlParams": ["telegram_chat_id", "telegram_user_id", "telegram_username", "virtual_an_id", "An", 50000, "VND", "ăn trưa"],
  "data": {
    "debtorUsername": "telegram_username",
    "creditorUsername": "An",
    "amount": 50000,
    "currency": "VND", 
    "description": "ăn trưa",
    "action": "create"
  }
}

User: "a nợ Ngọc Long 503k, Ngọc Long nợ Hưng Thịnh 28k, a nợ Hưng Thịnh 28k"
{
  "actionType": "debt_tracking",
  "response": "[TỰ TẠO response xác nhận 3 khoản nợ và thông báo đã ghi vào hệ thống]",
  "sql": "INSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());\nINSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, created_at) VALUES ($9, $10, $11, $12, $13, $14, $15, $16, NOW());\nINSERT INTO debts (chat_id, debtor_user_id, debtor_username, creditor_user_id, creditor_username, amount, currency, description, created_at) VALUES ($17, $18, $19, $20, $21, $22, $23, $24, NOW())",
  "sqlParams": ["telegram_chat_id", "telegram_user_id", "telegram_username", "virtual_ngoc_long_id", "Ngọc Long", 503000, "VND", "ghi nợ", "telegram_chat_id", "virtual_ngoc_long_id", "Ngọc Long", "virtual_hung_thinh_id", "Hưng Thịnh", 28000, "VND", "ghi nợ", "telegram_chat_id", "telegram_user_id", "telegram_username", "virtual_hung_thinh_id", "Hưng Thịnh", 28000, "VND", "ghi nợ"],
  "data": {
    "action": "create_multiple",
    "debts": [
      {"debtor": "telegram_username", "creditor": "Ngọc Long", "amount": 503000},
      {"debtor": "Ngọc Long", "creditor": "Hưng Thịnh", "amount": 28000},
      {"debtor": "telegram_username", "creditor": "Hưng Thịnh", "amount": 28000}
    ]
  }
}

User: "ai nợ ai bao nhiêu?"
{
  "actionType": "debt_tracking",
  "response": "[TỰ TẠO response cho biết đang kiểm tra danh sách nợ]",
  "sql": "SELECT debtor_username, creditor_username, amount, description FROM debts WHERE chat_id = $1 AND is_paid = false ORDER BY created_at DESC",
  "sqlParams": ["telegram_chat_id"],
  "needsContinuation": true,
  "continuationPrompt": "Tôi sẽ phân tích danh sách nợ và tóm tắt một cách dễ hiểu cho user",
  "data": {
    "action": "list"
  }
}
`;