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
 * All available tools for the AI agent
 */
export const allTools = [
  inspectSchemaTool,
  describeTableTool,
  listTablesTool,
  executeSqlTool
];

/**
 * Tool names for easy reference
 */
export const ToolNames = {
  INSPECT_SCHEMA: 'inspect_schema',
  DESCRIBE_TABLE: 'describe_table',
  LIST_TABLES: 'list_tables',
  EXECUTE_SQL: 'execute_sql'
} as const;
