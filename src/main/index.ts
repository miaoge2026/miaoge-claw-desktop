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

// ... 原有常量定义保持不变 ...

class MiaogeClawApp {
  private logger: StructuredLogger
  private performanceMonitor: PerformanceMonitor
  private autoUpdater: AutoUpdater
  private mainWindow: BrowserWindow | null

  constructor() {
    this.logger = new StructuredLogger()
    this.performanceMonitor = new PerformanceMonitor()
    this.autoUpdater = new AutoUpdater()
    this.mainWindow = null
  }

  async start(): Promise<void> {
    const endTimer = this.performanceMonitor.startTimer('app-startup')
    
    try {
      this.logger.info(`🚀 ${APP_NAME} starting - v${app.getVersion()} pid=${process.pid} platform=${process.platform}`)
      this.logger.info(`📁 Log file: ${this.logger.getPath()}`)

      // Single instance lock
      if (!this.ensureSingleInstance()) {
        return
      }

      // Setup app model ID
      electronApp.setAppUserModelId(APP_ID)

      // Setup menu bar shortcuts
      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
      })

      // Initialize startup optimizer
      await startupOptimizer.optimizeStartup()

      // Create main window
      this.mainWindow = this.createWindow()

      // Register IPC handlers
      registerAllIpcHandlers(this.mainWindow, this.logger)

      // Initialize performance monitoring
      this.performanceMonitor.printReport()

      // Initialize auto updater (in production)
      if (!is.dev) {
        this.autoUpdater.initialize()
      }

      // ... 原有代码保持不变 ...
    } catch (error) {
      this.logger.error('应用启动失败:', error)
      dialog.showErrorBox('启动失败', `应用启动失败: ${error.message}\n\n请查看日志文件或提交GitHub Issues。`)
      throw error
    } finally {
      endTimer()
    }
  }

  // ... 原有方法保持不变 ...
}

// ... 原有代码保持不变 ...
