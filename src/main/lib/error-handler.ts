import { app, dialog } from 'electron'
import { EventEmitter } from 'events'
import { logger, normalizeError, StructuredLogger } from './logger'

export class WindowsErrorHandler extends EventEmitter {
  private readonly logger: StructuredLogger
  private errorCount = 0
  private registered = false

  constructor() {
    super()
    this.logger = logger.child({ component: 'WindowsErrorHandler' })
  }

  initialize(): this {
    if (this.registered) return this

    process.on('uncaughtException', (error) => {
      this.handleCriticalError(error, { source: 'uncaughtException' })
    })

    process.on('unhandledRejection', (reason) => {
      this.handleUnhandledRejection(reason)
    })

    this.registered = true
    this.logger.info('错误处理器初始化完成')
    return this
  }

  handleUnhandledRejection(reason: unknown): void {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    this.logger.error('未处理的 Promise 拒绝', normalizeError(error))
    this.emit('unhandled-rejection', error)
  }

  handleCriticalError(error: Error, context?: Record<string, unknown>): void {
    this.errorCount += 1

    this.logger.critical('关键错误', {
      ...context,
      count: this.errorCount,
      timestamp: new Date().toISOString(),
      ...normalizeError(error),
    })

    this.emit('critical-error', error)
    this.showErrorDialog(this.getUserFriendlyMessage(error))
    this.logEnvironment(error)
    this.logSuggestedActions(error)
  }

  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('module') || message.includes('sdk')) {
      return `模块加载失败：${error.message}\n\n请尝试重新安装应用或检查依赖是否完整。`
    }

    if (message.includes('vc') || message.includes('visual c++')) {
      return `VC++ 运行库缺失：${error.message}\n\n请先安装 VC++ 运行库后再重试。`
    }

    if (message.includes('permission') || message.includes('access')) {
      return `权限不足：${error.message}\n\n请尝试以管理员身份运行应用。`
    }

    return `启动失败：${error.message}\n\n如问题持续，请附上日志反馈。`
  }

  private showErrorDialog(message: string): void {
    try {
      dialog.showErrorBox('喵哥Claw Desktop 启动失败', message)
    } catch (error) {
      this.logger.error('显示错误对话框失败', error)
    }
  }

  private logEnvironment(error: Error): void {
    this.logger.error('错误详情', {
      ...normalizeError(error),
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    })
  }

  private logSuggestedActions(error: Error): void {
    const actions = [
      '检查安装包是否完整',
      '查看日志目录中的最新错误日志',
      'Windows 环境下确认 VC++ 运行库已安装',
      '重启应用并观察是否稳定复现',
    ]

    this.logger.info('建议的解决方案', {
      actions,
      errorMessage: error.message,
    })
  }

  getErrorStats(): { totalErrors: number; errorTypes: Record<string, number> } {
    return { totalErrors: this.errorCount, errorTypes: {} }
  }
}

export const errorHandler = new WindowsErrorHandler()
