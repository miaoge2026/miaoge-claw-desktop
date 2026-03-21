import { autoUpdater } from 'electron-updater'
import { logger, StructuredLogger } from './logger'
import { dialog } from 'electron'
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
   * 配置自动更新器
   */
  private configureUpdater(): void {
    // 配置自动更新器
    autoUpdater.logger = {
      info: (msg: string) => this.logger.info('[auto-updater] ' + msg),
      warn: (msg: string) => this.logger.warn('[auto-updater] ' + msg),
      error: (msg: string) => this.logger.error('[auto-updater] ' + msg),
      debug: (msg: string) => this.logger.debug('[auto-updater] ' + msg)
    }

    autoUpdater.fullChangelog = true
    autoUpdater.autoDownload = false // 手动下载
    autoUpdater.autoInstallOnAppQuit = true
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 检查更新可用
    autoUpdater.on('update-available', (info) => {
      this.logger.info('发现新版本:', info)
      this.emit('update-available', info)
      this.showUpdateNotification(info)
    })

    // 检查更新不可用
    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('没有可用更新:', info)
      this.emit('update-not-available', info)
    })

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      this.logger.info(`下载进度: ${progressObj.percent.toFixed(2)}%`)
      this.emit('download-progress', progressObj)
    })

    // 更新已下载
    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('更新已下载:', info)
      this.emit('update-downloaded', info)
      this.showInstallDialog(info)
    })

    // 错误处理
    autoUpdater.on('error', (err) => {
      this.logger.error('自动更新错误:', err)
      this.emit('error', err)
    })
  }

  /**
   * 启动更新检查
   */
  private startUpdateChecks(): void {
    // 立即检查一次
    this.checkForUpdates()
    
    // 设置定时检查
    this.checkInterval = setInterval(() => {
      this.checkForUpdates()
    }, this.updateCheckInterval)
    
    this.logger.info(`已设置定时更新检查，间隔: ${this.updateCheckInterval / 1000 / 60}分钟`)
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    try {
      this.logger.info('开始检查更新...')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.logger.error('检查更新失败:', error)
      this.emit('error', error)
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    try {
      this.logger.info('开始下载更新...')
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.logger.error('下载更新失败:', error)
      this.emit('error', error)
    }
  }

  /**
   * 安装更新
   */
  installUpdate(): void {
    this.logger.info('准备安装更新...')
    autoUpdater.quitAndInstall()
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(info: any): void {
    // 在实际应用中，这里会显示系统通知
    this.logger.info('显示更新通知:', info)
  }

  /**
   * 显示安装对话框
   */
  private showInstallDialog(info: any): void {
    dialog.showMessageBox({
      type: 'info',
      title: '更新已下载',
      message: '喵哥Claw Desktop 新版本已下载完成',
      detail: `版本 ${info.version} 已准备好安装。是否现在安装？`,
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        this.installUpdate()
      }
    })
  }

  /**
   * 停止更新检查
   */
  stopUpdateChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      this.logger.info('已停止定时更新检查')
    }
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.stopUpdateChecks()
    this.removeAllListeners()
    this.logger.info('自动更新器已销毁')
  }
}

// 创建自动更新器实例
const autoUpdaterInstance = new AutoUpdater()

/**
 * 设置自动更新
 * 用于在应用启动时初始化自动更新功能
 */
export function setupUpdater(): void {
  autoUpdaterInstance.initialize()
}

/**
 * 获取自动更新器实例
 */
export function getAutoUpdater(): AutoUpdater {
  return autoUpdaterInstance
}

/**
 * 手动检查更新
 */
export function checkUpdatesManually(): void {
  autoUpdaterInstance.checkForUpdates()
}
