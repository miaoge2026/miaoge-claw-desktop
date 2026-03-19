import { createWriteStream, mkdirSync, join } from 'fs'
import { dirname, resolve } from 'path'
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
   * 修复Windows环境下路径为undefined的问题
   */
  private getLogPath(): string {
    try {
      // 尝试获取用户数据目录
      const userDataPath = process.userData
      
      // 验证路径是否为有效字符串
      if (typeof userDataPath === 'string' && userDataPath.trim().length > 0) {
        const logDir = join(userDataPath, 'logs')
        mkdirSync(logDir, { recursive: true })
        return join(logDir, 'app.log')
      }
      
      // 如果userData无效，使用备选路径
      console.warn('process.userData is invalid, using fallback path')
      
      // 使用应用目录作为备选
      const appDir = resolve(__dirname, '..', '..')
      const fallbackLogDir = join(appDir, 'logs')
      mkdirSync(fallbackLogDir, { recursive: true })
      return join(fallbackLogDir, 'app.log')
      
    } catch (error) {
      console.error('Failed to create log path:', error)
      
      // 最后的备选方案：使用当前工作目录
      const cwdLogDir = join(process.cwd(), 'logs')
      mkdirSync(cwdLogDir, { recursive: true })
      return join(cwdLogDir, 'app.log')
    }
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
        new winston.transports.File({ 
          filename: join(dirname(this.logPath), 'exceptions.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: join(dirname(this.logPath), 'rejections.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5
        })
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
    childLogger.logPath = this.logPath
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
    try {
      const fs = require('fs')
      const path = require('path')
      const logDir = dirname(this.logPath)
      
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir)
        const now = Date.now()
        const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
        
        files.forEach(file => {
          const filePath = path.join(logDir, file)
          const stats = fs.statSync(filePath)
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            fs.unlinkSync(filePath)
            this.logger.info(`清理旧日志文件: ${filePath}`)
          }
        })
      }
    } catch (error) {
      this.logger.error('清理日志文件失败:', error)
    }
  }
}

// 导出默认日志记录器实例
export const logger = new StructuredLogger()
