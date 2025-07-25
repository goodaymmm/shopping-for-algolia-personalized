import { app } from 'electron'
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger
  private logFilePath: string
  private isInitialized = false

  private constructor() {
    // userDataディレクトリにログファイルを配置
    const userDataPath = app.getPath('userData')
    this.logFilePath = join(userDataPath, 'app-logs.txt')
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public initialize(): void {
    if (this.isInitialized) return

    try {
      // userDataディレクトリが存在しない場合は作成
      const userDataPath = app.getPath('userData')
      if (!existsSync(userDataPath)) {
        mkdirSync(userDataPath, { recursive: true })
      }

      // ログファイルを初期化（既存の場合は新しいセッションマーカーを追加）
      const sessionHeader = `\n\n=== New Session Started: ${new Date().toISOString()} ===\n`
      
      if (existsSync(this.logFilePath)) {
        appendFileSync(this.logFilePath, sessionHeader)
      } else {
        writeFileSync(this.logFilePath, `Shopping for Algolia personalized - Log File${sessionHeader}`)
      }

      this.isInitialized = true
      this.info('Logger', 'Logger initialized successfully', { logFilePath: this.logFilePath })

      // 元のconsole.logとconsole.errorをオーバーライドしてファイルにも出力
      this.overrideConsole()
      
    } catch (error) {
      console.error('Failed to initialize logger:', error)
    }
  }

  private overrideConsole(): void {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args: any[]) => {
      originalLog(...args)
      this.writeToFile(LogLevel.INFO, 'Console', args.join(' '))
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      this.writeToFile(LogLevel.ERROR, 'Console', args.join(' '))
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      this.writeToFile(LogLevel.WARN, 'Console', args.join(' '))
    }
  }

  private writeToFile(level: LogLevel, category: string, message: string, data?: any): void {
    if (!this.isInitialized) return

    try {
      const timestamp = new Date().toISOString()
      const levelString = LogLevel[level]
      let logEntry = `[${timestamp}] [${levelString}] [${category}] ${message}`
      
      if (data) {
        logEntry += ` | Data: ${JSON.stringify(data, null, 2)}`
      }
      
      logEntry += '\n'
      
      appendFileSync(this.logFilePath, logEntry)
    } catch (error) {
      // ログファイルへの書き込みが失敗してもアプリケーションを停止させない
      console.error('Failed to write to log file:', error)
    }
  }

  public debug(category: string, message: string, data?: any): void {
    this.writeToFile(LogLevel.DEBUG, category, message, data)
  }

  public info(category: string, message: string, data?: any): void {
    this.writeToFile(LogLevel.INFO, category, message, data)
  }

  public warn(category: string, message: string, data?: any): void {
    this.writeToFile(LogLevel.WARN, category, message, data)
  }

  public error(category: string, message: string, data?: any): void {
    this.writeToFile(LogLevel.ERROR, category, message, data)
  }

  public getLogFilePath(): string {
    return this.logFilePath
  }

  public clearLogs(): void {
    try {
      const header = `Shopping for Algolia personalized - Log File\n=== Logs Cleared: ${new Date().toISOString()} ===\n`
      writeFileSync(this.logFilePath, header)
      this.info('Logger', 'Log file cleared successfully')
    } catch (error) {
      this.error('Logger', 'Failed to clear log file', { error: (error as Error).message })
    }
  }
}