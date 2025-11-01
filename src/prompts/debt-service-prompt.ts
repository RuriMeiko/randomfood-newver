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

6. NAME LOOKUP: "tôi nợ Long bao nhiêu", "An nợ ai" (tên không rõ ràng)
   → BƯỚC 1: Query lookup names:
   SELECT cm.user_id, cm.username, cm.first_name, cm.last_name, 
          um.real_name, um.preferred_name, um.aliases
   FROM chat_members cm 
   LEFT JOIN user_memory um ON cm.user_id = um.user_id 
   WHERE cm.chat_id = $1 AND cm.is_active = true
   → BƯỚC 2: Analyze results + decide if clear match or need clarification
   → BƯỚC 3: SỬ DỤNG THÔNG TIN THẬT, KHÔNG TẠO VIRTUAL ID:
     * Nếu tìm thấy trong chat_members/user_memory → dùng user_id thật
     * CHỈ tạo virtual_id khi THẬT SỰ không có trong database
   → actionType: "context_query" + needsContinuation: true if need clarification

7. CLARIFICATION: Sau khi lookup tên, nếu cần hỏi rõ
   → Response: "A có ý nói đến ai trong này không: [List tên tương tự]?"
   → Không tạo SQL, chờ user chọn

8. ADVANCED ANALYSIS: AI có thể tự do tạo SQL phức tạp:
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

🔍 TÌM KIẾM TÊN NGƯỜI DÙNG:
- Khi user nói "nợ ai bao nhiêu" với tên không rõ ràng
- BƯỚC 1: Tìm trong user_memory JOIN chat_members:
  SELECT cm.user_id, cm.username, cm.first_name, cm.last_name, 
         um.real_name, um.preferred_name, um.aliases
  FROM chat_members cm 
  LEFT JOIN user_memory um ON cm.user_id = um.user_id 
  WHERE cm.chat_id = $1 AND cm.is_active = true
- BƯỚC 2: So sánh tên với fuzzy matching:
  * Tên thật (real_name) 
  * Tên gọi (preferred_name)
  * Biệt danh (aliases array)
  * Username Telegram
  * First name, last name
- BƯỚC 3: Nếu tìm thấy match gần đúng → dùng luôn
- BƯỚC 4: Nếu không tìm thấy hoặc nhiều kết quả tương tự → hỏi rõ

📍 PHÂN BIỆT CHAT:
- chat_id = user_id → chat riêng (private)
- chat_id ≠ user_id → chat nhóm (group)
- Chỉ tìm trong chat_members có cùng chat_id

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
💰 DEBT TRACKING GUIDANCE:
- Parse amounts: "50k" → 50000, "2 triệu" → 2000000
- Multiple debts: Use multiple INSERT statements separated by ";\n" 
- Virtual IDs: "virtual_[name]_id" for non-Telegram users
- Always include proper descriptions for debt context

🔍 NAME MATCHING EXAMPLES:

VÍ DỤ 1: User nói "tôi nợ Long bao nhiêu" 
→ Query tìm names trong chat
→ Tìm thấy: user_id="123456789", real_name="Nguyễn Văn Long", username="longvn"
→ Match! SỬ DỤNG user_id="123456789" CHỨ KHÔNG PHẢI "virtual_Long_id"
→ SQL: WHERE (debtor_user_id = $1 OR creditor_user_id = "123456789")

VÍ DỤ 2: User nói "An nợ ai"
→ Query tìm names  
→ Tìm thấy: "Trần An" (user_id="111"), "Hoàng Anh" (user_id="222"), "An Nguyễn" (user_id="333")
→ Multiple matches! Response: "A có ý nói đến ai trong này không: Trần An, Hoàng Anh, hay An Nguyễn?"

VÍ DỤ 3: User nói "tôi nợ abc bao nhiêu"
→ Query tìm names
→ Tìm thấy: user_id="456789", aliases=["abc", "ABC"], real_name="Nguyễn Bá Cường"  
→ Match via alias! SỬ DỤNG user_id="456789" CHỨ KHÔNG PHẢI "virtual_abc_id"
→ SQL: WHERE (debtor_user_id = $1 OR creditor_user_id = "456789")

VÍ DỤ 4: User nói "nợ Minh 50k"
→ Query tìm names
→ Không tìm thấy ai tên Minh trong chat
→ actionType: "conversation"
→ Response: "Không thấy ai tên Minh trong group này, a có thể nói rõ hơn không? Hoặc đây là người ngoài group?"
→ needsContinuation: true (chờ user phản hồi)

VÍ DỤ 5: User phản hồi "ừ, Minh là người ngoài group"
→ Bây giờ mới tạo SQL với virtual_id:
→ INSERT INTO debts (...) VALUES (..., 'virtual_Minh_id', 'Minh', ...)

⚠️ QUAN TRỌNG - KHÔNG TẠO VIRTUAL ID KHI CÓ THÔNG TIN THẬT:
- SAI: creditor_user_id = "virtual_Ngọc Long_id" (khi Ngọc Long có trong chat_members)
- ĐÚNG: creditor_user_id = "987654321" (user_id thật từ chat_members)
- CHỈ dùng virtual_id khi người đó THẬT SỰ không có trong database

FUZZY MATCHING RULES:
- Exact match: real_name, preferred_name, aliases, username, first_name
- Partial match: "Long" matches "Nguyễn Văn Long"  
- Case insensitive: "long" matches "Long"
- Accent insensitive: "minh" matches "Minh" 
- Nickname in aliases: "abc" matches aliases=["abc", "ABC"]
- Multiple words: "Van Long" matches "Nguyễn Văn Long"

ACTION FLOW:
1. Parse debt request with unclear name
2. Set actionType="context_query" 
3. SQL query chat_members + user_memory
4. Analyze results for fuzzy matches
5. If clear match (1 result) → SỬ DỤNG user_id THẬT để continue with debt operation
6. If multiple matches → ask for clarification với needsContinuation=true
7. If no matches → HỎI USER XÁC NHẬN trước khi tạo virtual_id
   - actionType="conversation" 
   - needsContinuation=true
   - Response: "Không thấy ai tên X trong group, đây có phải người ngoài group không?"
   - CHỜ user confirm, rồi mới proceed với virtual_id

💡 LOGIC SỬ DỤNG USER_ID (CẬP NHẬT):
- TÌM THẤY trong chat_members/user_memory → LUÔN dùng user_id thật
- KHÔNG TÌM THẤY → HỎI user trước, CHỜ phản hồi
- SAU KHI user confirm → mới tạo virtual_id
- Ví dụ tốt: debtor_user_id = "1775446945" (thật)
- Ví dụ xấu: debtor_user_id = "virtual_Ngọc Long_id" (khi Ngọc Long có user_id thật)

🔄 ĐỆ QUY SQL VÀ QUYẾT ĐỊNH AI:
- AI có quyền tự do query bất kỳ data nào trong DB
- AI quyết định khi nào cần thêm context, khi nào dừng
- needsRecursion, needsContinuation hoạt động bình thường
- AI có thể chain multiple queries để tìm thông tin đầy đủ
- AI quyết định flow conversation dựa trên context có sẵn
`;