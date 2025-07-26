import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class DebugLogger {
  private logFile: string;
  
  constructor() {
    this.logFile = path.join(os.tmpdir(), 'shopping-app-debug.log');
    this.log('=== Debug Logger Initialized ===');
  }
  
  log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}`;
    
    if (data) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }
    
    logMessage += '\n';
    
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to debug log:', error);
    }
  }
  
  getLogPath(): string {
    return this.logFile;
  }
  
  clear(): void {
    try {
      fs.writeFileSync(this.logFile, '');
      this.log('=== Log Cleared ===');
    } catch (error) {
      console.error('Failed to clear debug log:', error);
    }
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();