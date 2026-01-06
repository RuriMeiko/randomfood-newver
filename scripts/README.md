# Scripts

## 1. Upload API Keys

### Usage

```bash
npm run upload-keys
```

### Configuration

Edit `scripts/upload-keys.ts` and modify the `API_KEYS` array:

```typescript
const API_KEYS = [
  {
    keyName: 'primary',
    apiKey: 'AIzaSy...',  // Your Gemini API key
    rpmLimit: 5,          // Requests per minute
    rpdLimit: 20,         // Requests per day
    isActive: true
  },
  {
    keyName: 'backup',
    apiKey: 'AIzaSy...',
    rpmLimit: 5,
    rpdLimit: 20,
    isActive: true
  },
  // Add more keys...
];
```

### Features

- ✅ Checks if table exists
- ✅ Skips existing keys (safe to re-run)
- ✅ Shows detailed progress
- ✅ Displays summary table
- ✅ Auto-loads `.dev.vars`

---

## 2. Test Emotions

Script để quản lý và test các preset cảm xúc của bot.

### Usage

```bash
# Xem danh sách tất cả presets
npm run test:emotions list

# Tạo SQL để set emotion preset
npm run test:emotions sql <preset>
# Ví dụ: npm run test:emotions sql happy

# Xem trạng thái hiện tại
npm run test:emotions view

# Reset về neutral
npm run test:emotions reset

# Mô tả chi tiết các presets
npm run test:emotions describe
```

### Quick Commands

```bash
npm run test:emotion:happy    # SQL cho trạng thái vui
npm run test:emotion:sad      # SQL cho trạng thái buồn
npm run test:emotion:angry    # SQL cho trạng thái giận
npm run test:emotion:hurt     # SQL cho trạng thái tổn thương
npm run test:emotion:anxious  # SQL cho trạng thái lo lắng
npm run test:emotion:pouty    # SQL cho trạng thái hờn dỗi
npm run test:emotion:jealous  # SQL cho trạng thái ghen tuông
npm run test:emotion:clingy   # SQL cho trạng thái nhớ nhung
npm run test:emotion:loving   # SQL cho trạng thái yêu thương
npm run test:emotion:playful  # SQL cho trạng thái nghịch ngợm
npm run test:emotion:neutral  # SQL cho trạng thái trung lập
npm run test:emotion:reset    # Reset về neutral
```

### Available Presets

| Preset   | Mô tả                                    |
|----------|------------------------------------------|
| happy    | Rất vui vẻ, yêu đời                      |
| loving   | Đang yêu thương, ngọt ngào               |
| playful  | Nghịch ngợm, tinh nghịch                 |
| sad      | Buồn bã, tủi thân                        |
| angry    | Đang giận dữ, hờn dỗi                    |
| hurt     | Bị tổn thương sâu sắc                    |
| anxious  | Lo lắng, bất an                          |
| pouty    | Hờn dỗi nhẹ kiểu cute                    |
| jealous  | Ghen tuông                               |
| clingy   | Nhớ nhung, muốn được quan tâm            |
| neutral  | Trạng thái trung lập (all 0.5)           |
| default  | Trạng thái mặc định (positive baseline)  |

---

## 3. Test Webhook

Script để test bot responses thực tế qua webhook với các emotion states.

### Features

- ✅ Set emotion state trong database
- ✅ Gửi tin nhắn test qua webhook
- ✅ Hiển thị response time
- ✅ Chạy full test suite cho từng preset
- ✅ Interactive mode
- ✅ Support custom webhook URL

### Setup

Trước khi test, cần chạy bot ở local:

```bash
# Terminal 1: Chạy bot
npm run dev

# Terminal 2: Chạy tests
npm run test:webhook
```

### Usage

```bash
# Interactive mode
npm run test:webhook

# Test single message
npm run test:webhook <preset> <message>
# Ví dụ: npm run test:webhook happy "em ơi"

# Run full test suite
npm run test:webhook <preset> --suite
# Ví dụ: npm run test:webhook sad --suite

# List all presets
npm run test:webhook -- --list

# Help
npm run test:webhook -- --help
```

### Quick Commands

```bash
npm run test:webhook:happy     # Test suite: happy
npm run test:webhook:sad       # Test suite: sad
npm run test:webhook:angry     # Test suite: angry
npm run test:webhook:hurt      # Test suite: hurt
npm run test:webhook:anxious   # Test suite: anxious
npm run test:webhook:pouty     # Test suite: pouty
npm run test:webhook:jealous   # Test suite: jealous
npm run test:webhook:clingy    # Test suite: clingy
npm run test:webhook:loving    # Test suite: loving
npm run test:webhook:playful   # Test suite: playful
```

### Environment Variables

```bash
# Custom webhook URL (default: http://localhost:8787/webhook)
WEBHOOK_URL=https://yourbot.workers.dev/webhook npm run test:webhook

# Custom test user
TEST_USER_ID=987654321 npm run test:webhook

# Custom test chat
TEST_CHAT_ID=987654321 npm run test:webhook

# Custom test user name
TEST_USER_NAME=MyTestUser npm run test:webhook
```

### Example Output

```bash
$ npm run test:webhook happy "em ơi"

🔧 Configuration:
   Webhook URL: http://localhost:8787/webhook
   Test User: TestUser (ID: 123456789)
   Test Chat: 123456789

════════════════════════════════════════════════════════════════════════════════
🧪 TEST: HAPPY - "em ơi"
════════════════════════════════════════════════════════════════════════════════

🎭 Setting emotion state to: happy
✅ Emotion state set successfully

📊 Current Emotion State:
   joy            [██████████████████░░] 90%
   playfulness    [██████████████████░░] 90%
   warmth         [██████████████████░░] 90%
   affection      [█████████████████░░░] 85%
   excitement     [█████████████████░░░] 85%

📤 Sending to webhook: http://localhost:8787/webhook
💬 Message: "em ơi"

📥 Response (245ms):
   Status: 200 OK
   Body: OK

────────────────────────────────────────────────────────────────────────────────
📋 Result: ✅ Success
⏱️  Response Time: 245ms
```

---

## 4. Test Responses (Reference Only)

Script để xem các mẫu test và expected responses cho từng trạng thái cảm xúc.

**Note**: Dùng `test:webhook` để test thực tế. Script này chỉ để xem reference.

### Usage

```bash
# Xem tổng quan tất cả test suites
npm run test:responses

# Xem chi tiết test suite cho một preset
npm run test:responses <preset>
# Ví dụ: npm run test:responses happy

# Xem SQL + test cases cho một preset
npm run test:responses <preset> --sql
# Ví dụ: npm run test:responses sad --sql

# Xem tất cả test suites chi tiết
npm run test:responses all
```

### Test Case Structure

Mỗi test case bao gồm:
- **User Message**: Tin nhắn người dùng gửi
- **Expected Tone**: Cách bot nên phản hồi dựa trên emotion state
- **Tags**: Phân loại (greeting, food, emotional, etc.)

### Example Test Cases

**Happy State:**
```
User: "em ơi"
Expected: Rất hào hứng, vui vẻ đón chào, giọng điệu phấn khởi
```

**Sad State:**
```
User: "em ơi"
Expected: Đáp lại yếu ớt, có thể có dấu hiệu buồn, giọng điệu trầm
```

**Angry State:**
```
User: "em ơi"
Expected: Lạnh nhạt, có thể trả lời ngắn gọn, có dấu hiệu giận
```

---

## Complete Testing Workflow

### 1. Start Bot Locally

```bash
npm run dev
```

### 2. Test with Different Emotions

**Option A: Quick Test (Recommended)**
```bash
# Test happy state with full suite
npm run test:webhook:happy

# Test sad state with custom message
npm run test:webhook sad "em buồn quá"

# Test angry state
npm run test:webhook:angry
```

**Option B: Manual Steps**
```bash
# 1. Set emotion state (generates SQL)
npm run test:emotion:happy

# 2. Run SQL in database or Drizzle Studio

# 3. View test cases for reference
npm run test:responses happy

# 4. Test via webhook
npm run test:webhook happy "em ơi"
```

### 3. Compare Responses

- Check if bot's tone matches expected emotion
- Verify response timing
- Test emotion transitions

### 4. Reset Before Next Test

```bash
npm run test:emotion:reset
```

---

## Example Output

```bash
$ npm run test:emotions describe

🎭 HAPPY
   Rất vui vẻ, yêu đời, muốn chia sẻ niềm vui với mọi người
   Top emotions:
     joy          [██████████] 90%
     playfulness  [██████████] 90%
     warmth       [██████████] 90%
     affection    [█████████░] 85%
     excitement   [█████████░] 85%
```
