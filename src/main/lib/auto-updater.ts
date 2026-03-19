import { BrowserWindow, dialog } from 'electron'
import { EventEmitter } from 'events'
import {
  autoUpdater as electronAutoUpdater,
  type ProgressInfo,
  type UpdateInfo
} from 'electron-updater'
import { logger, StructuredLogger } from './logger'

/**
 * 自动更新器
 * 提供自动检查、下载和安装更新的功能
 */
export class AutoUpdater extends EventEmitter {
  private logger: StructuredLogger
  private isEnabled: boolean
  private checkInterval: NodeJS.Timeout | null
  private updateCheckInterval: number
  private mainWindow: BrowserWindow | null
  private listenersRegistered: boolean

  constructor() {
    super()
    this.logger = logger.child({ component: 'AutoUpdater' })
    this.isEnabled = false
    this.checkInterval = null
    this.updateCheckInterval = 60 * 60 * 1000 // 1 小时检查一次
    this.mainWindow = null
    this.listenersRegistered = false
  }

  /**
   * 设置主窗口，用于弹出安装确认对话框
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
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

      if (!this.listenersRegistered) {
        this.setupEventListeners()
        this.listenersRegistered = true
      }

      this.isEnabled = true
      this.startUpdateChecks()

      this.logger.info('自动更新功能初始化完成')
      this.emit('initialized')
    } catch (error) {
      this.logger.error('自动更新初始化失败', { error })
      this.emit('error', error)
    }
  }

  /**
   * 配置更新器
   */
  private configureUpdater(): void {
    electronAutoUpdater.setFeedURL({
      provider: 'github',
      owner: 'miaoge2026',
      repo: 'miaoge-claw-desktop',
      private: false
    })

    electronAutoUpdater.logger = this.logger as never
    electronAutoUpdater.autoDownload = true
    electronAutoUpdater.autoInstallOnAppQuit = true
    electronAutoUpdater.allowPrerelease = true
    electronAutoUpdater.allowDowngrade = false
    electronAutoUpdater.channel = 'latest'
  }

  /**
   * 注册更新器事件
   */
  private setupEventListeners(): void {
    electronAutoUpdater.on('update-available', (info: UpdateInfo) => {
      this.logger.info('发现新版本', { version: info.version })
      this.emit('update-available', info)
      this.showUpdateNotification(info)
    })

    electronAutoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.logger.info('当前已是最新版本', { version: info.version })
      this.emit('update-not-available', info)
    })

    electronAutoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.logger.info('更新下载进度', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
      this.emit('download-progress', progress)
    })

    electronAutoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.logger.info('更新下载完成', { version: info.version })
      this.emit('update-downloaded', info)
      this.showInstallDialog(info)
    })

    electronAutoUpdater.on('error', (error: Error) => {
      this.logger.error('更新检查失败', { error })
      this.emit('error', error)
    })
  }

  /**
   * 启动定时检查
   */
  private startUpdateChecks(): void {
    this.checkForUpdates().catch((error) => {
      this.logger.error('首次检查更新失败', { error })
    })

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.checkForUpdates().catch((error) => {
        this.logger.error('定时检查更新失败', { error })
      })
    }, this.updateCheckInterval)

    this.logger.info('已启动定期更新检查', {
      intervalMinutes: this.updateCheckInterval / 1000 / 60
    })
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('自动更新未启用，跳过检查')
      return
    }

    this.logger.info('开始检查更新')
    await electronAutoUpdater.checkForUpdates()
  }

  /**
   * 手动检查更新
   */
  async manualCheckForUpdates(): Promise<void> {
    this.logger.info('手动检查更新')
    await this.checkForUpdates()
  }

  /**
   * 设置更新检查间隔
   */
  setUpdateCheckInterval(interval: number): void {
    if (interval < 5 * 60 * 1000) {
      throw new Error('更新检查间隔不能少于 5 分钟')
    }

    this.updateCheckInterval = interval

    if (this.isEnabled) {
      this.startUpdateChecks()
    }

    this.logger.info('更新检查间隔已更新', {
      intervalMinutes: interval / 1000 / 60
    })
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(info: UpdateInfo): void {
    this.logger.info('发现新版本，开始自动下载', {
      version: info.version
    })

    this.emit('notification', {
      title: '发现新版本',
      message: `版本 ${info.version} 可用，正在自动下载`,
      action: 'downloading'
    })
  }

  /**
   * 显示安装确认对话框
   */
  private showInstallDialog(info: UpdateInfo): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.logger.warn('主窗口不可用，跳过安装确认对话框')
      return
    }

    void dialog
      .showMessageBox(this.mainWindow, {
        type: 'question',
        buttons: ['立即安装', '稍后安装'],
        defaultId: 0,
        cancelId: 1,
        title: '更新已下载',
        message: `版本 ${info.version} 已下载完成，是否立即安装？`
      })
      .then((result) => {
        if (result.response === 0) {
          this.installUpdate()
        } else {
          this.logger.info('用户选择稍后安装更新')
        }
      })
      .catch((error: Error) => {
        this.logger.error('显示安装对话框失败', { error })
      })
  }

  /**
   * 安装更新
   */
  private installUpdate(): void {
    this.logger.info('准备安装更新')

    try {
      electronAutoUpdater.quitAndInstall()
    } catch (error) {
      this.logger.error('安装更新失败', { error })

      dialog.showErrorBox(
        '更新安装失败',
        `无法安装更新：${error instanceof Error ? error.message : String(error)}\n\n请手动下载并安装最新版本。`
      )

      this.emit('error', error)
    }
  }

  /**
   * 启用自动更新
   */
  enable(): void {
    if (this.isEnabled) return

    this.isEnabled = true
    this.startUpdateChecks()
    this.logger.info('自动更新已启用')
  }

  /**
   * 禁用自动更新
   */
  disable(): void {
    this.isEnabled = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.logger.info('自动更新已禁用')
  }

  /**
   * 查询状态
   */
  isAutoUpdateEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.disable()
    this.mainWindow = null
    this.removeAllListeners()
    this.logger.info('自动更新器已销毁')
  }
}

export const appAutoUpdater = new AutoUpdater()
