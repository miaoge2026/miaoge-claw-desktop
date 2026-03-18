/**
 * logger.ts — 主进程文件日志
 *
 * 日志文件位置：
 *   Windows: %APPDATA%\喵哥Claw\logs\main.log
 *   macOS:   ~/Library/Logs/喵哥Claw/main.log
 *
 * 超过 2MB 时自动轮转：main.log → main.log.old
 * 支持结构化日志、性能追踪和上下文信息
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const MAX_BYTES = 2 * 1024 * 1024  // 2 MB

let logPath: string | null = null

interface LogMeta {
  pid?: number
  platform?: string
  sessionId?: string
  agentId?: string
  method?: string
  [key: string]: unknown
}

/**
 * Performance tracker for measuring operation durations
 */
class PerformanceTracker {
  private start: number

  constructor(private operation: string) {
    this.start = Date.now()
  }

  end(success: boolean = true, error?: unknown): void {
    const duration = Date.now() - this.start
    const logger = new StructuredLogger({ operation })
    if (success) {
      logger.info(`${this.operation} completed in ${duration}ms`)
    } else {
      logger.error(`${this.operation} failed after ${duration}ms`, error)
    }
  }
}

/**
 * Enhanced logger with structured logging capabilities
 */
class StructuredLogger {
  private context: LogMeta

  constructor(context: LogMeta = {}) {
    this.context = {
      pid: process.pid,
      platform: process.platform,
      ...context,
    }
  }

  private formatMessage(level: string, msg: string, meta?: LogMeta): string {
    const now = new Date()
    const ts = now.toISOString().replace('T', ' ').slice(0, 23)
    const context = { ...this.context, ...meta }
    const contextStr = Object.keys(context).length > 0
      ? ` [${JSON.stringify(context)}]`
      : ''
    return `[${ts}] [${level}]${contextStr} ${msg}\n`
  }

  private write(level: string, msg: string, meta?: LogMeta): void {
    const line = this.formatMessage(level, msg, meta)

    try {
      const filePath = getLogPath()
      rotateIfNeeded(filePath)
      fs.appendFileSync(filePath, line, 'utf8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }

    // Always output to console in development
    if (process.env.NODE_ENV === 'development') {
      if (level === 'ERROR') {
        console.error(msg, meta || '')
      } else if (level === 'WARN') {
        console.warn(msg, meta || '')
      } else {
        console.log(msg, meta || '')
      }
    } else {
      // Production: only log errors and warnings to console
      if (level === 'ERROR') {
        console.error(msg, meta || '')
      } else if (level === 'WARN') {
        console.warn(msg, meta || '')
      }
    }
  }

  info(msg: string, meta?: LogMeta): void {
    this.write('INFO', msg, meta)
  }

  warn(msg: string, meta?: LogMeta): void {
    this.write('WARN', msg, meta)
  }

  error(msg: string, error?: Error | unknown, meta?: LogMeta): void {
    const errorMsg = error instanceof Error
      ? `${msg} - Error: ${error.message}`
      : error ? `${msg} - ${JSON.stringify(error)}` : msg

    const errorMeta = {
      ...meta,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    }

    this.write('ERROR', errorMsg, errorMeta)
  }

  debug(msg: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV === 'development') {
      this.write('DEBUG', msg, meta)
    }
  }

  /**
   * Track performance of synchronous operations
   */
  trackPerformance<T>(operation: string, fn: () => T, meta?: LogMeta): T {
    const tracker = new PerformanceTracker(operation)
    try {
      const result = fn()
      tracker.end(true)
      return result
    } catch (error) {
      tracker.end(false, error)
      throw error
    }
  }

  /**
   * Track performance of asynchronous operations
   */
  async trackPerformanceAsync<T>(operation: string, fn: () => Promise<T>, meta?: LogMeta): Promise<T> {
    const tracker = new PerformanceTracker(operation)
    try {
      const result = await fn()
      tracker.end(true)
      return result
    } catch (error) {
      tracker.end(false, error)
      throw error
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogMeta): StructuredLogger {
    return new StructuredLogger({ ...this.context, ...context })
  }

  /**
   * Get current logger context
   */
  getContext(): LogMeta {
    return { ...this.context }
  }
}

function getLogPath(): string {
  if (!logPath) {
    const dir = app.getPath('logs')
    fs.mkdirSync(dir, { recursive: true })
    logPath = path.join(dir, 'main.log')
  }
  return logPath
}

function rotateIfNeeded(filePath: string): void {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size > MAX_BYTES) {
      const oldPath = filePath + '.old'
      // Remove old backup if exists
      try {
        fs.unlinkSync(oldPath)
      } catch {
        // Ignore if old file doesn't exist
      }
      fs.renameSync(filePath, oldPath)
    }
  } catch {
    // 文件不存在则不需要轮转
  }
}

/**
 * Legacy logger interface for backward compatibility
 */
const legacyLogger = {
  info: (msg: string) => new StructuredLogger({}).info(msg),
  warn: (msg: string) => new StructuredLogger({}).warn(msg),
  error: (msg: string) => new StructuredLogger({}).error(msg),
  getPath: () => getLogPath(),
}

export { StructuredLogger, PerformanceTracker, legacyLogger }
export const logger = legacyLogger
