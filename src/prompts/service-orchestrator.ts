/**
 * 🎼 SERVICE ORCHESTRATOR
 * Tích hợp tất cả service prompts vào master prompt
 */

import { buildMasterPrompt } from './master-prompt';
import { DEBT_SERVICE_PROMPT, DEBT_SERVICE_EXAMPLES } from './debt-service-prompt';
import { FOOD_SERVICE_PROMPT, FOOD_SERVICE_EXAMPLES } from './food-service-prompt';
import { MEMORY_SERVICE_PROMPT, MEMORY_SERVICE_EXAMPLES } from './memory-service-prompt';
import { CONTEXT_SERVICE_PROMPT, CONTEXT_SERVICE_EXAMPLES } from './context-service-prompt';
import { CONVERSATION_SERVICE_PROMPT, CONVERSATION_SERVICE_EXAMPLES } from './conversation-service-prompt';

export interface ServiceConfig {
  enableDebtTracking: boolean;
  enableFoodSuggestion: boolean;
  enableMemoryManagement: boolean;
  enableContextQueries: boolean;
  enableConversation: boolean;
}

export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  enableDebtTracking: true,
  enableFoodSuggestion: true,
  enableMemoryManagement: true,
  enableContextQueries: true,
  enableConversation: true
};

/**
 * Build complete system prompt với tất cả services được enable
 */
export function buildCompleteSystemPrompt(
  chatMembers: string[],
  userId: string,
  username?: string,
  serviceConfig: ServiceConfig = DEFAULT_SERVICE_CONFIG
): string {
  const enabledServices: string[] = [];
  const serviceExamples: string[] = [];

  // Debt tracking service (core service)
  if (serviceConfig.enableDebtTracking) {
    enabledServices.push(DEBT_SERVICE_PROMPT);
    serviceExamples.push(DEBT_SERVICE_EXAMPLES);
  }

  // Food suggestion service (core service)  
  if (serviceConfig.enableFoodSuggestion) {
    enabledServices.push(FOOD_SERVICE_PROMPT);
    serviceExamples.push(FOOD_SERVICE_EXAMPLES);
  }

  // Memory management service (auxiliary)
  if (serviceConfig.enableMemoryManagement) {
    enabledServices.push(MEMORY_SERVICE_PROMPT);
    serviceExamples.push(MEMORY_SERVICE_EXAMPLES);
  }

  // Context queries service (auxiliary)
  if (serviceConfig.enableContextQueries) {
    enabledServices.push(CONTEXT_SERVICE_PROMPT);
    serviceExamples.push(CONTEXT_SERVICE_EXAMPLES);
  }

  // Conversation service (auxiliary)
  if (serviceConfig.enableConversation) {
    enabledServices.push(CONVERSATION_SERVICE_PROMPT);
    serviceExamples.push(CONVERSATION_SERVICE_EXAMPLES);
  }

  // Build master prompt với services
  const masterPrompt = buildMasterPrompt(chatMembers, userId, username, enabledServices);

  // Add examples section
  const examplesSection = serviceExamples.length > 0 
    ? `\n📚 VÍ DỤ CỤ THỂ:\n${serviceExamples.join('\n\n')}` 
    : '';

  return `${masterPrompt}${examplesSection}

🎯 HƯỚNG DẪN PHÂN TÍCH:
1. Đọc user message
2. Xác định service phù hợp nhất (debt/food/conversation/context)
3. Áp dụng logic của service đó
4. Tự do sáng tạo SQL queries phù hợp (SELECT, JOIN, aggregation, etc.)
5. Trả về JSON đúng format
6. Đảm bảo SQL và data structure chính xác

💡 SQL CREATIVITY EXAMPLES:
- "ai nợ nhiều nhất?" → SELECT debtor_username, SUM(amount) FROM debts GROUP BY debtor_username ORDER BY SUM(amount) DESC
- "tổng nợ của group?" → SELECT SUM(amount) FROM debts WHERE chat_id = $1 AND is_paid = false
- "lịch sử nợ 3 tháng?" → SELECT * FROM debts WHERE created_at >= NOW() - INTERVAL '3 months'
- "user nào ăn đa dạng nhất?" → SELECT user_id, COUNT(DISTINCT suggestion) FROM food_suggestions GROUP BY user_id
- "món ăn phổ biến?" → SELECT suggestion, COUNT(*) FROM food_suggestions GROUP BY suggestion ORDER BY COUNT(*) DESC

⚡ PRIORITY ORDER:
1. DEBT_TRACKING - nếu mention tiền, nợ, trả
2. FOOD_SUGGESTION - nếu hỏi về đồ ăn  
3. MEMORY_MANAGEMENT - nếu user share info cá nhân (tên, sở thích, công việc)
4. CONTEXT_QUERY - nếu cần thông tin để trả lời tốt hơn
5. CONVERSATION - mọi trường hợp khác

LUÔN NHỚ: Thể hiện tính cách thân thiện, tự nhiên như đã định nghĩa trong master prompt!`;
}

/**
 * Get service-specific prompt cho debugging
 */
export function getServicePrompt(serviceName: string): string {
  switch (serviceName) {
    case 'debt': return DEBT_SERVICE_PROMPT;
    case 'food': return FOOD_SERVICE_PROMPT;
    case 'memory': return MEMORY_SERVICE_PROMPT;
    case 'context': return CONTEXT_SERVICE_PROMPT;
    case 'conversation': return CONVERSATION_SERVICE_PROMPT;
    default: return '';
  }
}

/**
 * Validate service configuration
 */
export function validateServiceConfig(config: ServiceConfig): boolean {
  // At least debt or food must be enabled (core services)
  return config.enableDebtTracking || config.enableFoodSuggestion;
}

/**
 * Create service config cho các use cases khác nhau
 */
export const SERVICE_PRESETS = {
  // Full bot với tất cả tính năng
  FULL_BOT: DEFAULT_SERVICE_CONFIG,
  
  // Chỉ core services
  CORE_ONLY: {
    enableDebtTracking: true,
    enableFoodSuggestion: true,
    enableMemoryManagement: false,
    enableContextQueries: false,
    enableConversation: true
  },
  
  // Testing mode - minimal services
  MINIMAL: {
    enableDebtTracking: true,
    enableFoodSuggestion: false,
    enableMemoryManagement: false,
    enableContextQueries: false,
    enableConversation: true
  }
};