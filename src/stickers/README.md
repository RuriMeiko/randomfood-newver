# 🎭 AI Bot Sticker System

## 📋 Tổng quan

Hệ thống sticker cho phép AI bot gửi stickers phù hợp với ngữ cảnh cuộc trò chuyện để làm cho bot trở nên sinh động và thú vị hơn.

## 🎯 Cách hoạt động

### 1. **Sticker Map Structure**
File `sticker-map.json` được tổ chức thành 3 categories:

#### **Emotions** (Cảm xúc)
```json
"emotions": {
  "happy": { "sticker_id": "description" },
  "sad": { "sticker_id": "description" },
  "confused": { "sticker_id": "description" },
  "angry": { "sticker_id": "description" },
  "love": { "sticker_id": "description" },
  "sleepy": { "sticker_id": "description" }
}
```

#### **Situations** (Tình huống)
```json
"situations": {
  "debt_created": { "sticker_id": "description" },
  "debt_paid": { "sticker_id": "description" },
  "debt_check": { "sticker_id": "description" },
  "food_suggestion": { "sticker_id": "description" },
  "no_debt": { "sticker_id": "description" },
  "greeting": { "sticker_id": "description" },
  "error": { "sticker_id": "description" },
  "confirmation": { "sticker_id": "description" }
}
```

#### **Random** (Ngẫu nhiên)
```json
"random": {
  "sticker_id_1": "description",
  "sticker_id_2": "description",
  "sticker_id_3": "description"
}
```

### 2. **Sticker Selection Logic**

AI sẽ chọn sticker theo thứ tự ưu tiên:
1. **Situation-specific** - Dựa vào intent/action type
2. **Emotion-based** - Dựa vào emotion detected từ text
3. **Random fallback** - Sticker ngẫu nhiên nếu không match

### 3. **Trigger Conditions**

Sticker sẽ được gửi khi:
- **Message cuối cùng** trong chuỗi messages (70% chance)
- **Message quan trọng** như summary, confirmation
- **Keywords trigger**: "tổng cộng", "đúng hông", "ghi lại", etc.

## 🚀 Sử dụng

### Method mới:
```typescript
await bot.processMessageWithMessagesAndStickers(message, telegramToken);
```

### So với method cũ:
```typescript
// Cũ - chỉ text
await bot.processMessageWithMessages(message);

// Mới - text + stickers
await bot.processMessageWithMessagesAndStickers(message, telegramToken);
```

## 🛠️ Cách thay đổi stickers

### 1. **Thêm sticker mới:**
```json
{
  "emotions": {
    "excited": {
      "CAACAgXXXXXXXXXXXX": "mèo hào hứng",
      "CAACAgYYYYYYYYYYYY": "mèo phấn khích"
    }
  }
}
```

### 2. **Thay thế sticker:**
- Copy sticker ID từ Telegram
- Replace trong `sticker-map.json`
- Update description

### 3. **Lấy Sticker ID:**
1. Forward sticker đến bot
2. Check bot logs để lấy file_id
3. Hoặc dùng @raw_data_bot

## 📊 Examples

### Debt Check Response:
```
User: "check nợ giùm a cái mây"
Bot: 
1. "dạaaa, để e kiểm tra sổ nợ cho anh nèee 📝" (delay: 850ms)
2. "ơ anh nợ HT90 764,000 VND nè" (delay: 1200ms)
3. "tổng cộng anh nợ 1,058,334 VND đóoo 💸" (delay: 1800ms)
4. [STICKER: mèo nghi ngờ nhân sinh] (situation: debt_check)
```

### Debt Creation:
```
User: "tao nợ anh Long 500k"
Bot:
1. "ơ để e ghi lại nèee" (delay: 800ms)
2. "anh nợ Long 500k đúng hông" (delay: 1200ms) 
3. [STICKER: mèo ghi chép] (situation: debt_created)
```

### No Debt:
```
User: "check nợ"
Bot:
1. "dạaaa, để e kiểm tra nèee"
2. "ơ anh không nợ ai cả nè, sạch sẽ luônn 🎉"
3. [STICKER: mèo nhảy múa] (situation: no_debt, emotion: happy)
```

## ⚙️ Configuration

### Sticker Probability:
```typescript
if (stickerId && Math.random() < 0.7) { // 70% chance
  await this.sendSticker(chatId, stickerId);
}
```

### Emotion Detection Keywords:
```typescript
private detectEmotion(messageText: string): string {
  if (messageText.includes('🎉') || messageText.includes('sạch sẽ')) return 'happy';
  if (messageText.includes('💸') || messageText.includes('nợ')) return 'confused';
  if (messageText.includes('lỗi')) return 'sad';
  // ...
}
```

## 🔧 Troubleshooting

### Sticker không gửi:
1. Check sticker ID có đúng format không
2. Check bot có quyền gửi sticker không  
3. Check console logs để debug

### Lỗi permission:
```
Error: Bot can't send stickers to this chat
```
→ Bot cần permission "can_send_other_messages"

## 🎨 Best Practices

1. **Đừng spam stickers** - 70% probability là đủ
2. **Chọn stickers phù hợp context** - debt → serious, happy → fun
3. **Test stickers trước** khi deploy
4. **Backup sticker IDs** - Telegram có thể change sticker sets

## 📝 Logs

Bot sẽ log các action:
```
🎭 Sending sticker for situation: sql
🎭 Sticker sent successfully: CAACAgUAAxkBAAEDawNpDvPu...
```