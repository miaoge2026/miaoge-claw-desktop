import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { StructuredLogger } from './lib/logger'
import { windowsCompat } from './lib/windows-compat'
import { registerAllIpcHandlers } from './ipc'
import { syncDataDirToRegistry } from './ipc/settings'
import { startRuntime, stopRuntime } from './gateway/runtime'
import { autoSpawnBundledOpenclaw, addGatewayLogListener, getGatewayLogBuffer } from './gateway/bundled-process'
import { extractOpenClawIfNeeded, getExtractState, confirmUpgrade, skipUpgrade } from './openclaw-init'
import { migrateDataDirIfNeeded } from './lib/data-dir'
import { FIREWALL_RULE_NAME, APP_ID, APP_NAME } from '@shared/branding'
import { initAppUpdater, registerAppUpdaterHandlers } from './app-updater'
import { patchSettings } from './gateway/settings'

/**
 * Main Application Class for 喵哥Claw Desktop
 * Handles initialization, window management, and application lifecycle
 */
class MiaogeClawApp {
  private logger: StructuredLogger
  private mainWindow: BrowserWindow | null = null
  private isDataLocationSelected: boolean = false

  constructor() {
    this.logger = new StructuredLogger({ component: 'MiaogeClawApp' })
  }

  /**
   * Initialize and start the application
   */
  async start(): Promise<void> {
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

    // Windows compatibility check
    if (process.platform === 'win32') {
      this.logger.info('Performing Windows compatibility checks...')
      const compatResult = await windowsCompat.performAllChecks()
      if (!compatResult.passed) {
        this.logger.warn('Windows compatibility issues detected', {
          issues: compatResult.issues,
          recommendations: compatResult.recommendations,
        })
        await windowsCompat.showCompatibilityReport(compatResult)
      }
    }

    // Create main window
    this.mainWindow = this.createWindow()

    // Register IPC handlers
    this.registerIpcHandlers()

    // Check data location
    this.isDataLocationSelected = this.checkDataLocation()

    // Start initialization pipeline
    if (this.isDataLocationSelected) {
      this.logger.info('[Startup] dataLocationSelected=true, starting init pipeline immediately')
      await this.startInitPipeline()
    } else {
      this.logger.info('[Startup] dataLocationSelected=false, waiting for renderer to complete data location selection')
    }

    // Setup activate handler
    this.setupActivateHandler()

    // Initialize app updater
    initAppUpdater(this.mainWindow)
  }

  /**
   * Ensure only one instance is running
   */
  private ensureSingleInstance(): boolean {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      this.logger.info('Another instance is already running, quitting')
      app.quit()
      return false
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        this.logger.info('Second instance detected, focusing main window')
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore()
        }
        this.mainWindow.focus()
      }
    })

    return true
  }

  /**
   * Create and configure the main application window
   */
  private createWindow(): BrowserWindow {
    const iconPath = join(app.getAppPath(), 'resources', 'icon.ico')

    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      icon: iconPath,
      title: APP_NAME,
      // macOS: hiddenInset 保留原生交通灯按钮；Windows/Linux: 完全无边框
      ...(process.platform === 'darwin'
        ? { titleBarStyle: 'hiddenInset' as const }
        : { frame: false }),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      }
    })

    // Window controls IPC (for frameless windows on Windows/Linux)
    this.setupWindowControls(win)

    // Renderer console message handling in development
    this.setupRendererMonitoring(win)

    // External link handling
    win.webContents.setWindowOpenHandler((details) => {
      this.logger.debug('Opening external URL', { url: details.url })
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Load application
    this.loadApplication(win)

    return win
  }

  /**
   * Setup window control handlers for frameless windows
   */
  private setupWindowControls(win: BrowserWindow): void {
    if (process.platform !== 'darwin') {
      ipcMain.on('window:minimize', () => {
        this.logger.debug('Window minimize requested')
        win.minimize()
      })

      ipcMain.on('window:maximize', () => {
        this.logger.debug('Window maximize requested')
        if (win.isMaximized()) {
          win.unmaximize()
        } else {
          win.maximize()
        }
      })

      ipcMain.on('window:close', () => {
        this.logger.debug('Window close requested')
        win.close()
      })

      win.on('maximize', () => {
        if (!win.isDestroyed()) {
          win.webContents.send('window:maximized-changed', true)
        }
      })

      win.on('unmaximize', () => {
        if (!win.isDestroyed()) {
          win.webContents.send('window:maximized-changed', false)
        }
      })
    }
  }

  /**
   * Setup renderer process monitoring
   */
  private setupRendererMonitoring(win: BrowserWindow): void {
    if (is.dev) {
      win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
        if (level >= 2) { // 2=warning, 3=error
          this.logger.warn(`[Renderer] ${message} (${sourceId}:${line})`)
        }
      })

      win.on('ready-to-show', () => {
        win.show()
        // Uncomment for debugging
        // win.webContents.openDevTools()
      })
    } else {
      win.on('ready-to-show', () => {
        win.show()
      })
    }
  }

  /**
   * Load the application (dev server or packaged app)
   */
  private loadApplication(win: BrowserWindow): void {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.logger.info('Loading development server')
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.logger.info('Loading packaged application')
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  /**
   * Register all IPC handlers
   */
  private registerIpcHandlers(): void {
    // Register all feature IPC handlers
    registerAllIpcHandlers(ipcMain)
    registerAppUpdaterHandlers(ipcMain)

    // OpenClaw extract status
    ipcMain.handle('openclaw:extract-status', () => {
      return this.logger.trackPerformance('get_extract_status', () => getExtractState())
    })

    // OpenClaw upgrade confirmation
    ipcMain.handle('openclaw:upgrade-confirm', () => {
      this.logger.info('OpenClaw upgrade confirmed')
      confirmUpgrade()
    })

    ipcMain.handle('openclaw:upgrade-skip', () => {
      this.logger.info('OpenClaw upgrade skipped')
      skipUpgrade()
    })

    // Gateway logs
    ipcMain.handle('gateway:logs-get', () => {
      return this.logger.trackPerformance('get_gateway_logs', () => getGatewayLogBuffer())
    })

    // Data location handlers
    this.registerDataLocationHandlers()
  }

  /**
   * Register data location selection handlers
   */
  private registerDataLocationHandlers(): void {
    ipcMain.handle('data-location:need-select', () => {
      const selected = this.checkDataLocation()
      this.logger.debug('Data location selection needed?', { needed: !selected })
      return !selected
    })

    ipcMain.handle('data-location:choose', async () => {
      if (!this.mainWindow) {
        this.logger.error('No main window available for data location selection')
        return { ok: false }
      }

      return this.logger.trackPerformanceAsync('select_data_location', async () => {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: '选择数据存储目录',
          defaultPath: app.getPath('home'),
          properties: ['openDirectory', 'createDirectory'],
        })

        if (result.canceled || !result.filePaths[0]) {
          this.logger.info('Data location selection cancelled')
          return { ok: false }
        }

        const selectedDir = result.filePaths[0]
        this.logger.info('Data location selected', { path: selectedDir })

        try {
          patchSettings({ customDataDir: selectedDir, dataLocationSelected: true })
          syncDataDirToRegistry(selectedDir)
          this.isDataLocationSelected = true
          return { ok: true, dir: selectedDir }
        } catch (error) {
          this.logger.error('Failed to save data location', error)
          return { ok: false }
        }
      })
    })

    ipcMain.handle('data-location:use-default', () => {
      this.logger.info('Using default data location')
      try {
        patchSettings({ dataLocationSelected: true })
        this.isDataLocationSelected = true
        return { ok: true }
      } catch (error) {
        this.logger.error('Failed to set default data location', error)
        return { ok: false }
      }
    })

    ipcMain.handle('data-location:start-init', async () => {
      this.logger.info('Starting initialization pipeline from renderer')
      await this.startInitPipeline()
      return { ok: true }
    })
  }

  /**
   * Check if data location has been selected
   */
  private checkDataLocation(): boolean {
    try {
      const settingsFile = join(app.getPath('userData'), 'settings.json')
      if (!existsSync(settingsFile)) {
        return false
      }

      const settings = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>
      return settings.dataLocationSelected === true
    } catch (error) {
      this.logger.error('Error checking data location', error)
      return false
    }
  }

  /**
   * Setup activate handler for macOS
   */
  private setupActivateHandler(): void {
    app.on('activate', () => {
      this.logger.debug('App activated')
      if (BrowserWindow.getAllWindows().length === 0) {
        this.logger.info('No windows open, creating new window')
        this.mainWindow = this.createWindow()
      }
    })
  }

  /**
   * Start the initialization pipeline
   */
  private async startInitPipeline(): Promise<void> {
    try {
      this.logger.info('Starting initialization pipeline...')

      // Data migration (before extraction to avoid old location issues)
      this.logger.info('Step 1: Migrating data directory if needed')
      await this.logger.trackPerformanceAsync('migrate_data_dir', () => migrateDataDirIfNeeded())

      // Firewall rule + extraction (parallel)
      this.logger.info('Step 2: Setting up firewall rule and extracting OpenClaw (parallel)')
      await this.logger.trackPerformanceAsync('init_parallels', () =>
        Promise.all([
          this.ensureFirewallRule(),
          extractOpenClawIfNeeded(this.mainWindow, process.resourcesPath),
        ])
      )

      // Gateway process logs to renderer
      this.logger.info('Step 3: Setting up gateway log listener')
      addGatewayLogListener((line, isError) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('gateway:log', { line, isError })
        }
      })

      // Spawn bundled OpenClaw
      this.logger.info('Step 4: Spawning bundled OpenClaw')
      await this.logger.trackPerformanceAsync('spawn_openclaw', () => autoSpawnBundledOpenclaw())

      // Start runtime
      this.logger.info('Step 5: Starting runtime')
      const deviceIdentityPath = join(app.getPath('userData'), '.device-identity.json')
      startRuntime((event) => {
        this.handleGatewayEvent(event)
      }, deviceIdentityPath)

      this.logger.info('✅ Initialization pipeline completed successfully')
    } catch (error) {
      this.logger.error('❌ Initialization pipeline failed', error)
      throw error
    }
  }

  /**
   * Ensure Windows firewall rule is configured
   */
  private async ensureFirewallRule(): Promise<void> {
    if (process.platform !== 'win32') {
      return
    }

    const flagPath = join(app.getPath('userData'), '.firewall-rule-added')

    if (existsSync(flagPath)) {
      this.logger.debug('Firewall rule already configured')
      return
    }

    this.logger.info('Configuring Windows firewall rule')

    await new Promise<void>((resolve) => {
      const child = spawn('netsh', [
        'advfirewall', 'firewall', 'add', 'rule',
        `name=${FIREWALL_RULE_NAME}`,
        'dir=in',
        'action=allow',
        `program="${process.execPath}"`,
        'enable=yes',
        'protocol=TCP',
      ], {
        windowsHide: true,
        shell: true,
      })

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.info('Firewall rule added successfully')
          try {
            writeFileSync(flagPath, '1')
          } catch (error) {
            this.logger.error('Failed to write firewall rule flag', error)
          }
        } else {
          this.logger.warn('Failed to add firewall rule', { code })
        }
        resolve()
      })

      child.on('error', (error) => {
        this.logger.error('Error executing netsh command', error)
        resolve()
      })

      // Timeout protection: 5 seconds
      setTimeout(() => {
        try {
          child.kill()
        } catch {
          // Ignore if already closed
        }
        resolve()
      }, 5000)
    })
  }

  /**
   * Handle gateway events
   */
  private handleGatewayEvent(event: unknown): void {
    if (is.dev) {
      const evt = event as { type: string; event?: string; payload?: unknown }
      if (evt.type === 'gateway.event' && evt.event === 'chat') {
        const pl = evt.payload as Record<string, unknown> | null
        const msg = pl?.message as Record<string, unknown> | null
        this.logger.debug('[ChatEvent]', {
          state: pl?.state,
          role: msg?.role,
          contentType: typeof msg?.content,
          textType: typeof msg?.text,
          preview: JSON.stringify(msg?.content ?? msg?.text ?? '').slice(0, 80),
        })
      }
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('gateway:event', event)

      if (is.dev) {
        const evt = event as { type: string; event?: string }
        if (evt.type === 'gateway.event' && evt.event === 'chat') {
          this.logger.debug('[MainProcess] sent chat event to renderer', {
            webContentsId: this.mainWindow.webContents.id,
          })
        }
      }
    }
  }

  /**
   * Stop application and cleanup
   */
  async stop(): Promise<void> {
    this.logger.info('Shutting down application...')

    try {
      this.logger.info('Stopping runtime')
      await stopRuntime()
    } catch (error) {
      this.logger.error('Error stopping runtime', error)
    }

    if (process.platform !== 'darwin') {
      app.quit()
    }
  }
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  const app = new MiaogeClawApp()

  try {
    await app.start()
  } catch (error) {
    console.error('Failed to start application:', error)
    process.exit(1)
  }
}

// Handle window-all-closed event
app.on('window-all-closed', async () => {
  const logger = new StructuredLogger({ component: 'Shutdown' })
  logger.info('All windows closed, stopping application')

  try {
    const app = new MiaogeClawApp()
    await app.stop()
  } catch (error) {
    logger.error('Error during shutdown', error)
  }
})

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  const app = new MiaogeClawApp()
  await app.stop()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  const app = new MiaogeClawApp()
  await app.stop()
  process.exit(0)
})

// Start the application
main().catch((error) => {
  console.error('Application startup failed:', error)
  process.exit(1)
})
