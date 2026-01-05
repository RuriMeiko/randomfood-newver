/**
 * Tool Executor
 * 
 * Executes tool calls made by the AI agent
 * Returns results as structured data (never as user content)
 */

import type { DatabaseService } from '../services/database';
import { EmotionService, type EmotionalSignal } from '../services/emotion';
import { ToolNames } from './definitions';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  name: string;
  content: string;
  success: boolean;
}

export class ToolExecutor {
  private emotionService: EmotionService;

  constructor(
    private dbService: DatabaseService,
    emotionService?: EmotionService
  ) {
    this.emotionService = emotionService || new EmotionService(dbService);
  }

  /**
   * Execute a tool call and return the result
   */
  async executeTool(toolCall: ToolCall, context?: any): Promise<ToolResult> {
    const startTime = Date.now();
    console.log(`\n🔧 [ToolExecutor] ========================================`);
    console.log(`🔧 [ToolExecutor] Executing tool: ${toolCall.name}`);
    console.log(`🔧 [ToolExecutor] Args:`, JSON.stringify(toolCall.args, null, 2));
    console.log(`🔧 [ToolExecutor] Context:`, {
      userId: context?.userId,
      groupId: context?.groupId,
      userMessage: context?.userMessage?.substring(0, 50)
    });

    try {
      let result: any;

      switch (toolCall.name) {
        case ToolNames.INSPECT_SCHEMA:
          result = await this.dbService.inspectSchema();
          break;

        case ToolNames.DESCRIBE_TABLE:
          result = await this.dbService.describeTable(toolCall.args.table_name);
          break;

        case ToolNames.LIST_TABLES:
          result = await this.dbService.listTables();
          break;

        case ToolNames.EXECUTE_SQL:
          result = await this.dbService.executeToolSql(
            toolCall.args.query,
            toolCall.args.params || [],
            {
              userId: context?.userId,
              groupId: context?.groupId,
              reason: toolCall.args.reason,
              userMessage: context?.userMessage
            }
          );
          break;

        case ToolNames.ANALYZE_INTERACTION:
          const signal: EmotionalSignal = {
            valence: parseFloat(toolCall.args.valence) || 0,
            intensity: parseFloat(toolCall.args.intensity) || 0,
            target_emotions: toolCall.args.target_emotions || [],
            context: toolCall.args.context
          };
          
          const updateResult = await this.emotionService.updateFromInteraction(
            signal,
            context?.userTgId
          );
          
          result = {
            previous_state: updateResult.previous,
            updated_state: updateResult.updated,
            changes: updateResult.deltas,
            message: 'Emotional state updated successfully'
          };
          break;

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      const duration = Date.now() - startTime;
      console.log(`✅ [ToolExecutor] Tool executed successfully in ${duration}ms`);
      console.log(`📊 [ToolExecutor] Result size: ${content.length} chars`);
      if (content.length < 300) {
        console.log(`📄 [ToolExecutor] Full result:`, content);
      } else {
        console.log(`📄 [ToolExecutor] Result preview:`, content.substring(0, 300) + '...');
      }
      console.log(`🔧 [ToolExecutor] ========================================\n`);

      return {
        name: toolCall.name,
        content,
        success: true
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [ToolExecutor] Tool execution failed after ${duration}ms:`, error);
      console.log(`🔧 [ToolExecutor] ========================================\n`);

      return {
        name: toolCall.name,
        content: `Error: ${error.message}`,
        success: false
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeTools(toolCalls: ToolCall[], context?: any): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall, context);
      results.push(result);
    }

    return results;
  }
}
