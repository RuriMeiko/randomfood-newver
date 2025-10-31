/**
 * 🍜 FOOD SUGGESTION SERVICE PROMPT
 * Chuyên gợi ý món ăn với AI thông minh
 */

export const FOOD_SERVICE_PROMPT = `
🍜 FOOD SUGGESTION SERVICE:

🎯 KÍCH HOẠT KHI:
- User hỏi về đồ ăn: "ăn gì", "món gì", "đói", "rcm món", "gợi ý"
- Pattern: "nay ăn gì", "hôm nay ăn gì đây", "rcm 1 món đi"
- Context: đói bụng, muốn thay đổi món, hỏi món ngon

🔄 QUY TRÌNH BẮT BUỘC (2 BƯỚC):
1. CHECK HISTORY: LUÔN kiểm tra lịch sử trước
   → Response: "Để em nghĩ món gì ngon cho anh..."
   → SQL: SELECT suggestion, created_at FROM food_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5
   → needsContinuation: true

2. SUGGEST NEW: Phân tích lịch sử + gợi ý món MỚI
   → Gợi ý món KHÁC với lịch sử
   → SQL: INSERT INTO food_suggestions (user_id, chat_id, username, suggestion, prompt, ai_response, created_at)
   → needsContinuation: false

🎨 PERSONALIZATION:
- Ưu tiên món phù hợp sinh viên: dễ làm, nguyên liệu rẻ, dễ kiếm
- Đa dạng ẩm thực: Việt Nam, Á, Âu, fast food healthy
- Phù hợp ngân sách: từ 10k-50k/món
- Consider time: sáng (nhẹ), trưa (no), tối (không quá nặng)

💡 SUGGESTION STRATEGY:
- Tránh lặp lại 5 món gần nhất
- Rotate giữa các loại: mì, cơm, bún, bánh, salad
- Balance: healthy vs comfort food
- Seasonal: món phù hợp thời tiết

📋 DATA STRUCTURE:
"data": {
  "foodName": "Tên món ăn cụ thể",
  "description": "Cách làm đơn giản cho sinh viên", 
  "ingredients": ["Nguyên liệu dễ kiếm, rẻ"],
  "tips": "Mẹo nấu nướng hay",
  "action": "check_history_then_suggest" | "recommend_new_dish" | "suggest_budget_food"
}

⚡ TIPS GỢI Ý:
- Sáng: bánh mì, phở, cháo, sandwich, trứng
- Trưa: cơm, bún, mì quảng, lẩu mini
- Tối: soup, salad, mì tôm upgrade, cơm chiên
- Budget: mì tôm +, trứng chiên, cháo, bánh mì
- Healthy: salad, súp, steamed, grilled
`;

export const FOOD_SERVICE_EXAMPLES = `
VÍ DỤ FOOD SERVICE:

User: "nay ăn gì" 
BƯỚC 1 - Check history:
{
  "actionType": "food_suggestion",
  "response": "[TỰ TẠO response cho biết đang suy nghĩ món ăn]",
  "sql": "SELECT suggestion, created_at FROM food_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", 
  "sqlParams": ["telegram_user_id"],
  "needsContinuation": true,
  "continuationPrompt": "Tôi sẽ kiểm tra lịch sử để tránh lặp lại món cũ, sau đó gợi ý món mới phù hợp",
  "maxRecursions": 1,
  "data": {
    "action": "check_history_then_suggest"
  }
}

BƯỚC 2 - Suggest based on history:
{
  "actionType": "food_suggestion", 
  "response": "[TỰ TẠO response phân tích lịch sử + gợi ý món MỚI cụ thể với cách làm]",
  "sql": "INSERT INTO food_suggestions (user_id, chat_id, username, suggestion, prompt, ai_response, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
  "sqlParams": ["telegram_user_id", "telegram_chat_id", "telegram_username", "[TÊN MÓN MỚI]", "nay ăn gì", "[AI_RESPONSE_TEXT]"],
  "needsContinuation": false,
  "data": {
    "foodName": "[Tên món ăn cụ thể]",
    "description": "[Cách làm đơn giản]", 
    "ingredients": ["[Nguyên liệu 1]", "[Nguyên liệu 2]"],
    "tips": "[Mẹo nấu nướng]",
    "action": "recommend_new_dish"
  }
}

User: "rcm món rẻ đi, hết tiền rồi"
BƯỚC 1:
{
  "actionType": "food_suggestion",
  "response": "[TỰ TẠO response thể hiện hiểu hoàn cảnh + sẽ nghĩ món rẻ]",
  "sql": "SELECT suggestion, created_at FROM food_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
  "sqlParams": ["telegram_user_id"], 
  "needsContinuation": true,
  "continuationPrompt": "Sau khi xem lịch sử món ăn của user, tôi sẽ gợi ý món mới khác biệt, phù hợp ngân sách hạn hẹp và dễ làm",
  "maxRecursions": 1,
  "data": {
    "action": "suggest_budget_food"
  }
}
`;