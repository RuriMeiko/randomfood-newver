export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
  context?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: string = 'RandomFoodBot';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
      context: this.context,
    };
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const context = entry.context ? `[${entry.context}]` : '';
    
    let logMessage = `${timestamp} ${levelName} ${context} ${entry.message}`;
    
    if (entry.data) {
      logMessage += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    if (entry.error) {
      logMessage += `\nError: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return logMessage;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.logLevel) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, error);
    const formattedMessage = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  // Convenience methods for common patterns
  apiCall(method: string, url: string, data?: any): void {
    this.debug(`API Call: ${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    if (status >= 400) {
      this.error(`API Error: ${method} ${url} - Status ${status}`, undefined, data);
    } else {
      this.debug(`API Success: ${method} ${url} - Status ${status}`, data);
    }
  }

  dbQuery(operation: string, collection: string, data?: any): void {
    this.debug(`DB Query: ${operation} on ${collection}`, data);
  }

  dbError(operation: string, collection: string, error: Error, data?: any): void {
    this.error(`DB Error: ${operation} on ${collection}`, error, data);
  }

  commandExecuted(command: string, userId: string, success: boolean, duration?: number): void {
    const message = `Command ${command} executed by ${userId} - ${success ? 'Success' : 'Failed'}`;
    const data = { command, userId, success, duration };
    
    if (success) {
      this.info(message, data);
    } else {
      this.warn(message, data);
    }
  }

  userAction(action: string, userId: string, data?: any): void {
    this.info(`User Action: ${action} by ${userId}`, data);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any, p0?: { userId: string; aiResponseText: any; }) => logger.warn(message, data),
  error: (message: string, error?: Error, data?: any) => logger.error(message, error, data),
  
  // Specialized loggers
  api: {
    call: (method: string, url: string, data?: any) => logger.apiCall(method, url, data),
    response: (method: string, url: string, status: number, data?: any) => logger.apiResponse(method, url, status, data),
  },
  
  db: {
    query: (operation: string, collection: string, data?: any) => logger.dbQuery(operation, collection, data),
    error: (operation: string, collection: string, error: Error, data?: any) => logger.dbError(operation, collection, error, data),
  },
  
  command: {
    executed: (command: string, userId: string, success: boolean, duration?: number) => 
      logger.commandExecuted(command, userId, success, duration),
  },
  
  user: {
    action: (action: string, userId: string, data?: any) => logger.userAction(action, userId, data),
  },
};