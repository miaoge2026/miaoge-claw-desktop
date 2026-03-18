/**
 * Windows Compatibility Module
 * 提供Windows平台特定的兼容性检查和处理
 */

import { app, dialog } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger'

const execAsync = promisify(exec)

/**
 * Windows兼容性检查器
 */
export class WindowsCompatibilityChecker {
  private logger = logger.child({ component: 'WindowsCompat' })

  /**
   * 执行所有Windows兼容性检查
   */
  async performAllChecks(): Promise<{
    passed: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    // 1. 检查Windows版本
    const versionCheck = await this.checkWindowsVersion()
    if (!versionCheck.passed) {
      issues.push(versionCheck.issue)
      recommendations.push(versionCheck.recommendation)
    }

    // 2. 检查管理员权限
    const adminCheck = await this.checkAdminPrivileges()
    if (!adminCheck.passed) {
      issues.push(adminCheck.issue)
      recommendations.push(adminCheck.recommendation)
    }

    // 3. 检查运行库
    const runtimeCheck = await this.checkVCRedist()
    if (!runtimeCheck.passed) {
      issues.push(runtimeCheck.issue)
      recommendations.push(runtimeCheck.recommendation)
    }

    // 4. 检查图形驱动
    const graphicsCheck = await this.checkGraphicsDrivers()
    if (!graphicsCheck.passed) {
      issues.push(graphicsCheck.issue)
      recommendations.push(graphicsCheck.recommendation)
    }

    // 5. 检查磁盘空间
    const diskCheck = await this.checkDiskSpace()
    if (!diskCheck.passed) {
      issues.push(diskCheck.issue)
      recommendations.push(diskCheck.recommendation)
    }

    // 6. 检查防火墙
    const firewallCheck = await this.checkFirewall()
    if (!firewallCheck.passed) {
      issues.push(firewallCheck.issue)
      recommendations.push(firewallCheck.recommendation)
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
    }
  }

  /**
   * 检查Windows版本
   */
  async checkWindowsVersion(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      const { stdout } = await execAsync('wmic os get version /value')
      const version = stdout.match(/Version=(\d+\.\d+\.\d+)/)?.[1] || ''
      const major = parseInt(version.split('.')[0])

      if (major < 10) {
        return {
          passed: false,
          issue: `不支持的Windows版本: ${version}`,
          recommendation: '需要Windows 10或更高版本',
        }
      }

      this.logger.info(`Windows版本检查通过: ${version}`)
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.error('Windows版本检查失败', error)
      return {
        passed: false,
        issue: '无法检查Windows版本',
        recommendation: '请确保系统信息可用',
      }
    }
  }

  /**
   * 检查管理员权限
   */
  async checkAdminPrivileges(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      const { stdout } = await execAsync('net session')
      const hasAdmin = stdout.includes('命令成功完成')
      
      if (!hasAdmin) {
        return {
          passed: false,
          issue: '缺少管理员权限',
          recommendation: '请以管理员身份运行应用程序',
        }
      }

      this.logger.info('管理员权限检查通过')
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.error('管理员权限检查失败', error)
      return {
        passed: false,
        issue: '无法验证管理员权限',
        recommendation: '请以管理员身份运行应用程序',
      }
    }
  }

  /**
   * 检查Visual C++运行库
   */
  async checkVCRedist(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      // 检查VC++ 2015-2022运行库
      const { stdout } = await execAsync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /s'
      )
      
      const hasVCRedist = stdout.includes('Installed') && stdout.includes('14')
      
      if (!hasVCRedist) {
        return {
          passed: false,
          issue: '缺少Visual C++运行库',
          recommendation: '请安装Visual C++ 2015-2022运行库 (x64)',
        }
      }

      this.logger.info('VC++运行库检查通过')
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.warn('VC++运行库检查失败', {
        error: error instanceof Error ? error.message : String(error),
      })
      // 不阻止启动，只是警告
      return {
        passed: true,
        issue: '可能缺少VC++运行库',
        recommendation: '建议安装Visual C++ 2015-2022运行库 (x64)',
      }
    }
  }

  /**
   * 检查图形驱动
   */
  async checkGraphicsDrivers(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      const { stdout } = await execAsync('wmic path win32_VideoController get name /value')
      const hasGraphics = stdout.includes('Name=') && !stdout.includes('Standard VGA')
      
      if (!hasGraphics) {
        return {
          passed: false,
          issue: '图形驱动问题',
          recommendation: '请更新显卡驱动程序',
        }
      }

      this.logger.info('图形驱动检查通过')
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.error('图形驱动检查失败', error)
      return {
        passed: false,
        issue: '无法检查图形驱动',
        recommendation: '请确保显卡驱动已正确安装',
      }
    }
  }

  /**
   * 检查磁盘空间
   */
  async checkDiskSpace(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      const { stdout } = await execAsync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace /value')
      const freeSpace = parseInt(stdout.match(/FreeSpace=(\d+)/)?.[1] || '0')
      const freeSpaceGB = Math.floor(freeSpace / (1024 * 1024 * 1024))
      
      if (freeSpaceGB < 10) {
        return {
          passed: false,
          issue: `磁盘空间不足: 仅剩${freeSpaceGB}GB`,
          recommendation: '需要至少10GB可用空间',
        }
      }

      this.logger.info(`磁盘空间检查通过: ${freeSpaceGB}GB可用`)
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.error('磁盘空间检查失败', error)
      return {
        passed: true,
        issue: '无法检查磁盘空间',
        recommendation: '请确保有足够的磁盘空间',
      }
    }
  }

  /**
   * 检查防火墙
   */
  async checkFirewall(): Promise<{
    passed: boolean
    issue: string
    recommendation: string
  }> {
    if (process.platform !== 'win32') {
      return { passed: true, issue: '', recommendation: '' }
    }

    try {
      const { stdout } = await execAsync('netsh advfirewall show currentprofile')
      const firewallEnabled = stdout.includes('State ON')
      
      if (!firewallEnabled) {
        return {
          passed: true,
          issue: 'Windows防火墙已禁用',
          recommendation: '建议启用防火墙以获得更好的安全性',
        }
      }

      this.logger.info('防火墙检查通过')
      return { passed: true, issue: '', recommendation: '' }
    } catch (error) {
      this.logger.error('防火墙检查失败', error)
      return {
        passed: true,
        issue: '无法检查防火墙状态',
        recommendation: '请确保防火墙配置正确',
      }
    }
  }

  /**
   * 安装VC++运行库
   */
  async installVCRedist(): Promise<boolean> {
    try {
      // 下载并安装VC++运行库
      const downloadUrl = 'https://aka.ms/vs/17/release/vc_redist_x64.exe'
      const installerPath = `${app.getPath('temp')}/vc_redist_x64.exe`
      
      // 下载安装程序（简化版，实际应用中应该使用electron-dl）
      const { net } = require('electron')
      const fs = require('fs')
      const response = await net.request(downloadUrl)
      const data = await response.arrayBuffer()
      fs.writeFileSync(installerPath, Buffer.from(data))

      // 运行安装程序
      await execAsync(`"${installerPath}" /install /quiet /norestart`)
      
      this.logger.info('VC++运行库安装完成')
      return true
    } catch (error) {
      this.logger.error('VC++运行库安装失败', error)
      return false
    }
  }

  /**
   * 显示兼容性报告
   */
  async showCompatibilityReport(
    checks: Awaited<ReturnType<typeof this.performAllChecks>>
  ): Promise<void> {
    if (checks.passed) {
      return
    }

    const message = `
兼容性检查发现问题：

${checks.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

建议操作：

${checks.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

是否要继续启动应用程序？
    `

    const result = await dialog.showMessageBox({
      type: 'warning',
      title: '兼容性检查',
      message,
      buttons: ['是', '否'],
      defaultId: 1,
    })

    if (result.response === 1) {
      app.quit()
    }
  }
}

export const windowsCompat = new WindowsCompatibilityChecker()
