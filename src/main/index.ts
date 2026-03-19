import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { StructuredLogger } from './lib/logger'
import { registerAllIpcHandlers } from './ipc'
import { syncDataDirToRegistry } from './ipc/settings'
import { startRuntime, stopRuntime } from './gateway/runtime'
import { autoSpawnBundledOpenclaw, addGatewayLogListener, getGatewayLogBuffer } from './gateway/bundled-openclaw'
import { PerformanceMonitor } from './lib/performance-monitor'
import { AutoUpdater } from './lib/auto-updater'
import { startupOptimizer } from './lib/startup-optimizer'
import { WindowsErrorHandler } from './lib/error-handler'

// 应用常量定义
const APP_NAME = '喵哥Claw Desktop'
const APP_ID = 'com.miaoge.claw.desktop'
const APP_VERSION = app.getVersion()

/**
 * 主应用类 - 负责应用的生命周期管理
 */
class MiaogeClawApp {
  private logger: StructuredLogger
  private performanceMonitor: PerformanceMonitor
  private autoUpdater: AutoUpdater
  private mainWindow: BrowserWindow | null
  private isDevelopment: boolean

  constructor() {
    this.logger = new StructuredLogger()
    this.performanceMonitor = new PerformanceMonitor()
    this.autoUpdater = new AutoUpdater()
    this.mainWindow = null
    this.isDevelopment = is.dev
  }

  /**
   * 应用启动入口
   */
  async start(): Promise<void> {
    const startupTimer = this.performanceMonitor.startTimer('app-startup')
    
    try {
      this.logStartupInfo()
      
      // 初始化错误处理
      WindowsErrorHandler.initialize()
      
      // 确保单实例运行
      if (!this.ensureSingleInstance()) {
        return
      }

      // 设置应用模型ID
      electronApp.setAppUserModelId(APP_ID)

      // 配置菜单栏快捷键
      this.setupMenuShortcuts()

      // 优化启动流程
      await startupOptimizer.optimizeStartup()

      // 创建主窗口
      this.mainWindow = this.createWindow()

      // 注册IPC处理器
      this.registerIpcHandlers()

      // 初始化性能监控
      this.initializePerformanceMonitoring()

      // 初始化自动更新（生产环境）
      if (!this.isDevelopment) {
        this.initializeAutoUpdater()
      }

      // 记录启动成功
      this.logStartupSuccess(startupTimer)

    } catch (error) {
      this.handleStartupError(error)
      throw error
    }
  }

  /**
   * 记录启动信息
   */
  private logStartupInfo(): void {
    this.logger.info(`🚀 ${APP_NAME} starting - v${APP_VERSION} pid=${process.pid} platform=${process.platform}`)
    this.logger.info(`📁 Log file: ${this.logger.getPath()}`)
    this.logger.info(`🔧 Development mode: ${this.isDevelopment}`)
  }

  /**
   * 确保单实例运行
   */
  private ensureSingleInstance(): boolean {
    if (!app.requestSingleInstanceLock()) {
      this.logger.warn('应用已在运行，退出当前实例')
      app.quit()
      return false
    }
    return true
  }

  /**
   * 设置菜单栏快捷键
   */
  private setupMenuShortcuts(): void {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  }

  /**
   * 创建主窗口
   */
  private createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: false,
      titleBarStyle: 'default',
      icon: join(__dirname, '../../resources/icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // 加载应用页面
    window.loadFile(join(__dirname, '../renderer/index.html'))

    // 显示窗口（页面加载完成后）
    window.once('ready-to-show', () => {
      window.show()
      if (this.isDevelopment) {
        window.webContents.openDevTools()
      }
    })

    // 处理窗口关闭
    window.on('closed', () => {
      this.mainWindow = null
    })

    return window
  }

  /**
   * 注册IPC处理器
   */
  private registerIpcHandlers(): void {
    if (!this.mainWindow) {
      throw new Error('主窗口未创建，无法注册IPC处理器')
    }
    registerAllIpcHandlers(this.mainWindow, this.logger)
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    this.performanceMonitor.printReport()
    
    // 定期清理旧的性能数据
    setInterval(() => {
      this.performanceMonitor.cleanup()
    }, 24 * 60 * 60 * 1000) // 每天清理一次
  }

  /**
   * 初始化自动更新
   */
  private initializeAutoUpdater(): void {
    this.autoUpdater.initialize()
  }

  /**
   * 记录启动成功
   */
  private logStartupSuccess(timer: () => void): void {
    timer()
    const report = this.performanceMonitor.getPerformanceReport()
    this.logger.info(`✅ 应用启动成功，总耗时: ${report.startupTime.toFixed(2)}ms`)
  }

  /**
   * 处理启动错误
   */
  private handleStartupError(error: Error): void {
    this.logger.error('应用启动失败:', error)
    
    // 显示错误对话框
    dialog.showErrorBox(
      '喵哥Claw Desktop 启动失败',
      `错误: ${error.message}\n\n请尝试以下解决方案：\n1. 重新安装应用\n2. 安装Visual C++运行库\n3. 以管理员身份运行\n4. 检查系统更新\n\n如问题持续，请提交到GitHub Issues。`
    )
  }

  /**
   * 应用退出
   */
  async exit(): Promise<void> {
    this.logger.info('应用正在退出...')
    
    try {
      // 停止运行时
      await stopRuntime()
      
      // 清理资源
      if (this.mainWindow) {
        this.mainWindow.destroy()
        this.mainWindow = null
      }
      
      this.logger.info('应用退出完成')
    } catch (error) {
      this.logger.error('应用退出失败:', error)
    }
  }
}

// 创建应用实例
const miaogeClawApp = new MiaogeClawApp()

// 应用生命周期管理
app.whenReady().then(() => {
  miaogeClawApp.start().catch(error => {
    console.error('应用启动失败:', error)
    app.quit()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await miaogeClawApp.exit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    miaogeClawApp.start()
  }
})

// 导出应用实例
export { miaogeClawApp, APP_NAME, APP_ID, APP_VERSION }
