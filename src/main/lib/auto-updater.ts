import { autoUpdater } from 'electron-updater'
import { logger } from './logger'
import { dialog, app } from 'electron'
import { EventEmitter } from 'events'

/**
 * 自动更新器
 * 提供自动检查、下载和安装更新的功能
 * 支持手动和自动更新模式
 */
export class AutoUpdater extends EventEmitter {
  private logger: StructuredLogger
  private isEnabled: boolean
  private checkInterval: NodeJS.Timeout | null
  private updateCheckInterval: number

  constructor() {
    super()
    this.logger = logger.child({ component: 'AutoUpdater' })
    this.isEnabled = false
    this.checkInterval = null
    this.updateCheckInterval = 60 * 60 * 1000 // 1小时检查一次
  }

  /**
   * 初始化自动更新
   */
  initialize(): void {
    if (this.isEnabled) {
      this.logger.warn('自动更新已初始化，跳过重复初始化')
      return
    }

    try {
      this.configureUpdater()
      this.setupEventListeners()
      this.startUpdateChecks()
      
      this.isEnabled = true
      this.logger.info('自动更新功能初始化完成')
      
      // 发送初始化完成事件
      this.emit('initialized')
    } catch (error) {
      this.logger.error('自动更新初始化失败:', error)
      this.emit('error', error)
    }
  }

  /**
   * 配置更新器
   */
  private configureUpdater(): void {
    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'miaoge2026',
      repo: 'miaoge-claw-desktop',
      private: false
    })

    // 配置日志
    autoUpdater.logger = this.logger
    autoUpdater.logger.transports.file.level = 'info'

    // 配置更新策略
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    autoUpdater.channel = 'latest'
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 更新可用事件
    autoUpdater.on('update-available', (info) => {
      this.logger.info('发现新版本:', info)
      this.emit('update-available', info)
      this.showUpdateNotification(info)
    })

    // 更新不可用事件
    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('当前已是最新版本:', info)
      this.emit('update-not-available', info)
    })

    // 错误事件
    autoUpdater.on('error', (err) => {
      this.logger.error('更新检查失败:', err)
      this.emit('error', err)
    })

    // 下载进度事件
    autoUpdater.on('download-progress', (progressObj) => {
      this.logger.info(`下载进度: ${progressObj.percent}%`)
      this.emit('download-progress', progressObj)
    })

    // 更新已下载事件
    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('更新下载完成:', info)
      this.emit('update-downloaded', info)
      this.showInstallDialog(info)
    })
  }

  /**
   * 启动定期更新检查
   */
  private startUpdateChecks(): void {
    // 立即检查一次
    this.checkForUpdates()

    // 设置定期检查
    this.checkInterval = setInterval(() => {
      this.checkForUpdates()
    }, this.updateCheckInterval)

    this.logger.info(`已启动定期更新检查，间隔: ${this.updateCheckInterval / 1000 / 60}分钟`)
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('自动更新未启用，无法检查更新')
      return
    }

    try {
      this.logger.info('开始检查更新...')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.logger.error('检查更新失败:', error)
      this.emit('error', error)
    }
  }

  /**
   * 手动检查更新
   */
  async manualCheckForUpdates(): Promise<void> {
    this.logger.info('手动检查更新')
    await this.checkForUpdates()
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(info: any): void {
    // 在实际应用中，这里会显示系统通知
    this.logger.info(`发现新版本 ${info.version}，开始自动下载...`)
    
    // 发送通知事件
    this.emit('notification', {
      title: '发现新版本',
      message: `版本 ${info.version} 可用`,
      action: 'downloading'
    })
  }

  /**
   * 显示安装对话框
   */
  private showInstallDialog(info: any): void {
    if (!this.mainWindow) {
      this.logger.warn('主窗口未创建，无法显示安装对话框')
      return
    }

    const dialogTitle = '更新已下载'
    const dialogMessage = `版本 ${info.version} 已下载完成，是否立即安装？`

    dialog.showMessageBox(this.mainWindow, {
      type: 'question',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      title: dialogTitle,
      message: dialogMessage
    }).then((result) => {
      if (result.response === 0) {
        // 用户选择立即安装
        this.installUpdate()
      } else {
        this.logger.info('用户选择稍后安装更新')
      }
    }).catch(error => {
      this.logger.error('显示安装对话框失败:', error)
    })
  }

  /**
   * 安装更新
   */
  private installUpdate(): void {
    this.logger.info('正在安装更新...')
    
    try {
      autoUpdater.quitAndInstall()
    } catch (error) {
      this.logger.error('安装更新失败:', error)
      this.emit('error', error)
      
      // 显示错误提示
      dialog.showErrorBox(
        '更新安装失败',
        `无法安装更新: ${error.message}\n\n请手动下载并安装最新版本。`
      )
    }
  }

  /**
   * 设置更新检查间隔
   */
  setUpdateCheckInterval(interval: number): void {
    if (interval < 5 * 60 * 1000) { // 最少5分钟
      throw new Error('更新检查间隔不能少于5分钟')
    }

    this.updateCheckInterval = interval
    
    // 重新设置定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.startUpdateChecks()
    }

    this.logger.info(`更新检查间隔已设置为: ${interval / 1000 / 60}分钟`)
  }

  /**
   * 启用自动更新
   */
  enable(): void {
    this.isEnabled = true
    this.logger.info('自动更新已启用')
  }

  /**
   * 禁用自动更新
   */
  disable(): void {
    this.isEnabled = false
    
    // 清除定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    this.logger.info('自动更新已禁用')
  }

  /**
   * 检查自动更新状态
   */
  isAutoUpdateEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.disable()
    this.removeAllListeners()
    this.logger.info('自动更新器已销毁')
  }
}

// 导出自动更新器实例
export const autoUpdater = new AutoUpdater()
