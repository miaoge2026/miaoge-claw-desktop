import { dialog, app } from 'electron'
import { logger } from './logger'
import { EventEmitter } from 'events'

/**
 * Windows错误处理器
 * 提供统一的错误捕获、处理和报告机制
 */
export class WindowsErrorHandler extends EventEmitter {
  private logger: StructuredLogger
  private isInitialized: boolean
  private errorCount: number

  constructor() {
    super()
    this.logger = logger.child({ component: 'WindowsErrorHandler' })
    this.isInitialized = false
    this.errorCount = 0
  }

  /**
   * 初始化错误处理
   */
  static initialize(): void {
    const errorHandler = new WindowsErrorHandler()
    errorHandler.setupErrorHandlers()
    errorHandler.isInitialized = true
    return errorHandler
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers(): void {
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      this.handleCriticalError(error)
    })

    // 捕获Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError(new Error(`未处理的Promise拒绝: ${reason}`))
    })

    // 捕获模块加载错误
    this.captureModuleErrors()

    // 捕获渲染进程错误
    this.captureRendererErrors()

    this.logger.info('错误处理器初始化完成')
  }

  /**
   * 处理关键错误
   */
  private handleCriticalError(error: Error): void {
    this.errorCount++
    
    this.logger.critical('关键错误:', {
      message: error.message,
      stack: error.stack,
      count: this.errorCount,
      timestamp: new Date().toISOString()
    })

    // 显示友好的错误提示
    const userMessage = this.getUserFriendlyMessage(error)
    this.showErrorDialog(userMessage)

    // 发送错误事件
    this.emit('critical-error', error)

    // 记录错误详情
    this.logErrorDetails(error)

    // 提供解决方案
    this.suggestSolutions(error)
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyMessage(error: Error): string {
    const errorMsg = error.message.toLowerCase()

    if (errorMsg.includes('module') || errorMsg.includes('sdk')) {
      return `模块加载失败: ${error.message}\n\n请尝试：\n1. 重新安装应用\n2. 运行VC++安装程序\n3. 检查系统更新`
    }

    if (errorMsg.includes('vc') || errorMsg.includes('visual c++')) {
      return `VC++运行库缺失: ${error.message}\n\n请运行vc_redist_install.bat安装运行库`
    }

    if (errorMsg.includes('permission') || errorMsg.includes('access')) {
      return `权限不足: ${error.message}\n\n请以管理员身份运行应用`
    }

    if (errorMsg.includes('window') || errorMsg.includes('gui')) {
      return `界面初始化失败: ${error.message}\n\n请检查显卡驱动和系统更新`
    }

    return `启动失败: ${error.message}\n\n如问题持续，请提交到GitHub Issues。`
  }

  /**
   * 显示错误对话框
   */
  private showErrorDialog(message: string): void {
    try {
      dialog.showErrorBox(
        '喵哥Claw Desktop 启动失败',
        message
      )
    } catch (dialogError) {
      this.logger.error('显示错误对话框失败:', dialogError)
    }
  }

  /**
   * 捕获模块加载错误
   */
  private captureModuleErrors(): void {
    const originalRequire = require

    // 包装require函数以捕获模块加载错误
    require = function(moduleName: string) {
      try {
        return originalRequire(moduleName)
      } catch (error) {
        logger.error(`模块加载失败: ${moduleName}`, error)
        throw error
      }
    } as NodeRequire
  }

  /**
   * 捕获渲染进程错误
   */
  private captureRendererErrors(): void {
    // 在实际应用中，这里会设置渲染进程错误捕获
    this.logger.info('渲染进程错误捕获已设置')
  }

  /**
   * 记录错误详情
   */
  private logErrorDetails(error: Error): void {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      version: app.getVersion(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      arch: process.arch,
      memoryUsage: process.memoryUsage()
    }

    this.logger.critical('错误详情:', errorDetails)
  }

  /**
   * 提供解决方案
   */
  private suggestSolutions(error: Error): void {
    const solutions = [
      '重新安装Visual C++运行库',
      '以管理员身份运行应用',
      '检查Windows系统更新',
      '暂时禁用防病毒软件',
      '重新下载安装包',
      '检查显卡驱动更新'
    ]

    this.logger.info('建议的解决方案:')
    solutions.forEach((solution, index) => {
      this.logger.info(`${index + 1}. ${solution}`)
    })
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number
    lastError?: Error
    errorTypes: Record<string, number>
  } {
    return {
      totalErrors: this.errorCount,
      errorTypes: {} // 在实际应用中会统计不同类型的错误
    }
  }

  /**
   * 清理错误处理器
   */
  destroy(): void {
    this.removeAllListeners()
    this.logger.info('错误处理器已销毁')
  }
}

// 导出错误处理器实例
export const errorHandler = new WindowsErrorHandler()
