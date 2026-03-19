import { app, BrowserWindow, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { logger } from './lib/logger'
import { WindowsCompat } from './lib/windows-compat'
import { setupUpdater } from './lib/auto-updater'
import { setupPerformanceMonitor } from './lib/performance-monitor'

// 创建Windows兼容性处理实例
const windowsCompat = new WindowsCompat()

/**
 * 初始化Windows兼容性检查
 */
async function initializeWindowsCompat(): Promise<void> {
  if (process.platform !== 'win32') {
    return
  }

  try {
    // 检查并安装VC++运行库
    const vcppInstalled = await windowsCompat.checkAndInstallVCppRuntime()
    
    if (!vcppInstalled) {
      throw new Error('VC++运行库安装失败')
    }
    
    logger.info('✓ Windows兼容性检查通过')
    
    // 检查系统要求
    const sysCheck = await windowsCompat.checkSystemRequirements()
    if (!sysCheck.meetsRequirements) {
      const errorMessage = `系统要求不满足:\n${sysCheck.issues.join('\n')}`
      logger.warn(errorMessage)
      
      dialog.showErrorBox(
        '系统要求不满足',
        '请检查系统配置后再试。\n\n' + sysCheck.issues.join('\n')
      )
    }
  } catch (error) {
    logger.error('Windows兼容性检查失败:', error)
    
    // 显示友好的错误信息
    dialog.showErrorBox(
      '启动失败',
      '无法完成Windows兼容性检查。\n\n' +
      '可能的原因:\n' +
      '1. 没有管理员权限\n' +
      '2. 系统版本过低\n' +
      '3. 磁盘空间不足\n\n' +
      '请确保您有管理员权限，并检查系统要求后再试。'
    )
    
    throw error
  }
}

/**
 * 创建应用窗口
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 显示窗口时加载页面
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }
  })

  // 加载应用入口
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  
  // 设置菜单
  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu)
}

/**
 * 设置应用菜单
 */
function setupMenu(): void {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于喵哥Claw Desktop',
              message: '喵哥Claw Desktop v1.0.9',
              detail: '一个强大的AI智能体桌面应用。\n\n© 2026 喵哥Claw Desktop'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  try {
    // Windows系统特殊处理
    await initializeWindowsCompat()
    
    // 创建应用窗口
    createWindow()
    
    // 设置菜单
    setupMenu()
    
    // 设置自动更新
    setupUpdater()
    
    // 设置性能监控
    setupPerformanceMonitor()
    
    logger.info('✓ 应用初始化完成')
  } catch (error) {
    logger.error('应用初始化失败:', error)
    app.quit()
  }
}

// 应用启动入口
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.miaoge.claw.desktop')
  
  // 禁用GPU加速（某些系统需要）
  app.disableHardwareAcceleration()
  
  // 优化窗口创建
  app.on('browser-window-created', (_, window) => {
    optimizer.warmUp(CONTENT_PRELOAD_URL)
  })

  // 初始化应用
  initializeApp()
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS重新激活时创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error)
  
  dialog.showErrorBox(
    '程序错误',
    '发生了一个未预期的错误。\n\n' +
    `错误信息: ${error.message}\n\n` +
    '请重启应用，如果问题仍然存在，请联系技术支持。'
  )
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason, promise)
})
