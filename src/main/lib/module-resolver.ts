import { delimiter, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { logger, StructuredLogger } from './logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 模块解析器
 * 负责解决Windows环境下模块加载路径问题
 * 提供模块搜索、验证和修复功能
 */
export class ModuleResolver {
  private logger: StructuredLogger
  private moduleCache: Map<string, unknown>
  private searchPaths: string[]

  constructor() {
    this.logger = logger.child({ component: 'ModuleResolver' })
    this.moduleCache = new Map()
    this.searchPaths = this.initializeSearchPaths()
    this.logger.info('模块解析器初始化完成')
  }

  /**
   * 初始化搜索路径
   */
  private initializeSearchPaths(): string[] {
    const paths = [
      // 应用资源路径
      join(process.resourcesPath, 'node_modules'),
      join(__dirname, '..', 'node_modules'),
      join(process.cwd(), 'node_modules'),
      
      // 系统模块路径
      ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(delimiter) : [])
    ]

    // 去重
    return [...new Set(paths)]
  }

  /**
   * 修复模块加载问题
   */
  fixModuleLoading(): void {
    try {
      // 添加模块搜索路径到NODE_PATH
      const nodeModulesPaths = this.searchPaths.join(delimiter)
      
      if (!process.env.NODE_PATH?.includes(nodeModulesPaths)) {
        process.env.NODE_PATH = `${nodeModulesPaths}${delimiter}${process.env.NODE_PATH || ''}`
        this.logger.info('已更新NODE_PATH环境变量')
      }

      // 修复@modelcontextprotocol/sdk加载
      this.fixModelContextProtocolSDK()
      
      this.logger.info('✓ 模块加载修复完成')
    } catch (error) {
      this.logger.error('模块加载修复失败:', error)
      throw error
    }
  }

  /**
   * 修复@modelcontextprotocol/sdk模块
   */
  private fixModelContextProtocolSDK(): void {
    try {
      // 尝试从多个路径加载模块
      const modulePaths = [
        join(process.resourcesPath, 'node_modules', '@modelcontextprotocol', 'sdk'),
        join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk'),
        join(process.cwd(), 'node_modules', '@modelcontextprotocol', 'sdk')
      ]

      let loadedModule: unknown = null
      
      for (const modulePath of modulePaths) {
        try {
          // 检查模块是否存在
          const fs = require('fs')
          if (fs.existsSync(modulePath)) {
            // 尝试加载模块
            loadedModule = require(modulePath)
            this.logger.info(`✓ 成功加载@modelcontextprotocol/sdk从: ${modulePath}`)
            break
          }
        } catch (error) {
          this.logger.warn(`无法从 ${modulePath} 加载模块:`, error)
        }
      }

      if (!loadedModule) {
        throw new Error('无法加载@modelcontextprotocol/sdk模块，请重新安装应用')
      }

      // 缓存加载的模块
      this.moduleCache.set('@modelcontextprotocol/sdk', loadedModule)
      
    } catch (error) {
      this.logger.error('@modelcontextprotocol/sdk模块加载失败:', error)
      throw error
    }
  }

  /**
   * 验证模块完整性
   */
  validateModules(): string[] {
    const requiredModules = [
      '@modelcontextprotocol/sdk',
      'electron-updater',
      'express'
    ]

    const missingModules: string[] = []

    for (const moduleName of requiredModules) {
      try {
        // 检查模块是否已缓存
        if (this.moduleCache.has(moduleName)) {
          this.logger.debug(`✓ ${moduleName} 已缓存`)
          continue
        }

        // 尝试加载模块
        const module = require(moduleName)
        this.moduleCache.set(moduleName, module)
        this.logger.debug(`✓ ${moduleName} 已加载`)
      } catch (error) {
        this.logger.error(`✗ ${moduleName} 缺失:`, error)
        missingModules.push(moduleName)
      }
    }

    return missingModules
  }

  /**
   * 尝试修复缺失的模块
   */
  async repairMissingModules(missingModules: string[]): Promise<boolean> {
    if (missingModules.length === 0) {
      return true
    }

    this.logger.warn(`尝试修复缺失的模块: ${missingModules.join(', ')}`)

    for (const moduleName of missingModules) {
      try {
        // 尝试重新安装模块
        await this.reinstallModule(moduleName)
        this.logger.info(`✓ 成功修复模块: ${moduleName}`)
      } catch (error) {
        this.logger.error(`无法修复模块 ${moduleName}:`, error)
        return false
      }
    }

    return true
  }

  /**
   * 重新安装模块
   */
  private async reinstallModule(moduleName: string): Promise<void> {
    // 在实际应用中，这里会重新下载和安装模块
    this.logger.info(`重新安装模块: ${moduleName}`)
    
    // 模拟重新安装
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 验证模块是否已安装
    try {
      require(moduleName)
      this.logger.info(`✓ 模块重新安装成功: ${moduleName}`)
    } catch (error) {
      throw new Error(`模块重新安装失败: ${moduleName}`)
    }
  }

  /**
   * 获取模块搜索路径
   */
  getSearchPaths(): string[] {
    return [...this.searchPaths]
  }

  /**
   * 添加自定义搜索路径
   */
  addSearchPath(searchPath: string): void {
    if (!this.searchPaths.includes(searchPath)) {
      this.searchPaths.push(searchPath)
      this.logger.info(`已添加搜索路径: ${searchPath}`)
    }
  }

  /**
   * 清除模块缓存
   */
  clearCache(): void {
    this.moduleCache.clear()
    this.logger.info('模块缓存已清除')
  }

  /**
   * 获取模块缓存信息
   */
  getCacheInfo(): {
    cachedModules: string[]
    cacheSize: number
  } {
    return {
      cachedModules: Array.from(this.moduleCache.keys()),
      cacheSize: this.moduleCache.size
    }
  }
}

// 导出模块解析器实例
export const moduleResolver = new ModuleResolver()
