# 📊 Global Logging System

## ✅ **Logging System Implemented**

### 🎯 **Features:**
- **Global Logger** - Singleton pattern với context switching
- **Log Levels** - DEBUG, INFO, WARN, ERROR
- **Structured Logging** - JSON format với metadata
- **Specialized Loggers** - API, Database, Commands, User actions
- **Error Tracking** - Stack traces và context data
- **Performance Monitoring** - Command execution timing

## 🔧 **Usage Examples:**

### **Basic Logging:**
```typescript
import { log } from '@/utils/logger';

log.info('User logged in', { userId: '123' });
log.error('Database connection failed', error);
log.debug('Processing request', { requestId: 'abc' });
log.warn('Rate limit approaching', { currentRequests: 95 });
```

### **Specialized Loggers:**
```typescript
// API calls
log.api.call('POST', '/sendMessage', { chatId: '123' });
log.api.response('POST', '/sendMessage', 200, { success: true });

// Database operations
log.db.query('findOne', 'users', { userId: '123' });
log.db.error('insertOne', 'users', error, { userData });

// Command execution
log.command.executed('/randomfood', '123', true, 1500);

// User actions
log.user.action('food_randomized', '123', { foodId: 42 });
```

## 📋 **Log Levels:**

### **DEBUG (0)** - Development details
- API request/response details
- Database query parameters
- Internal state changes
- Performance metrics

### **INFO (1)** - General information
- User actions
- Command executions
- System events
- Business logic flows

### **WARN (2)** - Potential issues
- Unknown paths accessed
- Rate limiting
- Deprecated features
- Performance warnings

### **ERROR (3)** - Actual problems
- API failures
- Database errors
- Command execution failures
- System crashes

## 🎨 **Log Format:**

```
2024-01-15T10:30:45.123Z INFO [RandomFoodBot] User executed command
Data: {
  "command": "/randomfood",
  "userId": "123456789",
  "chatId": "123456789",
  "duration": 1247
}
```

## 📊 **Logging Coverage:**

### ✅ **Worker Level:**
- Request/response logging
- Error handling
- Path validation
- Performance tracking

### ✅ **Bot Level:**
- Message processing
- Callback handling
- Command execution
- State management

### ✅ **Service Level:**
- Database operations
- Business logic
- Data validation
- Error recovery

### ✅ **API Level:**
- Telegram API calls
- Request/response tracking
- Rate limiting
- Error handling

## 🔧 **Configuration:**

### **Set Log Level:**
```typescript
import { logger, LogLevel } from '@/utils/logger';

// Production
logger.setLogLevel(LogLevel.INFO);

// Development
logger.setLogLevel(LogLevel.DEBUG);

// Error only
logger.setLogLevel(LogLevel.ERROR);
```

### **Set Context:**
```typescript
logger.setContext('MyComponent');
// Logs will show: [MyComponent] message
```

## 🚀 **Production Benefits:**

### **🔍 Debugging:**
- Trace user actions step by step
- Identify bottlenecks
- Find error patterns
- Monitor API usage

### **📈 Monitoring:**
- Command usage statistics
- Error rates
- Performance metrics
- User behavior analysis

### **🛡️ Security:**
- Track unusual access patterns
- Monitor failed requests
- Detect abuse attempts
- Audit user actions

## 📱 **Real-world Examples:**

### **User sends /randomfood:**
```
INFO [Worker] Worker started
INFO [RandomFoodBot] Bot initialized
INFO [RandomFoodBot] Received message
DEBUG [RandomFoodBot] Processing text message
INFO [RandomFoodBot] Executing command: /randomfood
DEBUG [FoodService] Random food selected
INFO [FoodService] Food history saved
DEBUG [TelegramClient] API Call: POST /sendPhoto
INFO [RandomFoodBot] Command /randomfood executed successfully (1247ms)
```

### **Database error:**
```
ERROR [FoodService] DB Error: insertOne on historyfood
Error: ConnectionError: Connection timeout
Stack: Error: Connection timeout
    at NeonDB.insertOne (neon.ts:125)
    at FoodService.saveRandomHistory (food.service.ts:95)
Data: {
  "userId": "123456789",
  "foodId": 42,
  "subFoodId": 15
}
```

**Logging system giờ đây comprehensive và production-ready! 📊✨**