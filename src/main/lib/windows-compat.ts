import { logger } from './logger'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

/**
 * Windows兼容性处理类
 * 负责处理Windows系统特有的兼容性问题
 * 包括VC++运行库检查、安装、系统验证等功能
 */
export class WindowsCompat {
  private logger = logger.child({ component: 'WindowsCompat' })

  /**
   * 检查VC++运行库是否已安装
   */
  async isVCppRuntimeInstalled(): Promise<boolean> {
    try {
      // 检查注册表
      const registry = require('winreg')
      return new Promise((resolve) => {
        registry({
          hive: registry.HKLM,
          key: 'SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64'
        }, (err: any, key: any) => {
          if (err) {
            resolve(false)
            return
          }
          
          key.values((err: any, items: any[]) => {
            if (err || items.length === 0) {
              resolve(false)
            } else {
              resolve(true)
            }
          })
        })
      })
    } catch (error) {
      this.logger.warn('检查VC++运行库失败:', error)
      return false
    }
  }

  /**
   * 静默安装VC++运行库
   */
  async installVCppRuntimeSilently(): Promise<void> {
    const installerPath = join(
      process.resourcesPath,
      'vc_redist',
      'VC_redist.x64.exe'
    )

    if (!existsSync(installerPath)) {
      throw new Error('VC++安装包未找到')
    }

    try {
      this.logger.info('开始静默安装VC++运行库...')
      
      // 静默安装参数
      const command = `"${installerPath}" /install /quiet /norestart`
      
      // 执行安装
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 300000, // 5分钟超时
        env: { ...process.env }
      })

      this.logger.info('VC++运行库安装输出:', stdout)
      if (stderr) {
        this.logger.warn('安装警告:', stderr)
      }

      this.logger.info('✓ VC++运行库安装完成')
    } catch (error) {
      this.logger.error('VC++运行库安装失败:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`VC++运行库安装失败: ${message}`)
    }
  }

  /**
   * 检查并安装VC++运行库
   */
  async checkAndInstallVCppRuntime(): Promise<boolean> {
    try {
      // 检查是否已安装
      const isInstalled = await this.isVCppRuntimeInstalled()
      
      if (isInstalled) {
        this.logger.info('✓ VC++运行库已安装')
        return true
      }

      this.logger.info('VC++运行库未安装，开始自动安装...')
      
      // 静默安装
      await this.installVCppRuntimeSilently()
      
      // 验证安装
      const verifyInstall = await this.isVCppRuntimeInstalled()
      if (!verifyInstall) {
        throw new Error('安装验证失败')
      }

      this.logger.info('✓ VC++运行库安装成功')
      return true
    } catch (error) {
      this.logger.error('VC++运行库处理失败:', error)
      return false
    }
  }

  /**
   * 检查系统要求
   */
  async checkSystemRequirements(): Promise<{
    meetsRequirements: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    // 检查Windows版本
    const os = require('os')
    const version = os.release()
    const majorVersion = parseInt(version.split('.')[0] ?? '0', 10)
    
    if (majorVersion < 10) {
      issues.push(`Windows版本过低: ${version} (需要Windows 10+)`)
    }

    // 检查架构
    const arch = os.arch()
    if (arch !== 'x64') {
      issues.push(`系统架构不支持: ${arch} (需要x64)`)
    }

    // 检查内存
    const totalMem = os.totalmem() / (1024 * 1024 * 1024) // GB
    if (totalMem < 4) {
      issues.push(`内存不足: ${totalMem.toFixed(1)}GB (需要4GB以上)`)
    }

    // 检查磁盘空间
    const fs = require('fs-extra')
    const appDir = process.cwd()
    try {
      const stats = await fs.stat(appDir)
      const freeSpace = stats.size / (1024 * 1024 * 1024) // GB
      if (freeSpace < 20) {
        issues.push(`磁盘空间不足: ${freeSpace.toFixed(1)}GB (需要20GB以上)`)
      }
    } catch (error) {
      this.logger.warn('检查磁盘空间失败:', error instanceof Error ? error.message : String(error))
    }

    return {
      meetsRequirements: issues.length === 0,
      issues
    }
  }
}
