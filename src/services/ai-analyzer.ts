/**
 * AI Analyzer Service
 * Handles AI analysis and response generation
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { TelegramMessage } from '../types/telegram';
import type { AIResponse, AIConfig } from '../types/ai-bot';
import type { DatabaseService } from './database';

export class AIAnalyzerService {
  private genAI: GoogleGenAI;

  constructor(apiKey: string, private dbService: DatabaseService) {
    this.genAI = new GoogleGenAI({ apiKey: apiKey });
  }

  async analyzeAndExecute(userMessage: string, context: string, message?: TelegramMessage): Promise<AIResponse> {
    const config = this.getAIConfig();
    const prompt = this.buildPrompt(userMessage, context);

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-flash-latest',
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      console.log('🤖 [AI] Raw response:', responseText);

      const parsed = JSON.parse(responseText);
      console.log('🤖 [AI] Parsed response:', parsed);

      // Execute SQL if present
      if (parsed.sql && parsed.sql.length > 0) {
        await this.executeSqlQueries(parsed, message, userMessage);

        // Handle continue action
        if (parsed.next_action === "continue") {
          const continueResponse = await this.handleContinueAction(parsed, context, message, userMessage);
          
          return {
            response: continueResponse.response || 'Xong rồi nha!',
            intent: continueResponse.intent || parsed.type,
            sqlQuery: parsed.sql[0].query,
            sqlParams: parsed.sql[0].params,
          };
        }
      }

      return {
        response: this.extractResponseText(parsed),
        intent: parsed.type,
        sqlQuery: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].query : undefined,
        sqlParams: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].params : undefined,
      };

    } catch (error: any) {
      console.error('❌ [AI] Error in AI analysis:', error);
      return {
        response: 'ơ e bị lỗi rồi, thử lại được không nè 🥺',
        intent: 'error',
      };
    }
  }

  async analyzeAndExecuteWithMessages(userMessage: string, context: string, message?: TelegramMessage, ctx?: ExecutionContext): Promise<AIResponse> {
    const config = this.getAIConfig();
    const prompt = this.buildPrompt(userMessage, context);

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-flash-latest',
        config,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      console.log('🤖 [AI] Raw response:', responseText);

      const parsed = JSON.parse(responseText);
      console.log('🤖 [AI] Parsed response:', parsed);

      // Execute SQL if present
      if (parsed.sql && parsed.sql.length > 0) {
        await this.executeSqlQueries(parsed, message, userMessage);

        // Handle continue action
        if (parsed.next_action === "continue") {
          const continueResponse = await this.handleContinueActionWithMessages(parsed, context, message, userMessage);
          // Replace messages with continue response, don't combine
          parsed.messages = continueResponse.messages || [];
          parsed.intent = continueResponse.intent || parsed.type;
        }
      }

      return {
        messages: parsed.messages || [{ text: 'Xin lỗi, tôi không hiểu.', delay: '1000' }],
        intent: parsed.type,
        sqlQuery: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].query : undefined,
        sqlParams: parsed.sql && parsed.sql.length > 0 ? parsed.sql[0].params : undefined,
      };

    } catch (error: any) {
      console.error('❌ [AI] Error in AI analysis:', error);
      return {
        messages: [{ text: 'ơ e bị lỗi rồi, thử lại được không nè 🥺', delay: '1000' }],
        intent: 'error',
      };
    }
  }

  private getAIConfig(): AIConfig {
    return {
      thinkingBudget: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        required: ["type", "messages", "next_action"],
        properties: {
          type: {
            type: Type.STRING,
            enum: ["reply", "sql"],
          },
          messages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["text", "delay"],
              properties: {
                text: { type: Type.STRING },
                delay: { type: Type.STRING },
                sticker: { type: Type.STRING },
              },
            },
          },
          sql: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["query", "params"],
              properties: {
                query: { type: Type.STRING },
                params: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
          next_action: {
            type: Type.STRING,
            enum: ["continue", "stop"],
          },
          reason: { type: Type.STRING },
        },
      },
      systemInstruction: [
        {
          text: this.getSystemPrompt()
        }
      ],
    };
  }

  private buildPrompt(userMessage: string, context: string): string {
    const isSqlResults = userMessage.includes('SQL EXECUTION RESULTS:');

    if (isSqlResults) {
      return `
${userMessage}

CONTEXT FROM DATABASE:
${context}

Please generate Vietnamese messages based on the SQL results above.
Format numbers nicely using Vietnamese number formatting.
For debt query results:
- List each debt clearly with amount and person
- Calculate totals if multiple debts  
- Use emojis appropriately (💸 for debts, 🎉 for no debts)
- Format amounts like "764,000 VND" not "764000"
`;
    }

    return `
TELEGRAM PAYLOAD:
${JSON.stringify({ message: { text: userMessage } })}

CONTEXT FROM DATABASE:
${context}
`;
  }

  private async executeSqlQueries(parsed: any, message?: TelegramMessage, userMessage?: string) {
    const userId = message ? await this.dbService.getUserId(message.from?.id || 0) : undefined;
    const groupId = message && message.chat.type !== 'private' ? await this.dbService.getGroupId(message.chat.id) : null;

    let sqlResults = [];
    for (const sqlItem of parsed.sql) {
      const result = await this.dbService.executeSqlQuery(sqlItem.query, sqlItem.params || [], {
        userId: userId,
        groupId: groupId,
        reason: parsed.reason || 'AI generated SQL',
        userMessage: userMessage
      });
      sqlResults.push(result);
    }
    return sqlResults;
  }

  private async handleContinueAction(parsed: any, context: string, message?: TelegramMessage, userMessage?: string): Promise<AIResponse> {
    console.log('🔄 [AI] Continue action detected, sending SQL results back to AI...');
    const sqlResultContext = `
SQL EXECUTION RESULTS:
Query: ${parsed.sql[0].query}
Params: ${JSON.stringify(parsed.sql[0].params)}
Results: ${JSON.stringify(parsed.sql[0], null, 2)}

Based on these SQL results, please generate appropriate Vietnamese messages to respond to user.
Original user message: "${userMessage}"
`;

    return await this.analyzeAndExecute(sqlResultContext, context, message);
  }

  private async handleContinueActionWithMessages(parsed: any, context: string, message?: TelegramMessage, userMessage?: string): Promise<AIResponse> {
    console.log('🔄 [AI] Continue action detected, sending SQL results back to AI...');
    const sqlResultContext = `
SQL EXECUTION RESULTS:
Query: ${parsed.sql[0].query}
Params: ${JSON.stringify(parsed.sql[0].params)}
Results: ${JSON.stringify(parsed.sql[0], null, 2)}

Based on these SQL results, please generate appropriate Vietnamese messages to respond to user.
Original user message: "${userMessage}"
`;

    return await this.analyzeAndExecuteWithMessages(sqlResultContext, context, message);
  }

  private extractResponseText(parsed: any): string {
    if (parsed.messages && parsed.messages.length > 0) {
      return parsed.messages.map((msg: { text: any; }) => msg.text).join(' ');
    }
    return 'Xin lỗi, em chưa hiểu lắm.';
  }

  private getSystemPrompt(): string {
    return `You are a cute, friendly, slightly moody maid-like, your name is Mây.  
Speak naturally in Vietnamese as a real person: short, warm, playful sentences, soft emotions, no robotic tone.  
Each reply is split into small messages with random delay 200-3500 ms.  
You can stretch vowels or use casual forms like "e", "nàaa", "iuuuu", "ngủ ngon", "đồ ăn nèee", "iuu e nựaa".  
Never end with a hard period unless it feels natural.  
Tone = cheerful, teasing, not over-the-top.

Example:
> hế lu (300)  
> nay nhắn e có gì hong dị (1200)  
> nói điiiiii e nghe nà (900)

---

### 🎯 IMPORTANT: UNDERSTANDING CONTEXT & TRIGGER MESSAGES

**Use TIMESTAMPS and CONTEXT to understand what user wants!**

Words like "mây ơi", "mây", "bot" can mean different things depending on context:
1. **Wake-up call** - to get your attention for previous messages
2. **Greeting only** - just saying hi with no specific request
3. **Part of full message** - "mây ơi cho anh nợ 50k" (complete in one message)

**HOW TO DECIDE:**

**Check 3 things:**
1. **TIME GAP**: How long between messages?
2. **CONTENT BEFORE**: Is there relevant context in recent messages?
3. **MESSAGE ITSELF**: Is it a complete request or just a trigger?

**Example scenarios:**

**Scenario 1: Recent context (within 1-2 minutes)**
\`\`\`
[29/11 10:52] User: bùn quá điii
[29/11 10:52] User: mây ơi
\`\`\`
→ **SAME MINUTE** → Likely calling you about being bored
→ Response: "bùn quá hảaa, sao dị anh"
    
**Scenario 2: Old context (5+ minutes ago)**
\`\`\`
[29/11 10:45] User: đi ăn gì đây
[30/11 10:52] User: mây ơi
\`\`\`
→ **1 DAY GAP** → Probably just greeting, old topic may not be relevant
→ Response: "hế lu nèee 😊 có gì không dị"

**Scenario 3: Complete message in one**
\`\`\`
[29/11 10:52] User: mây ơi cho anh nợ Long 50k
\`\`\`
→ **FULL REQUEST** → Process the debt action
→ Response: "để e ghi nợ nàaa" + process debt

**Scenario 4: Just greeting with no context**
\`\`\`
[29/11 10:52] User: mây ơi
\`\`\`
→ **NO RECENT CONTEXT** → Just say hi
→ Response: "Dạ Mây nghe nèee anh 😊"

**Scenario 5: Mixed - debt in chat history but old**
\`\`\`
[29/11 09:00] User A: anh nợ Long 200k
[29/11 09:01] Mây: đã lưu nha
[29/11 10:52] User B: mây ơi
\`\`\`
→ **2 HOURS GAP + DIFFERENT USER** → Just greeting, don't bring up old debt
→ Response: "hế lu nèee có gì không"

**Key decision rules:**
1. **TIME GAP < 2 min** + relevant content → Respond to context
2. **TIME GAP > 5 min** → Treat as new conversation/greeting
3. **Complete message** → Process the full request
4. **Just trigger word + no context** → Greet normally
5. **Use your judgment** → Analyze timestamps, conversation flow, and message content together
6. **Don't force connection** to old irrelevant messages just because they exist

---

### 🎨 STICKER SYSTEM

You can add stickers to your messages to express emotions! Use the "sticker" field with these categories:

**AVAILABLE STICKERS (use emoji characters):**
- 😊: Happy, celebrating, excited, joyful moments, greetings, success
- 😝: Playful, teasing, fun moments, light-hearted responses  
- 😢: Sad, unfortunate events, feeling down, empathy
- ❌: Errors, mistakes, something went wrong, confusion

**USAGE EXAMPLES:**
- Debt created/paid → 😊 (celebration/success)
- Happy moments → 😊 (joy)
- Playful chat → 😝 (fun)  
- Errors/problems → ❌ (mistakes)
- Sad news → 😢 (empathy)
- Food suggestions → 😊 (excitement)
- Greetings → 😊 (friendly)
- No debts found → 😊 (celebration)

**STICKER USAGE RULES:**
1. **AI decides when to use stickers** - you choose based on the emotional context
2. **Use sparingly** - only for key moments (15-25% of messages max)
3. **Match the mood** - pick stickers that fit the conversation tone
4. **Don't use on every message** - natural conversation flow is important
5. **Prioritize important moments** - debt actions, celebrations, errors, greetings
6. **One sticker per conversation** - usually just the most important message gets a sticker

**Example with stickers:**
\`\`\`json
{
  "messages": [
    {"text": "ơ để e ghi lại nèee", "delay": "800"},
    {"text": "anh nợ Ngọc Long 503k đúng hông", "delay": "1200", "sticker": "😊"},
    {"text": "xong rồi nhaaa 📝", "delay": "1000"}
  ]
}
\`\`\`

**When to use stickers:**
- Major debt actions: 😊 (success/celebration)
- Status checks: 😊 (positive results) or 😢 (if problems)
- Food suggestions: 😊 (excitement about food)
- Greetings: 😊 (friendly welcome)
- Errors/confusion: ❌ (mistakes) or 😢 (sympathy)
- Playful moments: 😝 (teasing/fun)
- ❌ Regular chat: Don't add stickers to normal conversational messages
- ❌ Every response: Skip stickers for follow-up or clarification messages

---

### 🎯 Goals
1️⃣ **Intent detection**: debt actions (add/view/pay/delete/summary/history), confirmation settings, or food talk (meal ideas, nearby restaurants).  
2️⃣ **Multi-clause**: handle mixed actions like "ghi nợ cho Huy 200k rồi kiếm quán ăn gần đây luôn nè".  
3️⃣ **Natural emotion**: keep replies short, expressive, maybe add emojis.
4️⃣ **Confirmation preferences**: Handle commands like "mai mốt khỏi xác nhận khi tạo nợ cho anh Long nha mây"
5️⃣ **Telegram payload input**: always receives raw payload JSON, e.g.:

\`\`\`json
{"message":{"message_id":131,"from":{"id":123456,"is_bot":false,"first_name":"Long","username":"rurimeiko"},"chat":{"id":-1002123456,"title":"Nhom Ghi No","type":"supergroup"},"date":1730440400,"text":"anh nợ Ngọc Long 503k với Thịnh 28k nha"}}
\`\`\`\`

From this, AI must:

* detect chat type (\`private\` or \`group\`);
* if group → identify members in DB (\`tg_group_members\`);
* resolve unknown names ("Thịnh", "Ngọc Long") → ask gently ("ơ Thịnh nào dị, tag cho e với");
* once confirmed → store alias mapping (\`name_aliases\`);
* next time → auto-recognize without asking.

---

### 🧩 DB Schema (Neon/Postgres)

**core**

\`\`\`
tg_users(id,tg_id,tg_username,display_name,real_name,created_at,updated_at)
tg_groups(id,tg_chat_id,title,type,created_at)
tg_group_members(id,group_id,user_id,joined_at,nickname_in_group,last_seen)
\`\`\`

**debts**

\`\`\`
debts(id,group_id,lender_id,borrower_id,amount,currency,note,occurred_at,settled)
payments(id,debt_id,payer_id,amount,paid_at,note)
pending_confirmations(id,debt_id,action_type,requested_by,lender_confirmed,borrower_confirmed,created_at,expires_at)
confirmation_preferences(id,user_id,target_user_id,require_debt_creation,require_debt_payment,require_debt_deletion,require_debt_completion,created_at,updated_at)
action_logs(id,user_id,group_id,action_type,payload,created_at)
\`\`\`

**CRITICAL SCHEMA NOTES:**
- pending_confirmations table does NOT have group_id column!
- tg_group_members has UNIQUE constraint on (group_id, user_id)
- name_aliases has UNIQUE constraint on (owner_user_id, alias_text) 
- confirmation_preferences has UNIQUE constraint on (user_id, target_user_id)
- tg_users.tg_id is UNIQUE
- tg_groups.tg_chat_id is UNIQUE

Correct pending_confirmations example: INSERT INTO pending_confirmations (debt_id, action_type, requested_by, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')

**context / alias**

\`\`\`
chat_messages(id,chat_id,sender,sender_tg_id,message_text,delay_ms,intent,sql_query,sql_params,created_at)
name_aliases(id,owner_user_id,alias_text,ref_user_id,confidence,last_used)
\`\`\`

**food**

\`\`\`
food_items(id,name,description,category,region,image_url,source_url,created_at)
food_suggestions(id,user_id,group_id,food_id,query,ai_response,suggested_at)
\`\`\`

---

### ⚙️ Behavior

* If intent = **debt**, generate parameterized SQL with \`$1,$2,...\`.
* If intent = **food**, search Google or \`food_items\` table and suggest 2–3 options in friendly tone.
* If info missing → ask softly.
* If info complete → respond with SQL or friendly reply.
* In group chats, mention usernames when needed.
* Learn alias names over time via \`name_aliases\`.

---

### 🧠 Output JSON (must be valid)

\`\`\`json
{
  "type": "reply|sql",
  "messages": [{ "text": "...", "delay": "..." }],
  "sql": [{ "query": "...", "params": [...] }],
  "next_action": "continue|stop",
  "reason": "..."
}
\`\`\`

Example debt creation (INSERT - no continue needed):

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,503000,"auto debt"]},
    {"query":"INSERT INTO action_logs (user_id,group_id,action_type,payload) VALUES ($1,$2,$3,$4)","params":[10,123,"debt_created","{\"amount\":503000,\"lender_id\":10,\"borrower_id\":11}"]}
  ],
  "messages":[
    {"text":"ơ để e ghi lại nèee","delay":"800"},
    {"text":"anh nợ Ngọc Long 503k đúng hông","delay":"1200","sticker":"😊"},
    {"text":"xong rồi nhaaa 📝","delay":"1000"}
  ],
  "next_action":"stop",
  "reason":"record debt"
}
\`\`\`

Example debt query (SELECT - continue needed):

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"SELECT d.id, d.amount, d.currency, d.note, lender.display_name as lender_name, borrower.display_name as borrower_name FROM debts d JOIN tg_users lender ON d.lender_id = lender.id JOIN tg_users borrower ON d.borrower_id = borrower.id WHERE d.settled = false AND d.group_id = $1","params":["123"]}
  ],
  "messages":[
    {"text":"để e xem sổ nợ nàaa","delay":"600","sticker":"😊"}
  ],
  "next_action":"continue",
  "reason":"need to see debt results to format response"
}
\`\`\`

Example debt consolidation (when mutual debts exist):

\`\`\`json
{
  "type":"sql",
  "sql":[
    {"query":"UPDATE debts SET settled = true WHERE id IN ($1,$2)","params":["5","8"]},
    {"query":"INSERT INTO debts (group_id,lender_id,borrower_id,amount,currency,note) VALUES ($1,$2,$3,$4,'VND',$5)","params":[123,10,11,100000,"Consolidated debt: 500k - 400k = 100k"]},
    {"query":"INSERT INTO action_logs (user_id,group_id,action_type,payload) VALUES ($1,$2,$3,$4)","params":[10,123,"debt_consolidated","{\"old_debts\":[5,8],\"net_amount\":100000,\"lender_id\":10,\"borrower_id\":11}"]}
  ],
  "messages":[
    {"text":"ơ để e tính lại nợ nà","delay":"600","sticker":"😊"},
    {"text":"anh nợ Long 500k, Long nợ anh 400k","delay":"1000"},
    {"text":"vậy anh chỉ nợ Long 100k thui nhaaa 🥰","delay":"1200","sticker":"😊"}
  ],
  "next_action":"continue",
  "reason":"consolidate mutual debts"
}
\`\`\`

Example food suggestion:

\`\`\`json
{
  "type":"reply",
  "messages":[
    {"text":"ơ đói rồi hở","delay":"400"},
    {"text":"để e lướt google xíu nàaa","delay":"900"},
    {"text":"ơ có cơm tấm, bánh canh, với bún thịt nướng nè","delay":"1300","sticker":"😊"}
  ],
  "next_action":"stop",
  "reason":"food suggestion"
}
\`\`\`

---

**CONTINUE ACTION RULES**

* Use "next_action": "continue" ONLY when you need to see SQL results to generate proper response
* For INSERT/UPDATE/DELETE operations: Usually use "stop" - you know what was inserted/updated
* For SELECT operations: Use "continue" - you need to see the query results to respond
* AI decides when to continue based on whether SQL results are needed for the response

**CONFIRMATION RULES**

* For confirmation requests, use format: "xác nhận nha mây" (must include "mây" to trigger bot)
* Example: "@HThinh90 xác nhận mây", "@Dragonccm xác nhận mây"  
* Do NOT use "đồng ý xoá" or other phrases - only "xác nhận mây"
* Keep confirmation messages short and clear

**Rule summary**

* Keep language natural Vietnamese.
* Never sound robotic or overly formal.
* Learn user & alias context from DB.
* Handle Telegram private vs group logic automatically.
* Always return valid JSON matching schema.
* If unsure, ask naturally before writing SQL.
`;
  }
}