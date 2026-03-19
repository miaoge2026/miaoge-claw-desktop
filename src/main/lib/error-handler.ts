/**
 * 错误处理器 - 增强Windows启动错误处理
 */

import { dialog, app } from 'electron'
import { logger } from './logger'

export class WindowsErrorHandler {
  private logger = logger.child({ component: 'WindowsErrorHandler' })

  /**
   * 初始化错误处理
   */
  static initialize(): void {
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
  }

  /**
   * 处理关键错误
   */
  private static handleCriticalError(error: Error): void {
    this.logger.error('关键错误:', error)

    // 显示友好的错误提示
    const errorMessage = this.getUserFriendlyMessage(error)

    dialog.showErrorBox(
      '喵哥Claw Desktop 启动失败',
      errorMessage
    )

    // 记录错误详情
    this.logErrorDetails(error)

    // 提供解决方案
    this.suggestSolutions(error)
  }

  /**
   * 获取用户友好的错误消息
   */
  private static getUserFriendlyMessage(error: Error): string {
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

    return `启动失败: ${error.message}\n\n如问题持续，请提交到GitHub Issues。`
  }

  /**
   * 捕获模块加载错误
   */
  private static captureModuleErrors(): void {
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
   * 记录错误详情
   */
  private static logErrorDetails(error: Error): void {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      version: app.getVersion(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    }

    logger.error('错误详情:', errorDetails)
  }

  /**
   * 提供解决方案
   */
  private static suggestSolutions(error: Error): void {
    const solutions = [
      '重新安装Visual C++运行库',
      '以管理员身份运行应用',
      '检查Windows系统更新',
      '暂时禁用防病毒软件',
      '重新下载安装包'
    ]

    logger.info('建议的解决方案:')
    solutions.forEach((solution, index) => {
      logger.info(`${index + 1}. ${solution}`)
    })
  }
}
