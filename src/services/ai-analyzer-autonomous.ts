/**
 * AI Analyzer Service - Autonomous Agent Version
 * 
 * This version implements:
 * - Tool-based architecture
 * - Iterative tool calling loop
 * - Schema-agnostic operation
 * - Database as external memory
 */

import { 
  GoogleGenAI, 
  Type, 
  HarmBlockThreshold, 
  HarmCategory 
} from '@google/genai';
import type { TelegramMessage } from '../types/telegram';
import type { AIResponse } from '../types/ai-bot';
import type { DatabaseService } from './database';
import { allTools } from '../tools';
import { ToolExecutor } from '../tools/executor';
import { AUTONOMOUS_AGENT_PROMPT } from '../prompts/autonomous-agent';
import { ApiKeyManager } from './api-key-manager';

export class AIAnalyzerService {
  private genAI: GoogleGenAI;
  private toolExecutor: ToolExecutor;
  private apiKeyManager: ApiKeyManager | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private dbService: DatabaseService, databaseUrl?: string) {
    // If databaseUrl is provided, use ApiKeyManager with database backend
    if (databaseUrl) {
      this.apiKeyManager = new ApiKeyManager(databaseUrl);
      // Initialize async - will be awaited before first use
      this.initPromise = this.apiKeyManager.initialize().then(() => {
        console.log('✅ [AIAnalyzer] ApiKeyManager initialized with database');
      }).catch(error => {
        console.error('❌ [AIAnalyzer] Failed to initialize ApiKeyManager:', error);
        throw new Error('ApiKeyManager initialization failed - cannot proceed without API keys');
      });
    } else {
      throw new Error('DatabaseUrl is required for API key management');
    }
    
    this.toolExecutor = new ToolExecutor(dbService);
  }

  /**
   * Ensure ApiKeyManager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null; // Only wait once
    }
  }

  /**
   * Main entry point: Process message with tool calling loop
   */
  async analyzeAndExecuteWithMessages(
    userMessage: string,
    context: string,
    message?: TelegramMessage,
    ctx?: ExecutionContext
  ): Promise<AIResponse> {
    console.log('🤖 [AIAnalyzer] Starting autonomous agent loop...');

    // Ensure ApiKeyManager is initialized
    await this.ensureInitialized();

    try {
      // Build the initial prompt with context
      const fullPrompt = this.buildPromptWithContext(userMessage, context);

      // Execute tool calling loop
      const response = await this.toolCallingLoop(fullPrompt, message);

      // Save conversation
      if (message) {
        await this.saveToolBasedConversation(message, response);
      }

      return response;

    } catch (error: any) {
      console.error('❌ [AIAnalyzer] Error in autonomous agent:', error);
      return {
        messages: [
          { text: 'ơ e bị lỗi rồi 😢', delay: '800' },
          { text: 'thử lại được không nè', delay: '1000' }
        ],
        intent: 'error'
      };
    }
  }

  /**
   * Tool calling loop with Gemini function calling
   */
  private async toolCallingLoop(
    prompt: string,
    message?: TelegramMessage
  ): Promise<AIResponse> {
    const MAX_ITERATIONS = 10;
    let iteration = 0;

    // Initialize conversation history
    const conversationHistory: any[] = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    // Context for tool execution
    const toolContext = {
      userId: message ? await this.dbService.getUserId(message.from?.id || 0) : undefined,
      groupId: message && message.chat.type !== 'private' 
        ? await this.dbService.getGroupId(message.chat.id) 
        : null,
      userMessage: message?.text
    };

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`🔄 [AIAnalyzer] Tool loop iteration ${iteration}/${MAX_ITERATIONS}`);

      try {
        // Call Gemini with tools
        // Note: We don't use responseSchema here because it conflicts with tool calling
        // The model needs freedom to choose between calling tools or returning final response
        
        // Use ApiKeyManager if available, otherwise direct call
        const generateContent = async () => {
          return await this.genAI.models.generateContent({
            model: 'gemini-flash-latest',
            config: {
              thinkingConfig: {
                thinkingBudget: 0
              },
              safetySettings: this.getSafetyConfig(),
              systemInstruction: [{ text: AUTONOMOUS_AGENT_PROMPT }],
              tools: [{ functionDeclarations: allTools }]
            },
            contents: conversationHistory
          });
        };
        
        let result;
        if (this.apiKeyManager) {
          // Use ApiKeyManager with automatic retry
          result = await this.apiKeyManager.executeWithRetry(
            (client) => client.models.generateContent({
              model: 'gemini-flash-latest',
              config: {
                thinkingConfig: {
                  thinkingBudget: 0
                },
                safetySettings: this.getSafetyConfig(),
                systemInstruction: [{ text: AUTONOMOUS_AGENT_PROMPT }],
                tools: [{ functionDeclarations: allTools }]
              },
              contents: conversationHistory
            })
          );
        } else {
          // Direct call without key rotation
          result = await generateContent();
        }

        const candidate = result?.candidates?.[0];
        if (!candidate) {
          throw new Error('No candidate in response');
        }

        const content = candidate.content;
        
        // 📝 LOG: AI's full response
        console.log('\n=== AI RESPONSE ===');
        console.log('Role:', content?.role);
        console.log('Parts:', JSON.stringify(content?.parts, null, 2));
        
        const functionCalls = content?.parts?.filter((part: any) => part.functionCall);

        // If no function calls, we have a final response
        if (!functionCalls || functionCalls.length === 0) {
          console.log('✅ [AIAnalyzer] Final response received (no more tool calls)');
          
          // Extract the text response
          const textPart = content?.parts?.find((part: any) => part.text);
          if (textPart?.text) {
            console.log('\n📄 [AIAnalyzer] Final text response:');
            console.log(textPart.text);
            console.log('\n');
            return this.parseFinalResponse(textPart.text);
          }

          // Fallback if no text
          return {
            messages: [{ text: 'Xin lỗi, em chưa hiểu lắm 🥺', delay: '1000' }],
            intent: 'unknown'
          };
        }

        // Execute all function calls
        console.log(`\n🔧 [AIAnalyzer] Executing ${functionCalls.length} tool call(s)...`);
        
        // Add model's response with function calls to history
        if (content && content.parts) {
          conversationHistory.push({
            role: 'model',
            parts: content.parts
          });
        }

        // Execute tools and collect results
        const toolResults: any[] = [];
        for (const fcPart of functionCalls) {
          const fc = fcPart.functionCall;
          if (!fc || !fc.name) {
            console.warn('⚠️ [AIAnalyzer] Invalid function call, skipping');
            continue;
          }
          
          console.log(`\n🔧 [AIAnalyzer] === TOOL CALL: ${fc.name} ===`);
          console.log('📥 Arguments:', JSON.stringify(fc.args, null, 2));
          
          const result = await this.toolExecutor.executeTool(
            { name: fc.name, args: fc.args || {} },
            toolContext
          );

          console.log('📤 Result:', result.success ? '✅ Success' : '❌ Failed');
          console.log('📄 Content length:', result.content.length, 'chars');
          if (result.content.length < 500) {
            console.log('📄 Full content:', result.content);
          } else {
            console.log('📄 Content preview:', result.content.substring(0, 500) + '...');
          }

          toolResults.push({
            functionResponse: {
              name: fc.name,
              response: { content: result.content }
            }
          });
        }

        // Add tool results to conversation
        conversationHistory.push({
          role: 'user',
          parts: toolResults
        });

        console.log('\n✅ [AIAnalyzer] Tool results added to conversation');
        console.log('📊 Conversation history length:', conversationHistory.length, 'messages');
        console.log('='.repeat(80) + '\n');

      } catch (error: any) {
        console.error(`❌ [AIAnalyzer] Error in iteration ${iteration}:`, error);
        throw error;
      }
    }

    // Max iterations reached
    console.warn('⚠️ [AIAnalyzer] Max iterations reached');
    return {
      messages: [
        { text: 'ơ e bận quá rồi 😢', delay: '800' },
        { text: 'thử đơn giản hơn được hông', delay: '1200' }
      ],
      intent: 'max_iterations'
    };
  }

  /**
   * Parse the final text response from AI
   */
  private parseFinalResponse(text: string): AIResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(text);
      
      return {
        messages: parsed.messages || [{ text: text, delay: '1000' }],
        intent: parsed.type || 'reply'
      };
    } catch {
      // If not JSON, treat as plain text
      return {
        messages: [{ text: text, delay: '1000' }],
        intent: 'reply'
      };
    }
  }

  /**
   * Build prompt with context
   */
  private buildPromptWithContext(userMessage: string, context: string): string {
    return `
=== USER MESSAGE ===
${userMessage}

=== CONTEXT ===
${context}

Please process this request. Remember:
1. If you need database information, use tools to inspect schema first
2. Never assume the database structure
3. Use tools to read/write data
4. Respond in your natural Vietnamese style with appropriate messages
`;
  }

  /**
   * Save tool-based conversation to database
   */
  private async saveToolBasedConversation(
    message: TelegramMessage,
    aiResponse: AIResponse
  ): Promise<void> {
    try {
      const chatId = message.chat.id;

      // Save AI response messages
      if (aiResponse?.messages && Array.isArray(aiResponse.messages)) {
        for (const aiMsg of aiResponse.messages) {
          await this.dbService.executeSqlQuery(
            `INSERT INTO chat_messages (chat_id, sender, sender_tg_id, message_text, delay_ms, intent) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              chatId.toString(),
              'ai',
              null,
              aiMsg.text || '',
              parseInt(aiMsg.delay) || null,
              aiResponse.intent || 'unknown'
            ],
            {
              reason: 'Save AI response to chat history',
              userMessage: message.text
            }
          );
        }
        console.log(`💾 [AIAnalyzer] Saved ${aiResponse.messages.length} AI messages to chat history`);
      }
    } catch (error) {
      console.error('❌ [AIAnalyzer] Failed to save conversation:', error);
    }
  }

  /**
   * Safety configuration - Block nothing for open conversation
   */
  private getSafetyConfig(): any[] {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];
  }

  // ==========================================
  // LEGACY COMPATIBILITY METHODS
  // (Keep for backward compatibility)
  // ==========================================

  /**
   * Legacy method for simple text responses
   */
  async analyzeAndExecute(
    userMessage: string,
    context: string,
    message?: TelegramMessage
  ): Promise<AIResponse> {
    const result = await this.analyzeAndExecuteWithMessages(userMessage, context, message);
    
    // Convert messages to single response text
    const responseText = result.messages
      ?.map(msg => msg.text)
      .join(' ') || 'Xin lỗi, em chưa hiểu lắm.';

    return {
      response: responseText,
      intent: result.intent,
      sqlQuery: undefined,
      sqlParams: undefined
    };
  }
}
