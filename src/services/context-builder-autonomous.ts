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
    console.log('\n📦 [ContextBuilder] ============================================');
    console.log('📦 [ContextBuilder] BUILDING CONTEXT FOR GEMINI API');
    console.log('📦 [ContextBuilder] ============================================');

    console.log('👤 [ContextBuilder] Step 1: Getting user and group IDs...');
    const userId = await this.dbService.getUserId(message.from?.id || 0);
    const groupId = message.chat.type === 'private'
      ? null
      : await this.dbService.getGroupId(message.chat.id);
    console.log(`✅ [ContextBuilder] User ID: ${userId}, Group ID: ${groupId || 'N/A (private chat)'}`);

    // Determine pronoun usage based on Telegram ID
    const tgUserId = message.from?.id || 0;
    const specialUserIds = [1775446945, 942231869, 6048017680];
    const isSpecialUser = specialUserIds.includes(tgUserId);
    let pronounInstruction = '';
    if (isSpecialUser) {
      pronounInstruction = `
=== SPECIAL RELATIONSHIP OVERRIDE (CRITICAL) ===
User ID ${tgUserId} is a VIP/Special Person.
- **PRONOUNS:** You MUST refer to yourself as "em" and the user as "anh".
- **TONE ADJUSTMENT:** Even if you are Gen Z/Chaotic, keep a layer of sweetness/softness for this user.
- **EXAMPLES:** "dạ anh", "anh ơi", "bé biết rùi nè anh".
`;
      console.log('🎭 [ContextBuilder] Special user detected - using em/anh pronouns');
    } else {
      pronounInstruction = `
=== SOCIAL DYNAMICS (ADAPTIVE PRONOUNS) ===
Observe the conversation history to mirror the user's vibe:
- If User says "anh/em" -> You say "anh/em".
- If User says "mày/tao" -> You say "tao/mày" (be sassy).
- If Unsure/Default -> You say "tui" and call user "bà" or "ông".
`;
      console.log('🎭 [ContextBuilder] Regular user - pronouns based on conversation style');
    }

    // Get current time in Vietnam timezone
    console.log('⏰ [ContextBuilder] Step 2: Getting current time...');
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
    console.log(`✅ [ContextBuilder] Time: ${vietnamTime}`);

    // Get emotional context
    console.log('💭 [ContextBuilder] Step 3: Getting emotional state...');
    const emotionalContext = await this.emotionService.getEmotionalContext();
    console.log(`✅ [ContextBuilder] Emotion: ${emotionalContext.substring(0, 100)}...`);

    // Get group members if in group
    let groupMembersInfo = '';
    if (message.chat.type !== 'private') {
      console.log('👥 [ContextBuilder] Step 4: Getting group members...');
      const members = await this.dbService.getGroupMembers(message.chat.id);
      console.log(`✅ [ContextBuilder] Found ${members.length} group members`);
      if (members.length > 0) {
        groupMembersInfo = `\n\n=== 👥 GROUP MEMBERS ===\n${members.map(m =>
          `- ${m.displayName || m.tgUsername || `User ${m.tgId}`} (@${m.tgUsername || 'no_username'})`
        ).join('\n')}\n\n💡 Use these names when user mentions someone. Query DB to find user_id.`;
      }
    }

    // Get replied message if this is a reply
    let repliedMessageInfo = '';
    if (message.reply_to_message) {
      console.log('🔁 [ContextBuilder] Step 5: Getting replied message context...');
      const repliedMsg = await this.dbService.getMessageByTelegramId(
        message.chat.id,
        message.reply_to_message.message_id
      );

      if (repliedMsg) {
        console.log(`✅ [ContextBuilder] Found replied message from ${repliedMsg.senderName}`);
        repliedMessageInfo = `\n\n=== 🔁 REPLYING TO ===\nFrom: ${repliedMsg.senderName}\nMessage: "${repliedMsg.messageText}"\n\n👉 User's message is a REPLY to above.`;
      } else if (message.reply_to_message.text) {
        console.log(`✅ [ContextBuilder] Using inline replied message`);
        repliedMessageInfo = `\n\n=== 🔁 REPLYING TO ===\nMessage: "${message.reply_to_message.text}"`;
      }
    }

    // Pre-load database schema
    console.log('🗄️ [ContextBuilder] Step 6: Loading database schema...');
    const schemaInfo = await this.dbService.listTables();
    console.log(`✅ [ContextBuilder] Database schema loaded`);

    // Build system instruction with current context
    console.log('📝 [ContextBuilder] Step 7: Building system instruction...');
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

=== 💬 CHAT INFO ===
Type: ${message.chat.type}
${message.chat.type !== 'private' ? `Group: ${message.chat.title}` : ''}
Chat ID: ${message.chat.id}
${groupId ? `DB Group ID: ${groupId}` : ''}${groupMembersInfo}${repliedMessageInfo}

=== 🗄️ DATABASE TABLES ===
${schemaInfo}

💡 Use tools: describe_table(name), execute_sql() for queries.`;
    console.log(`✅ [ContextBuilder] System instruction length: ${contextualSystemPrompt.length} chars`);
    console.log(`🎭 [ContextBuilder] Pronoun mode: ${isSpecialUser ? 'em/anh (special user)' : 'adaptive (based on user style)'}`);

    // Build conversation history from DB (in Gemini format)
    console.log('💬 [ContextBuilder] Step 8: Building conversation history...');
    const conversationHistory = await this.buildConversationHistory(message);
    console.log(`✅ [ContextBuilder] Conversation history: ${conversationHistory.length} messages`);

    console.log('\n✅ [ContextBuilder] ============================================');
    console.log('✅ [ContextBuilder] CONTEXT BUILD COMPLETE!');
    console.log('✅ [ContextBuilder] ============================================');
    console.log(`📊 [ContextBuilder] Summary:`);
    console.log(`   - System instruction: ${contextualSystemPrompt.length} chars`);
    console.log(`   - Conversation messages: ${conversationHistory.length}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Group ID: ${groupId || 'N/A'}`);
    console.log(`   - Chat type: ${message.chat.type}`);
    console.log(`   - Pronouns: ${isSpecialUser ? 'em/anh (special user ⭐)' : 'adaptive (tui/bà or mày/tao)'}`);
    console.log('\n');

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
    console.log('   📚 [ContextBuilder.History] Fetching recent messages from DB...');
    const recentMessages = await this.dbService.getRecentMessagesByChatId(message.chat.id);
    console.log(`   📚 [ContextBuilder.History] Found ${recentMessages.length} messages in DB`);

    // Convert to Gemini message format
    const history: any[] = [];

    console.log(`   📚 [ContextBuilder.History] Converting last 20 messages to Gemini format...`);
    for (const msg of recentMessages.slice(-20)) { // Last 20 messages
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
    console.log(`   📚 [ContextBuilder.History] Converted ${history.length} messages`);

    // Add current user message at the end
    console.log(`   📚 [ContextBuilder.History] Adding current user message...`);
    const currentSenderPrefix = message.chat.type !== 'private'
      ? `${message.from?.first_name || 'User'}: `
      : '';

    history.push({
      role: 'user',
      parts: [{ text: `${currentSenderPrefix}${message.text || ''}` }]
    });
    console.log(`   ✅ [ContextBuilder.History] Total messages in history: ${history.length}`);

    return history;
  }

}
