import { GoogleGenerativeAI } from '@google/genai';
import { db } from './db/neon';
import { 
  tgUsers, 
  tgGroups, 
  debts, 
  nameAliases, 
  chatSessions, 
  chatMessages,
  actionLogs 
} from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    title?: string;
    type: 'private' | 'group' | 'supergroup';
  };
  date: number;
  text: string;
}

export class AIBot {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processMessage(message: TelegramMessage): Promise<string> {
    try {
      // 1. Đảm bảo user và group tồn tại trong database
      await this.ensureUserAndGroup(message);
      
      // 2. Tạo context cho AI từ database
      const context = await this.buildContext(message);
      
      // 3. Phân tích intent và generate SQL nếu cần
      const aiResponse = await this.analyzeAndExecute(message.text, context);
      
      // 4. Lưu conversation
      await this.saveConversation(message, aiResponse);
      
      return aiResponse.response;
      
    } catch (error) {
      console.error('Error processing message:', error);
      return 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.';
    }
  }

  private async ensureUserAndGroup(message: TelegramMessage) {
    // Đảm bảo user tồn tại
    const existingUser = await db
      .select()
      .from(tgUsers)
      .where(eq(tgUsers.tgId, message.from.id))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(tgUsers).values({
        tgId: message.from.id,
        tgUsername: message.from.username,
        displayName: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
      });
    }

    // Đảm bảo group tồn tại (nếu không phải private chat)
    if (message.chat.type !== 'private') {
      const existingGroup = await db
        .select()
        .from(tgGroups)
        .where(eq(tgGroups.tgChatId, message.chat.id))
        .limit(1);

      if (existingGroup.length === 0) {
        await db.insert(tgGroups).values({
          tgChatId: message.chat.id,
          title: message.chat.title || 'Unknown Group',
          type: message.chat.type,
        });
      }
    }
  }

  private async buildContext(message: TelegramMessage): Promise<string> {
    const userId = await this.getUserId(message.from.id);
    const groupId = message.chat.type === 'private' ? null : await this.getGroupId(message.chat.id);
    
    // Lấy lịch sử chat gần đây
    const recentMessages = await db
      .select({
        sender: chatMessages.sender,
        messageText: chatMessages.messageText,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .leftJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        and(
          eq(chatSessions.userId, userId),
          groupId ? eq(chatSessions.groupId, groupId) : sql`${chatSessions.groupId} IS NULL`
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);

    // Lấy thông tin nợ hiện tại
    const currentDebts = await db
      .select({
        lenderName: sql<string>`lender.display_name`,
        borrowerName: sql<string>`borrower.display_name`,
        amount: debts.amount,
        currency: debts.currency,
        note: debts.note,
        occurredAt: debts.occurredAt,
      })
      .from(debts)
      .leftJoin(tgUsers.as('lender'), eq(debts.lenderId, sql`lender.id`))
      .leftJoin(tgUsers.as('borrower'), eq(debts.borrowerId, sql`borrower.id`))
      .where(
        and(
          eq(debts.settled, false),
          groupId ? eq(debts.groupId, groupId) : sql`${debts.groupId} IS NULL`
        )
      )
      .limit(20);

    // Lấy name aliases
    const aliases = await db
      .select({
        aliasText: nameAliases.aliasText,
        refUserName: sql<string>`ref_user.display_name`,
      })
      .from(nameAliases)
      .leftJoin(tgUsers.as('ref_user'), eq(nameAliases.refUserId, sql`ref_user.id`))
      .where(eq(nameAliases.ownerUserId, userId))
      .limit(50);

    // Tạo context string
    const context = `
=== NGỮ CẢNH HIỆN TẠI ===
User: ${message.from.first_name} (ID: ${message.from.id})
Chat: ${message.chat.type === 'private' ? 'Private' : message.chat.title}

=== LỊCH SỬ CHAT GÂN ĐÂY ===
${recentMessages.map(msg => `${msg.sender}: ${msg.messageText}`).join('\n')}

=== NỢ HIỆN TẠI ===
${currentDebts.length > 0 ? 
  currentDebts.map(debt => `${debt.borrowerName} nợ ${debt.lenderName}: ${debt.amount}${debt.currency}`).join('\n') :
  'Không có nợ nào.'
}

=== TÊN GỌI ĐÃ HỌC ===
${aliases.length > 0 ?
  aliases.map(alias => `"${alias.aliasText}" = ${alias.refUserName}`).join('\n') :
  'Chưa có tên gọi nào được học.'
}
    `.trim();

    return context;
  }

  private async analyzeAndExecute(userMessage: string, context: string): Promise<{
    response: string;
    intent?: string;
    sqlQuery?: string;
    sqlParams?: any;
  }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
Bạn là một AI bot thông minh chuyên quản lý nợ và tài chính cá nhân.

NGỮ CẢNH:
${context}

TIN NHẮN USER: "${userMessage}"

HÃY PHÂN TÍCH VÀ XỬ LÝ:

1. XÁC ĐỊNH INTENT:
- debt_record: Ghi nợ mới (ví dụ: "A nợ B 100k", "ghi nợ")
- debt_query: Tra cứu nợ (ví dụ: "ai nợ ai", "kiểm tra nợ")  
- debt_settle: Trả nợ (ví dụ: "A trả B 50k", "thanh toán")
- name_learn: Học tên mới (ví dụ: "Thịnh là Nguyễn Văn Thịnh")
- chat: Trò chuyện thông thường

2. NẾU LÀ debt_record:
- Trích xuất thông tin: ai nợ ai, bao nhiêu tiền
- Tạo SQL INSERT để lưu vào bảng debts
- Học tên mới nếu chưa biết

3. NẾU LÀ debt_query:
- Tạo SQL SELECT để lấy thông tin nợ
- Tổng hợp và hiển thị kết quả

4. NẾU LÀ name_learn:
- Tạo SQL INSERT vào bảng name_aliases

TRẢ VỀ JSON FORMAT:
{
  "intent": "debt_record|debt_query|debt_settle|name_learn|chat",
  "response": "Câu trả lời cho user",
  "sql_query": "SQL query nếu cần",
  "sql_params": {"param1": "value1"},
  "extracted_data": {
    "debts": [{"lender": "tên", "borrower": "tên", "amount": số, "currency": "VND"}],
    "names": [{"alias": "tên gọi", "real_name": "tên thật"}]
  }
}

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response
      const parsed = JSON.parse(response);
      
      // Thực thi SQL nếu có
      if (parsed.sql_query) {
        await this.executeSqlQuery(parsed.sql_query, parsed.sql_params || {});
      }
      
      // Xử lý các extraction data
      if (parsed.extracted_data) {
        await this.processExtractedData(parsed.extracted_data, parsed.intent);
      }
      
      return {
        response: parsed.response,
        intent: parsed.intent,
        sqlQuery: parsed.sql_query,
        sqlParams: parsed.sql_params,
      };
      
    } catch (error) {
      console.error('Error in AI analysis:', error);
      
      // Fallback: Phân tích đơn giản bằng keyword
      return await this.simpleKeywordAnalysis(userMessage, context);
    }
  }

  private async executeSqlQuery(query: string, params: any) {
    try {
      // Chỉ cho phép SELECT, INSERT, UPDATE an toàn
      const safeQuery = query.toLowerCase().trim();
      if (!safeQuery.startsWith('select') && 
          !safeQuery.startsWith('insert') && 
          !safeQuery.startsWith('update')) {
        throw new Error('Unsafe SQL query');
      }
      
      // Execute query với drizzle
      // Note: Cần implement proper SQL execution với drizzle
      console.log('Executing SQL:', query, params);
      
    } catch (error) {
      console.error('SQL execution error:', error);
    }
  }

  private async processExtractedData(data: any, intent: string) {
    if (intent === 'debt_record' && data.debts) {
      for (const debt of data.debts) {
        await this.recordDebt(debt);
      }
    }
    
    if (data.names) {
      for (const name of data.names) {
        await this.learnName(name.alias, name.real_name);
      }
    }
  }

  private async recordDebt(debtInfo: {
    lender: string;
    borrower: string;
    amount: number;
    currency?: string;
  }) {
    try {
      const lenderId = await this.findOrCreateUserByName(debtInfo.lender);
      const borrowerId = await this.findOrCreateUserByName(debtInfo.borrower);
      
      if (lenderId && borrowerId) {
        await db.insert(debts).values({
          lenderId,
          borrowerId,
          amount: debtInfo.amount.toString(),
          currency: debtInfo.currency || 'VND',
          note: `Auto-recorded from chat`,
        });
      }
    } catch (error) {
      console.error('Error recording debt:', error);
    }
  }

  private async findOrCreateUserByName(name: string): Promise<number | null> {
    // Tìm trong name_aliases trước
    const alias = await db
      .select({ refUserId: nameAliases.refUserId })
      .from(nameAliases)
      .where(eq(nameAliases.aliasText, name))
      .limit(1);

    if (alias.length > 0 && alias[0].refUserId) {
      return alias[0].refUserId;
    }

    // Tìm user có display_name khớp
    const user = await db
      .select({ id: tgUsers.id })
      .from(tgUsers)
      .where(eq(tgUsers.displayName, name))
      .limit(1);

    return user.length > 0 ? user[0].id : null;
  }

  private async learnName(alias: string, realName: string) {
    // TODO: Implement name learning logic
  }

  private async simpleKeywordAnalysis(userMessage: string, context: string): Promise<{
    response: string;
    intent?: string;
  }> {
    const message = userMessage.toLowerCase();
    
    if (message.includes('nợ') || message.includes('ghi nợ')) {
      return {
        response: 'Tôi hiểu bạn muốn ghi nợ. Bạn có thể nói rõ hơn ai nợ ai bao nhiêu không?',
        intent: 'debt_record'
      };
    }
    
    if (message.includes('ai nợ ai') || message.includes('kiểm tra nợ')) {
      return {
        response: 'Đang kiểm tra thông tin nợ...',
        intent: 'debt_query'
      };
    }
    
    return {
      response: 'Xin chào! Tôi có thể giúp bạn quản lý nợ và tài chính. Hãy thử nói "ghi nợ" hoặc "ai nợ ai".',
      intent: 'chat'
    };
  }

  private async getUserId(tgId: number): Promise<number> {
    const user = await db
      .select({ id: tgUsers.id })
      .from(tgUsers)
      .where(eq(tgUsers.tgId, tgId))
      .limit(1);
    
    return user[0]?.id || 0;
  }

  private async getGroupId(tgChatId: number): Promise<number | null> {
    const group = await db
      .select({ id: tgGroups.id })
      .from(tgGroups)
      .where(eq(tgGroups.tgChatId, tgChatId))
      .limit(1);
    
    return group[0]?.id || null;
  }

  private async saveConversation(message: TelegramMessage, aiResponse: any) {
    try {
      const userId = await this.getUserId(message.from.id);
      const groupId = message.chat.type === 'private' ? null : await this.getGroupId(message.chat.id);
      
      // Tìm hoặc tạo session
      let session = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.userId, userId),
            groupId ? eq(chatSessions.groupId, groupId) : sql`${chatSessions.groupId} IS NULL`,
            eq(chatSessions.active, true)
          )
        )
        .limit(1);

      if (session.length === 0) {
        const [newSession] = await db.insert(chatSessions).values({
          userId,
          groupId,
        }).returning();
        session = [newSession];
      }

      // Lưu user message
      await db.insert(chatMessages).values({
        sessionId: session[0].id,
        sender: 'user',
        senderTgId: message.from.id,
        messageText: message.text,
        intent: aiResponse.intent,
        sqlQuery: aiResponse.sqlQuery,
        sqlParams: aiResponse.sqlParams,
      });

      // Lưu AI response
      await db.insert(chatMessages).values({
        sessionId: session[0].id,
        sender: 'ai',
        messageText: aiResponse.response,
      });

    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }
}