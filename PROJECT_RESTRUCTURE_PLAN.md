# 🏗️ Project Restructure Plan

## 🚨 **Các vấn đề hiện tại:**

### 📂 **Cấu trúc hiện tại:**
```
src/
├── telegram/
│   ├── core.ts          // 368 lines - quá dài, chứa cả bot logic và API calls
│   ├── self.ts          // 484 lines - tất cả commands trong 1 file
│   ├── command.ts       // chỉ là wrapper
│   ├── callback.ts      // callback handlers
│   ├── texthanle.ts     // text processing
│   ├── data.ts          // constants
│   └── utils.ts         // utilities
├── db/
└── utils.ts
```

### 🔥 **Vấn đề:**
1. **Single Responsibility Violation**: `self.ts` có 484 lines với tất cả commands
2. **Mixed Concerns**: `core.ts` vừa là base class vừa handle API calls
3. **Tight Coupling**: Commands trực tiếp reference database
4. **Poor Separation**: Business logic trộn với Telegram API
5. **Hard to Test**: Không có interface abstraction
6. **Difficult to Scale**: Thêm command mới = sửa 1 file khổng lồ

## 🎯 **Cấu trúc mới đề xuất:**

```
src/
├── bot/                     # Bot core layer
│   ├── index.ts            # Main bot instance
│   ├── types.ts            # Bot interfaces & types
│   └── middleware/         # Bot middleware
│       ├── auth.ts
│       ├── validation.ts
│       └── logging.ts
├── commands/               # Command handlers (1 file per command group)
│   ├── index.ts           # Command registry
│   ├── basic.ts          # start, help, about
│   ├── food.ts           # randomfood, history
│   ├── debt.ts           # debt management
│   ├── social.ts         # tagall, anniversary
│   └── types.ts          # Command interfaces
├── services/              # Business logic layer
│   ├── food.service.ts   # Food recommendation logic
│   ├── debt.service.ts   # Debt management logic
│   ├── user.service.ts   # User management
│   └── history.service.ts # History tracking
├── repositories/          # Data access layer
│   ├── base.repository.ts
│   ├── food.repository.ts
│   ├── debt.repository.ts
│   └── user.repository.ts
├── telegram/              # Telegram API abstraction
│   ├── client.ts         # Telegram API client
│   ├── types.ts          # Telegram types
│   └── handlers/         # Message handlers
│       ├── message.ts
│       ├── callback.ts
│       └── text.ts
├── db/                    # Database layer
│   ├── schema.ts
│   ├── connection.ts
│   └── migrations/
├── utils/                 # Shared utilities
│   ├── format.ts
│   ├── date.ts
│   └── validation.ts
└── config/               # Configuration
    ├── env.ts
    └── constants.ts
```

## 💡 **Lợi ích:**

### 🔄 **Separation of Concerns**
- **Commands**: Chỉ handle input/output
- **Services**: Business logic thuần túy
- **Repositories**: Data access
- **Telegram**: API communication

### 🧪 **Testability**
- Mỗi layer có thể test độc lập
- Mock dependencies dễ dàng
- Unit tests cho từng service

### 📈 **Scalability**
- Thêm command mới = tạo file mới
- Thêm feature = tạo service mới
- Không ảnh hưởng code cũ

### 🛠️ **Maintainability**
- Code ngắn, tập trung
- Dễ tìm và sửa bug
- Clear ownership

## 🚀 **Migration Plan:**

### **Phase 1**: Command Separation
1. Tách commands từ `self.ts` thành nhiều files
2. Tạo command registry pattern
3. Implement command interfaces

### **Phase 2**: Service Layer
1. Extract business logic thành services
2. Create repository pattern
3. Implement dependency injection

### **Phase 3**: API Abstraction
1. Tách Telegram API calls
2. Create clean interfaces
3. Add error handling

### **Phase 4**: Testing & Documentation
1. Add unit tests
2. Integration tests
3. API documentation