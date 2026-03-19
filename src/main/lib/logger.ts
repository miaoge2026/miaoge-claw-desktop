import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import winston from 'winston'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 结构化日志记录器
 * 提供统一的日志记录接口，支持多级别日志和文件输出
 */
export class StructuredLogger {
  private logger: winston.Logger
  private logPath: string
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logPath = this.getLogPath()
    this.logger = this.createLogger()
  }

  /**
   * 获取日志文件路径
   */
  private getLogPath(): string {
    const logDir = join(process.userData, 'logs')
    mkdirSync(logDir, { recursive: true })
    return join(logDir, 'app.log')
  }

  /**
   * 创建Winston日志记录器
   */
  private createLogger(): winston.Logger {
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          stack,
          ...meta
        })
      })
    )

    const transports: winston.transport[] = [
      new winston.transports.File({
        filename: this.logPath,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    ]

    // 开发环境添加控制台输出
    if (this.isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      )
    }

    return winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      format,
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: join(dirname(this.logPath), 'exceptions.log') })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: join(dirname(this.logPath), 'rejections.log') })
      ]
    })
  }

  /**
   * 获取日志文件路径
   */
  getPath(): string {
    return this.logPath
  }

  /**
   * 记录调试日志
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta)
  }

  /**
   * 记录信息日志
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta)
  }

  /**
   * 记录警告日志
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta)
  }

  /**
   * 记录错误日志
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta)
  }

  /**
   * 记录严重错误日志
   */
  critical(message: string, meta?: any): void {
    this.logger.crit(message, meta)
  }

  /**
   * 创建子日志记录器
   */
  child(meta: Record<string, any>): StructuredLogger {
    const childLogger = new StructuredLogger()
    childLogger.logger = this.logger.child(meta)
    return childLogger
  }

  /**
   * 获取日志统计信息
   */
  getStats(): {
    totalEntries: number
    errorCount: number
    warnCount: number
    lastError?: string
  } {
    // 在实际应用中，这里会从日志文件读取统计信息
    return {
      totalEntries: 0,
      errorCount: 0,
      warnCount: 0
    }
  }

  /**
   * 清理旧日志文件
   */
  cleanup(maxAgeDays: number = 30): void {
    // 清理逻辑会在实际应用中实现
    this.info(`清理${maxAgeDays}天前的日志文件`)
  }
}

// 导出默认日志记录器实例
export const logger = new StructuredLogger()
