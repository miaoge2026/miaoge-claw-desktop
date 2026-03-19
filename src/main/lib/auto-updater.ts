/**
 * 自动更新功能
 * 检查新版本并自动下载安装
 */

import { autoUpdater } from 'electron-updater'
import { logger } from './logger'
import { dialog } from 'electron'

export class AutoUpdater {
  private logger = logger.child({ component: 'AutoUpdater' })

  constructor() {
    autoUpdater.logger = this.logger
    autoUpdater.logger.transports.file.level = 'info'
  }

  /**
   * 初始化自动更新
   */
  initialize(): void {
    this.logger.info('初始化自动更新功能')
    
    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'miaoge2026',
      repo: 'miaoge-claw-desktop'
    })

    // 监听更新事件
    this.setupEventListeners()
    
    // 检查更新
    this.checkForUpdates()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    autoUpdater.on('update-available', (info) => {
      this.logger.info('发现新版本:', info)
      this.showUpdateNotification(info)
    })

    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('当前已是最新版本:', info)
    })

    autoUpdater.on('error', (err) => {
      this.logger.error('更新检查失败:', err)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.logger.info(`下载进度: ${progressObj.percent}%`)
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('更新下载完成:', info)
      this.showInstallDialog(info)
    })
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
    }
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(info: any): void {
    // 在实际应用中，这里会显示系统通知
    this.logger.info(`发现新版本 ${info.version}，开始下载...`)
  }

  /**
   * 显示安装对话框
   */
  private showInstallDialog(info: any): void {
    // 在实际应用中，这里会显示安装确认对话框
    this.logger.info('更新下载完成，是否立即安装？')
    
    // 自动安装更新
    autoUpdater.quitAndInstall()
  }

  /**
   * 手动检查更新
   */
  async manualCheckForUpdates(): Promise<void> {
    await this.checkForUpdates()
  }
}

export const autoUpdater = new AutoUpdater()
