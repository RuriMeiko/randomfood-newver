/**
 * Tool Definitions for Autonomous AI Agent
 * 
 * These tools allow the AI to observe and interact with the database
 * without hardcoded schema knowledge in prompts.
 */

import { Type } from '@google/genai';

/**
 * Tool: inspect_schema
 * Returns all tables and their columns from the database
 * Uses PostgreSQL information_schema
 */
export const inspectSchemaTool = {
  name: 'inspect_schema',
  description: 'Inspects the database schema and returns all tables with their columns, data types, and constraints. Use this BEFORE querying or modifying data to understand the database structure.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: []
  }
};

/**
 * Tool: describe_table
 * Returns detailed information about a specific table
 */
export const describeTableTool = {
  name: 'describe_table',
  description: 'Returns detailed information about a specific table including columns, data types, nullable status, defaults, and foreign key relationships.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      table_name: {
        type: Type.STRING,
        description: 'Name of the table to describe'
      }
    },
    required: ['table_name']
  }
};

/**
 * Tool: list_tables
 * Returns a list of all tables in the database
 */
export const listTablesTool = {
  name: 'list_tables',
  description: 'Returns a simple list of all table names in the database. Use this for a quick overview.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: []
  }
};

/**
 * Tool: execute_sql
 * Executes a SQL query against the database
 */
export const executeSqlTool = {
  name: 'execute_sql',
  description: 'Executes a SQL query (SELECT, INSERT, UPDATE) against the database. Returns rows and rowCount. Use parameterized queries with $1, $2, etc. for safety.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The SQL query to execute. Use parameterized queries with $1, $2, etc.'
      },
      params: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: 'Parameters for the SQL query'
      },
      reason: {
        type: Type.STRING,
        description: 'Why this query is being executed (for logging)'
      }
    },
    required: ['query', 'params', 'reason']
  }
};

/**
 * Tool: analyze_interaction
 * Analyzes user interaction for emotional signals
 * LLM uses this to express how an interaction affects bot's emotions
 */
export const analyzeInteractionTool = {
  name: 'analyze_interaction',
  description: 'Analyzes a user interaction and generates emotional signals. Use this to update bot emotional state based on how the interaction made you feel. Returns updated emotional state.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      valence: {
        type: Type.NUMBER,
        description: 'Emotional valence: positive (0.0 to 1.0) or negative (-1.0 to 0.0). Example: compliment=0.7, insult=-0.8, neutral=0.0'
      },
      intensity: {
        type: Type.NUMBER,
        description: 'How strongly you feel about this (0.0 to 1.0). Example: mild=0.3, moderate=0.6, strong=0.9'
      },
      target_emotions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: 'Which emotions are affected. Available: joy, sadness, anger, fear, trust, disgust, affection, playfulness, neediness, hurt, warmth, excitement'
      },
      context: {
        type: Type.STRING,
        description: 'Brief context about why you feel this way (optional, for logging)'
      }
    },
    required: ['valence', 'intensity', 'target_emotions']
  }
};

/**
 * All available tools for the AI agent
 */
export const allTools = [
  inspectSchemaTool,
  describeTableTool,
  listTablesTool,
  executeSqlTool,
  analyzeInteractionTool
];

/**
 * Tool names for easy reference
 */
export const ToolNames = {
  INSPECT_SCHEMA: 'inspect_schema',
  DESCRIBE_TABLE: 'describe_table',
  LIST_TABLES: 'list_tables',
  EXECUTE_SQL: 'execute_sql',
  ANALYZE_INTERACTION: 'analyze_interaction'
} as const;
