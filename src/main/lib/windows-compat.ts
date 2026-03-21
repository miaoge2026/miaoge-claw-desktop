import { exec } from 'child_process'
import { existsSync } from 'fs'
import { join, parse } from 'path'
import { promisify } from 'util'
import { logger, normalizeError } from './logger'

const execAsync = promisify(exec)

async function queryDriveFreeSpace(targetPath: string): Promise<number | null> {
  if (process.platform !== 'win32') return null

  const root = parse(targetPath).root.replace(/\\$/, '')
  if (!root) return null

  try {
    const escaped = root.replace(/'/g, "''")
    const command = `powershell -NoProfile -Command "(Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='${escaped}'\").FreeSpace"`
    const { stdout } = await execAsync(command, { windowsHide: true, timeout: 10_000 })
    const bytes = Number.parseInt(stdout.trim(), 10)
    return Number.isFinite(bytes) ? bytes : null
  } catch {
    return null
  }
}

export class WindowsCompat {
  private readonly logger = logger.child({ component: 'WindowsCompat' })

  async isVCppRuntimeInstalled(): Promise<boolean> {
    if (process.platform !== 'win32') return true

    try {

            return
          }
          resolve(values ?? [])
        })
      })

      return items.some((item) => item.name === 'Installed' && item.value === '1')
    } catch (error) {
      this.logger.warn('检查 VC++ 运行库失败', normalizeError(error))
      return false
    }
  }

  async installVCppRuntimeSilently(): Promise<void> {
    if (process.platform !== 'win32') return

    const installerPath = join(process.resourcesPath, 'vc_redist', 'VC_redist.x64.exe')
    if (!existsSync(installerPath)) {
      throw new Error(`VC++ 安装包未找到: ${installerPath}`)
    }

    const command = `"${installerPath}" /install /quiet /norestart`
    try {
      const { stdout, stderr } = await execAsync(command, {
        windowsHide: true,
        timeout: 5 * 60 * 1000,
        env: { ...process.env },
      })
      this.logger.info('VC++ 运行库安装完成', { stdout: stdout.trim(), stderr: stderr.trim() || undefined })
    } catch (error) {

    }
  }

  async checkAndInstallVCppRuntime(): Promise<boolean> {
    if (process.platform !== 'win32') return true

    if (await this.isVCppRuntimeInstalled()) {
      this.logger.info('VC++ 运行库已安装')
      return true
    }

    this.logger.warn('检测到 VC++ 运行库缺失，准备安装')
    await this.installVCppRuntimeSilently()
    return this.isVCppRuntimeInstalled()
  }

  async checkSystemRequirements(): Promise<{ meetsRequirements: boolean; issues: string[] }> {
    if (process.platform !== 'win32') {
      return { meetsRequirements: true, issues: [] }
    }

    const os = await import('os')
    const issues: string[] = []
    const version = os.release()

    if (majorVersion < 10) {
      issues.push(`Windows 版本过低：${version}（需要 Windows 10+）`)
    }

    if (os.arch() !== 'x64') {
      issues.push(`系统架构不支持：${os.arch()}（需要 x64）`)
    }

    const totalMemGb = os.totalmem() / 1024 / 1024 / 1024
    if (totalMemGb < 4) {
      issues.push(`内存不足：${totalMemGb.toFixed(1)}GB（需要至少 4GB）`)
    }

    const freeBytes = await queryDriveFreeSpace(process.cwd())
    if (freeBytes != null) {
      const freeGb = freeBytes / 1024 / 1024 / 1024
      if (freeGb < 10) {
        issues.push(`磁盘空间不足：${freeGb.toFixed(1)}GB（建议至少 10GB）`)
      }

    }

    return { meetsRequirements: issues.length === 0, issues }
  }
}
