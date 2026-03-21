import { app, BrowserWindow, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { logger, normalizeError } from './lib/logger'
import { WindowsCompat } from './lib/windows-compat'
import { setupUpdater } from './lib/auto-updater'
import { setupPerformanceMonitor } from './lib/performance-monitor'
import { errorHandler } from './lib/error-handler'
import { moduleResolver } from './lib/module-resolver'

const windowsCompat = new WindowsCompat()
let mainWindow: BrowserWindow | null = null

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: '关于喵哥Claw Desktop',
              message: `喵哥Claw Desktop v${app.getVersion()}`,
              detail: '一个强大的 AI 智能体桌面应用。\n\n© 2026 喵哥Claw Desktop',
            })
          },
        },
      ],
    },
  ])
}

async function initializeWindowsEnvironment(): Promise<void> {
  if (process.platform !== 'win32') return

  const installed = await windowsCompat.checkAndInstallVCppRuntime()
  if (!installed) {
    throw new Error('VC++ 运行库安装或校验失败')
  }

  const requirementResult = await windowsCompat.checkSystemRequirements()
  if (!requirementResult.meetsRequirements) {
    logger.warn('Windows 系统要求未完全满足', { issues: requirementResult.issues })
    dialog.showErrorBox('系统要求提醒', requirementResult.issues.join('\n'))
  }
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  window.once('ready-to-show', () => {
    window.show()
    if (process.env.NODE_ENV === 'development') {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  })

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  void window.loadFile(join(__dirname, '../renderer/index.html'))
  optimizer.watchWindowShortcuts(window)
  return window
}

async function initializeApp(): Promise<void> {
  errorHandler.initialize()
  moduleResolver.fixModuleLoading()

  const missingModules = moduleResolver.validateModules()
  if (missingModules.length > 0) {
    logger.warn('检测到缺失模块', { missingModules, searchPaths: moduleResolver.getSearchPaths() })
  }

  await initializeWindowsEnvironment()
  Menu.setApplicationMenu(buildMenu())
  mainWindow = createMainWindow()
  setupUpdater()
  setupPerformanceMonitor()

  logger.info('应用初始化完成', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  })
}

function registerLifecycleEvents(): void {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
}

function registerProcessHandlers(): void {
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', normalizeError(error))
    errorHandler.handleCriticalError(error, { source: 'uncaughtException:main' })
  })

  process.on('unhandledRejection', (reason) => {
    errorHandler.handleUnhandledRejection(reason)
  })
}

async function bootstrap(): Promise<void> {
  const hasSingleInstanceLock = app.requestSingleInstanceLock()
  if (!hasSingleInstanceLock) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  await app.whenReady()
  electronApp.setAppUserModelId('com.miaoge.claw.desktop')
  app.disableHardwareAcceleration()

  registerLifecycleEvents()
  registerProcessHandlers()
  await initializeApp()
}

void bootstrap().catch((error) => {
  logger.error('应用初始化失败', normalizeError(error))
  dialog.showErrorBox('启动失败', error instanceof Error ? error.message : String(error))
  app.quit()
})
