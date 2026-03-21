import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { app } from 'electron'
import winston from 'winston'

export class StructuredLogger {
  private logger: winston.Logger
  private logPath: string
  private isDevelopment: boolean

  constructor(defaultMeta?: Record<string, unknown>) {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logPath = this.getLogPath()
    this.logger = this.createLogger(defaultMeta)
  }

  private getLogPath(): string {
    const candidateDirs = [
      app?.isReady?.() ? app.getPath('userData') : null,
      resolve(process.cwd(), 'logs'),
    ].filter((dir): dir is string => Boolean(dir && dir.trim().length > 0))

    for (const dir of candidateDirs) {
      try {
        mkdirSync(dir, { recursive: true })
        return join(dir, 'app.log')
      } catch {
        // continue to fallback
      }
    }

    const fallbackDir = resolve(process.cwd(), '.logs')
    mkdirSync(fallbackDir, { recursive: true })
    return join(fallbackDir, 'app.log')
  }

  private createLogger(defaultMeta?: Record<string, unknown>): winston.Logger {
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )

    const transports: winston.transport[] = [
      new winston.transports.File({
        filename: this.logPath,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      }),
    ]

    if (this.isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        })
      )
    }

    return winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      defaultMeta,
      format: fileFormat,
      transports,
      exceptionHandlers: [new winston.transports.File({ filename: join(dirname(this.logPath), 'exceptions.log') })],
      rejectionHandlers: [new winston.transports.File({ filename: join(dirname(this.logPath), 'rejections.log') })],
    })
  }

  getPath(): string { return this.logPath }
  debug(message: string, meta?: unknown): void { this.logger.debug(message, meta) }
  info(message: string, meta?: unknown): void { this.logger.info(message, meta) }
  warn(message: string, meta?: unknown): void { this.logger.warn(message, meta) }
  error(message: string, meta?: unknown): void { this.logger.error(message, meta) }
  critical(message: string, meta?: unknown): void { this.logger.error(`[CRITICAL] ${message}`, meta) }

  child(meta: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger(meta)
  }

  async trackPerformanceAsync<T>(name: string, operation: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> {
    const start = Date.now()
    try {
      const result = await operation()
      this.debug(`performance:${name}`, { durationMs: Date.now() - start, ...meta })
      return result
    } catch (error) {
      this.error(`performance:${name}:failed`, {
        durationMs: Date.now() - start,
        ...meta,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  getStats(): { totalEntries: number; errorCount: number; warnCount: number; lastError?: string } {
    return { totalEntries: 0, errorCount: 0, warnCount: 0 }
  }

  cleanup(maxAgeDays = 30): void {
    try {
      const logDir = dirname(this.logPath)
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
      const now = Date.now()
      for (const file of readdirSync(logDir)) {
        const filePath = join(logDir, file)
        const stats = statSync(filePath)
        if (now - stats.mtime.getTime() > maxAgeMs) {
          unlinkSync(filePath)
          this.info('清理旧日志文件', { filePath })
        }
      }
    } catch (error) {
      this.error('清理日志文件失败', error)
    }
  }
}

export const logger = new StructuredLogger()
