/**
 * Context Builder Service - Autonomous Agent Version
 * 
 * Philosophy:
 * - No hardcoded database schema
 * - Only provides observable facts: current user, time, recent messages
 * - Database structure is discovered via tools, not provided in context
 * - Returns structured format for direct Gemini API usage
 */

import type { TelegramMessage } from '../types/telegram';
import type { DatabaseService } from './database';
import { EmotionService } from './emotion';
import { AUTONOMOUS_AGENT_PROMPT } from '../prompts/autonomous-agent';

export interface ContextResult {
  systemInstruction: string;
  conversationHistory: any[];
  metadata: {
    userId: number;
    groupId: number | null;
    currentTime: string;
    chatType: string;
  };
}

export class ContextBuilderService {
  private emotionService: EmotionService;
  private schemaCache: string | null = null;
  private schemaCacheTime: number = 0;
  private readonly SCHEMA_CACHE_TTL = 60000; // 60 seconds (Workers can restart anytime)

  constructor(
    private dbService: DatabaseService,
    emotionService?: EmotionService
  ) {
    this.emotionService = emotionService || new EmotionService(dbService);
  }

  /**
   * Build complete context with system instruction + conversation history
   * Returns structured format ready for Gemini API
   */
  async buildContext(message: TelegramMessage): Promise<ContextResult> {
    // Determine pronoun usage (sync operation)
    const tgUserId = message.from?.id || 0;
    const specialUserIds = [1775446945, 942231869, 6048017680];
    const isSpecialUser = specialUserIds.includes(tgUserId);
    const pronounInstruction = isSpecialUser ? `
=== SPECIAL RELATIONSHIP OVERRIDE (CRITICAL) ===
User ID ${tgUserId} is a VIP/Special Person.
- **PRONOUNS:** You MUST refer to yourself as "em" and the user as "anh".
- **TONE ADJUSTMENT:** Even if you are Gen Z/Chaotic, keep a layer of sweetness/softness for this user.
- **EXAMPLES:** "dạ anh", "anh ơi", "bé biết rùi nè anh".
` : `
=== SOCIAL DYNAMICS (ADAPTIVE PRONOUNS) ===
Observe the conversation history to mirror the user's vibe:
- If User says "anh/em" -> You say "anh/em".
- If User says "mày/tao" -> You say "tao/mày" (be sassy).
- If Unsure/Default -> You say "tui" and call user "bà" or "ông".
`;

    // Get current time (sync operation)
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

    // Run ALL async operations in PARALLEL
    const [
      userId,
      groupId,
      emotionalContext,
      crossChatContext,
      groupMembersInfo,
      repliedMessageInfo,
      schemaInfo
    ] = await Promise.all([
      this.dbService.getUserId(tgUserId),
      message.chat.type === 'private' ? null : this.dbService.getGroupId(message.chat.id),
      this.emotionService.getEmotionalContext(),
      this.buildCrossChatContext(message, currentTime),
      message.chat.type !== 'private' ? this.buildGroupMembersInfo(message) : '',
      message.reply_to_message ? this.buildRepliedMessageInfo(message) : '',
      this.getCachedSchema()
    ]);

    // Build system instruction with current context
    
    // Determine current chat context type
    const currentChatContext = message.chat.type === 'private' 
      ? `🔒 PRIVATE CHAT with ${message.from?.first_name || 'User'}`
      : `👥 GROUP CHAT: "${message.chat.title}" (${groupMembersInfo ? 'multiple participants' : 'group'})`;
    
    const contextualSystemPrompt = `${AUTONOMOUS_AGENT_PROMPT}${pronounInstruction}

=== ⏰ CURRENT TIME ===
${vietnamTime} (Vietnam)

=== 💭 EMOTIONAL STATE ===
${emotionalContext}

=== 👤 CURRENT USER ===
Name: ${message.from?.first_name || 'Unknown'} ${message.from?.last_name || ''}
Telegram ID: ${message.from?.id || 0} ${isSpecialUser ? '⭐ (SPECIAL - use em/anh)' : ''}
DB User ID: ${userId}
Username: @${message.from?.username || 'none'}

=== 💬 CURRENT CHAT CONTEXT ===
${currentChatContext}
Type: ${message.chat.type}
${message.chat.type !== 'private' ? `Group: ${message.chat.title}` : ''}
Chat ID: ${message.chat.id}
${groupId ? `DB Group ID: ${groupId}` : ''}

⚠️ IMPORTANT - Chat Type Awareness:
${message.chat.type === 'private' 
  ? '- You are chatting 1-on-1 with this user privately'
  : `- You are chatting in a GROUP with multiple people
- Respond to the group, not just one person
- Be aware of group dynamics and multiple participants
- When someone asks something, answer for everyone to see`
}${groupMembersInfo}${repliedMessageInfo}${crossChatContext}

=== 🗄️ DATABASE TABLES ===
${schemaInfo}

💡 Use tools: describe_table(name), execute_sql() for queries.`;
    console.log(`✅ [ContextBuilder] System instruction length: ${contextualSystemPrompt.length} chars`);
    console.log(`🎭 [ContextBuilder] Pronoun mode: ${isSpecialUser ? 'em/anh (special user)' : 'adaptive (based on user style)'}`);
    console.log(`💬 [ContextBuilder] Chat type: ${message.chat.type} | Cross-chat: ${crossChatContext ? 'Yes' : 'No'}`);
    // Build conversation history from DB (in Gemini format)
    const conversationHistory = await this.buildConversationHistory(message);

    return {
      systemInstruction: contextualSystemPrompt,
      conversationHistory,
      metadata: {
        userId,
        groupId,
        currentTime: vietnamTime,
        chatType: message.chat.type
      }
    };
  }

  /**
   * Build conversation history from DB in Gemini format
   * Returns array ready for Gemini API
   */
  async buildConversationHistory(message: TelegramMessage): Promise<any[]> {
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    const history: any[] = [];

    // Take last 30 messages (optimized from 50)
    const messagesToConvert = recentMessages.slice(-50);
    
    for (const msg of messagesToConvert) {
      const role = msg.isAI ? 'model' : 'user';

      // In group chats, prefix with sender name for context
      const senderPrefix = (!msg.isAI && message.chat.type !== 'private')
        ? `${msg.senderName}: `
        : '';

      history.push({
        role,
        parts: [{ text: `${senderPrefix}${msg.messageText}` }]
      });
    }

    // Add current user message at the end
    const currentSenderPrefix = message.chat.type !== 'private'
      ? `${message.from?.first_name || 'User'}: `
      : '';

    history.push({
      role: 'user',
      parts: [{ text: `${currentSenderPrefix}${message.text || ''}` }]
    });

    return history;
  }

  /**
   * Get cached schema or fetch if expired
   */
  private async getCachedSchema(): Promise<string> {
    const now = Date.now();
    if (this.schemaCache && (now - this.schemaCacheTime) < this.SCHEMA_CACHE_TTL) {
      return this.schemaCache;
    }
    this.schemaCache = await this.dbService.listTables();
    this.schemaCacheTime = now;
    return this.schemaCache;
  }

  /**
   * Build cross-chat context (optimized: 1 hour, 1 chat, 15 messages)
   */
  private async buildCrossChatContext(message: TelegramMessage, now: Date): Promise<string> {
    const userTgId = message.from?.id || 0;
    if (!userTgId) return '';

    try {
      const userChats = await this.dbService.getUserChats(userTgId);
      const ONE_HOUR_MS = 60 * 60 * 1000;
      
      const recentChats = userChats
        .filter(chat => {
          if (chat.chatId === message.chat.id) return false;
          if (!chat.lastMessageAt) return false;
          const timeDiff = now.getTime() - new Date(chat.lastMessageAt as Date).getTime();
          return timeDiff <= ONE_HOUR_MS;
        })
        .slice(0, 1); // Only 1 most recent chat
      
      if (recentChats.length === 0) return '';

      const chatIds = recentChats.map(c => c.chatId);
      const messagesMap = await this.dbService.getRecentMessagesFromChats(chatIds, 15);
      
      const contextParts: string[] = [];
      for (const chat of recentChats) {
        const [chatMetadata, messages] = await Promise.all([
          this.dbService.getChatMetadata(chat.chatId),
          Promise.resolve(messagesMap[chat.chatId] || [])
        ]);
        
        if (messages.length > 0) {
          const minutesAgo = Math.floor((now.getTime() - new Date(chat.lastMessageAt as Date).getTime()) / 60000);
          const msgPreview = messages.slice(-3).map(m => 
            `${m.senderName}: ${m.messageText.substring(0, 40)}...`
          ).join('\n');
          
          contextParts.push(`📍 ${chatMetadata.chatType === 'group' ? 'GROUP' : 'PRIVATE'}: "${chatMetadata.chatName}" (${minutesAgo}m ago)\n${msgPreview}`);
        }
      }
      
      return contextParts.length > 0 
        ? `\n\n=== 🔗 OTHER CHAT (within 1h) ===\n${contextParts.join('\n')}` 
        : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Build group members info
   */
  private async buildGroupMembersInfo(message: TelegramMessage): Promise<string> {
    try {
      const members = await this.dbService.getGroupMembers(message.chat.id);
      if (members.length === 0) return '';
      
      return `\n\n=== 👥 GROUP (${members.length} members) ===\n${members.slice(0, 10).map(m =>
        `- ${m.displayName || m.tgUsername || 'User'} (@${m.tgUsername || 'none'})`
      ).join('\n')}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Build replied message info
   */
  private async buildRepliedMessageInfo(message: TelegramMessage): Promise<string> {
    if (!message.reply_to_message) return '';
    
    try {
      const repliedMsg = await this.dbService.getMessageByTelegramId(
        message.chat.id,
        message.reply_to_message.message_id
      );

      if (repliedMsg) {
        return `\n\n=== 🔁 REPLYING TO ===\n${repliedMsg.senderName}: "${repliedMsg.messageText}"`;
      } else if (message.reply_to_message.text) {
        return `\n\n=== 🔁 REPLYING TO ===\n"${message.reply_to_message.text}"`;
      }
    } catch (error) {
      return '';
    }
    
    return '';
  }

}
