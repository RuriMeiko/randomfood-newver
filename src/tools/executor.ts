/**
 * Tool Executor
 * 
 * Executes tool calls made by the AI agent
 * Returns results as structured data (never as user content)
 */

import type { DatabaseService } from '../services/database';
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
  constructor(private dbService: DatabaseService) {}

  /**
   * Execute a tool call and return the result
   */
  async executeTool(toolCall: ToolCall, context?: any): Promise<ToolResult> {
    console.log(`🔧 [ToolExecutor] Executing tool: ${toolCall.name}`);
    console.log(`🔧 [ToolExecutor] Args:`, JSON.stringify(toolCall.args, null, 2));

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

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      console.log(`✅ [ToolExecutor] Tool executed successfully:`, content.substring(0, 200));

      return {
        name: toolCall.name,
        content,
        success: true
      };

    } catch (error: any) {
      console.error(`❌ [ToolExecutor] Tool execution failed:`, error);

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
