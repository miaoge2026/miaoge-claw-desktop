import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { app } from 'electron'
import winston from 'winston'

type LogMeta = Record<string, unknown>

const LOG_FILENAME = 'app.log'
const EXCEPTIONS_FILENAME = 'exceptions.log'
const REJECTIONS_FILENAME = 'rejections.log'
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024
const MAX_LOG_FILES = 5


type LoggerOptions = { root?: winston.Logger; defaultMeta?: LogMeta; logDir?: string }

function isLoggerOptions(value: LogMeta | LoggerOptions | undefined): value is LoggerOptions {
  if (!value) return false
  return 'root' in value || 'defaultMeta' in value || 'logDir' in value
}

function serializeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    }
  }

  return { errorValue: String(error) }
}

function normalizeMeta(meta?: unknown): LogMeta | undefined {
  if (meta == null) return undefined
  if (meta instanceof Error) return serializeError(meta)
  if (typeof meta === 'object' && !Array.isArray(meta)) return meta as LogMeta
  return { value: meta }
}

function resolveLogDir(): string {
  const candidates = [
    app.isReady() ? join(app.getPath('userData'), 'logs') : null,
    resolve(process.cwd(), 'logs'),
    resolve(process.cwd(), '.logs'),
  ].filter((value): value is string => Boolean(value))

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true })
      return dir
    } catch {
      // try next candidate
    }
  }

  throw new Error('Unable to resolve a writable log directory.')
}

function createRootLogger(logDir: string, isDevelopment: boolean): winston.Logger {
  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  )

  const transports: winston.transport[] = [
    new winston.transports.File({
      filename: join(logDir, LOG_FILENAME),
      maxsize: MAX_LOG_FILE_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true,
    }),
  ]

  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
    )
  }

  return winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    transports,
    format: fileFormat,
    exceptionHandlers: [
      new winston.transports.File({ filename: join(logDir, EXCEPTIONS_FILENAME) }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: join(logDir, REJECTIONS_FILENAME) }),
    ],
  })
}

export class StructuredLogger {
  private readonly root: winston.Logger
  private readonly defaultMeta?: LogMeta
  private readonly logDir: string

  constructor(options?: LogMeta | LoggerOptions) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const normalizedOptions: LoggerOptions | undefined = isLoggerOptions(options)
      ? options
      : options
        ? { defaultMeta: options }
        : undefined

    this.logDir = normalizedOptions?.logDir ?? resolveLogDir()
    this.root = normalizedOptions?.root ?? createRootLogger(this.logDir, isDevelopment)
    this.defaultMeta = normalizedOptions?.defaultMeta
  }

  private write(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
    const normalizedMeta = normalizeMeta(meta)
    const mergedMeta = this.defaultMeta || normalizedMeta
      ? { ...this.defaultMeta, ...normalizedMeta }
      : undefined

    this.root.log({ level, message, ...mergedMeta })
  }

  getPath(): string {
    return join(this.logDir, LOG_FILENAME)
  }

  debug(message: string, meta?: unknown): void { this.write('debug', message, meta) }
  info(message: string, meta?: unknown): void { this.write('info', message, meta) }
  warn(message: string, meta?: unknown): void { this.write('warn', message, meta) }
  error(message: string, meta?: unknown): void { this.write('error', message, meta) }
  critical(message: string, meta?: unknown): void { this.write('error', `[CRITICAL] ${message}`, meta) }

  child(defaultMeta: LogMeta): StructuredLogger {
    return new StructuredLogger({ root: this.root, defaultMeta: { ...this.defaultMeta, ...defaultMeta }, logDir: this.logDir })
  }

  async trackPerformanceAsync<T>(name: string, operation: () => Promise<T>, meta?: LogMeta): Promise<T> {
    const startedAt = Date.now()
    try {
      const result = await operation()
      this.debug(`performance:${name}`, { ...meta, durationMs: Date.now() - startedAt, status: 'ok' })
      return result
    } catch (error) {
      this.error(`performance:${name}:failed`, {
        ...meta,
        durationMs: Date.now() - startedAt,
        status: 'failed',
        ...serializeError(error),
      })
      throw error
    }
  }

  cleanup(maxAgeDays = 30): void {
    try {
      if (!existsSync(this.logDir)) return
      const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
      for (const file of readdirSync(this.logDir)) {
        const filePath = join(this.logDir, file)
        const stats = statSync(filePath)
        if (!stats.isFile()) continue
        if (Date.now() - stats.mtime.getTime() <= cutoff) continue
        unlinkSync(filePath)
        this.info('清理旧日志文件', { filePath })
      }
    } catch (error) {
      this.error('清理日志文件失败', error)
    }
  }

  getStats(): { totalEntries: number; errorCount: number; warnCount: number; lastError?: string } {
    const directory = dirname(this.getPath())
    return {
      totalEntries: existsSync(directory) ? readdirSync(directory).length : 0,
      errorCount: 0,
      warnCount: 0,
    }
  }
}

export const logger = new StructuredLogger()
export const normalizeError = serializeError
