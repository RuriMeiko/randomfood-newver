/**
 * Context Builder Service - Autonomous Agent Version
 * 
 * Philosophy:
 * - No hardcoded database schema
 * - Only provides observable facts: current user, time, recent messages
 * - Database structure is discovered via tools, not provided in context
 */

import type { TelegramMessage } from '../types/telegram';
import type { DatabaseService } from './database';
import { EmotionService } from './emotion';

export class ContextBuilderService {
  private emotionService: EmotionService;

  constructor(
    private dbService: DatabaseService,
    emotionService?: EmotionService
  ) {
    this.emotionService = emotionService || new EmotionService(dbService);
  }

  /**
   * Build minimal context without schema assumptions
   * Optimized to match system prompt structure
   */
  async buildContext(message: TelegramMessage): Promise<string> {
    const userId = await this.dbService.getUserId(message.from?.id || 0);
    const groupId = message.chat.type === 'private' 
      ? null 
      : await this.dbService.getGroupId(message.chat.id);

    // Get recent messages
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    
    // Get group members if in group
    let groupMembersInfo = '';
    if (message.chat.type !== 'private') {
      const members = await this.dbService.getGroupMembers(message.chat.id);
      if (members.length > 0) {
        groupMembersInfo = `\n\n=== GROUP MEMBERS (Who are in this chat) ===\n${members.map(m => 
          `- ${m.displayName || m.tgUsername || `User ${m.tgId}`} (@${m.tgUsername || 'no_username'})`
        ).join('\n')}\n\nUse these names when user mentions someone (e.g., "Long", "Hùng"). Check DB to find user ID.`;
      }
    }
    
    // Get replied message if this is a reply
    let repliedMessageInfo = '';
    if (message.reply_to_message) {
      const repliedMsg = await this.dbService.getMessageByTelegramId(
        message.chat.id,
        message.reply_to_message.message_id
      );
      
      if (repliedMsg) {
        repliedMessageInfo = `\n\n=== 🔁 USER IS REPLYING TO ===\nFrom: ${repliedMsg.senderName}\nMessage: "${repliedMsg.messageText}"\n\n👉 User's current message is a REPLY to the above. Consider this context.`;
      } else if (message.reply_to_message.text) {
        repliedMessageInfo = `\n\n=== 🔁 USER IS REPLYING TO ===\nMessage: "${message.reply_to_message.text}"\n\n👉 User is replying to this message.`;
      }
    }
    
    // Get current time in Vietnam timezone
    const currentTime = new Date();
    const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(currentTime);
    
    // Get emotional context
    const emotionalContext = await this.emotionService.getEmotionalContext();
    
    // Pre-load database schema
    const schemaInfo = await this.dbService.listTables();
    
    // Build optimized context matching system prompt structure
    const context = `
=== ⏰ CURRENT TIME ===
${vietnamTime} (Vietnam Time Zone)

=== 💭 YOUR CURRENT EMOTIONAL STATE ===
${emotionalContext}

=== 👤 CURRENT USER ===
Name: ${message.from?.first_name || 'Unknown'} ${message.from?.last_name || ''}
Telegram ID: ${message.from?.id || 0}
Database User ID: ${userId}
Username: @${message.from?.username || 'none'}

=== 💬 CURRENT CHAT ===
Type: ${message.chat.type}
${message.chat.type !== 'private' ? `Group Name: ${message.chat.title}` : ''}
Chat ID: ${message.chat.id}
${groupId ? `Database Group ID: ${groupId}` : ''}${groupMembersInfo}${repliedMessageInfo}

=== 🗄️ DATABASE TABLES (Available) ===
${schemaInfo}

💡 Use tools: describe_table(name) for columns, execute_sql() for queries.

=== 📚 CONVERSATION SUMMARY ===
Total messages loaded: ${recentMessages.length}
Recent 5 messages preview:
${recentMessages.slice(-5).map(msg => {
  const msgTime = msg.createdAt ? new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(msg.createdAt)) : '??:??';
  
  return `[${msgTime}] ${msg.isAI ? 'Mây' : msg.senderName}: ${msg.messageText.substring(0, 80)}${msg.messageText.length > 80 ? '...' : ''}`;
}).join('\n')}

⚠️ Full conversation history is in message format (role: user/model) sent separately.

=== 🎯 YOUR MISSION ===
1. Feel the user's message impact on your emotions → use analyze_interaction if needed
2. Need data? → use inspect/execute_sql tools
3. Respond naturally with your current emotional state
4. Output MULTIPLE messages if natural (like real texting!)
   - Example: ["oke anh", "để em check nha", "đợi tý đi"]
   - Don't force everything into one long message
5. NO periods (.) at end of messages
`;
    
    return context;
  }

  /**
   * Build conversation history as message format for AI
   */
  async buildConversationHistory(message: TelegramMessage): Promise<any[]> {
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    
    // Convert to Gemini message format with proper roles
    const history: any[] = [];
    
    for (const msg of recentMessages.slice(-20)) { // Last 20 messages for context
      const role = msg.isAI ? 'model' : 'user';
      const senderName = msg.isAI ? '' : `${msg.senderName}: `;
      
      history.push({
        role,
        parts: [{ text: `${senderName}${msg.messageText}` }]
      });
    }
    
    return history;
  }

  /**
   * Build minimal context for private chat
   */
  async buildPrivateContext(message: TelegramMessage): Promise<string> {
    return this.buildContext(message);
  }

  /**
   * Build minimal context for group chat
   */
  async buildGroupContext(message: TelegramMessage): Promise<string> {
    return this.buildContext(message);
  }
}
