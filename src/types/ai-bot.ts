/**
 * AI Bot specific types and interfaces
 */

export interface AIResponse {
  messages?: { text: string; delay: string }[];
  intent?: string;
  sqlQuery?: string;
  sqlParams?: any;
  response?: string;
}

export interface ProcessMessageResult {
  messages: { text: string; delay: string }[];
  intent: string;
  hasSQL: boolean;
}

export interface SQLExecutionContext {
  userId?: number;
  groupId?: number | null;
  reason?: string;
  userMessage?: string;
}

export interface ActionLogData {
  userId?: number;
  groupId?: number | null;
  actionType: string;
  payload: any;
}

export type ActionType = 
  | 'debt_creation' 
  | 'debt_payment' 
  | 'debt_deletion' 
  | 'debt_completion'
  | 'debt_created'
  | 'debt_settled'
  | 'payment_created'
  | 'confirmation_preference_created'
  | 'confirmation_preference_updated'
  | 'name_alias_created'
  | 'sql_error';

export interface AIConfig {
  thinkingBudget: number;
  responseMimeType: string;
  responseSchema: any;
  systemInstruction: Array<{ text: string }>;
}

export interface DebtInfo {
  lenderId: number;
  borrowerId: number;
  amount: number;
  currency?: string;
  note?: string;
}