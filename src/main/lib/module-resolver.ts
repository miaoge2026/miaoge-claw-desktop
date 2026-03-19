/**
 * 模块解析器 - 修复Windows模块加载问题
 */

import { pathToFileURL } from 'url'
import { join, dirname } from 'path'
import { logger } from './logger'

export class ModuleResolver {
  private logger = logger.child({ component: 'ModuleResolver' })

  /**
   * 修复模块加载问题
   */
  static fixModuleLoading(): void {
    // 添加模块解析路径
    const appPath = process.resourcesPath
    const nodeModulesPath = join(appPath, 'node_modules')
    
    // 添加到NODE_PATH
    if (!process.env.NODE_PATH?.includes(nodeModulesPath)) {
      process.env.NODE_PATH = `${nodeModulesPath}${path.delimiter}${process.env.NODE_PATH || ''}`
    }

    // 修复@modelcontextprotocol/sdk加载
    this.fixModelContextProtocolSDK()
  }

  /**
   * 修复@modelcontextprotocol/sdk模块
   */
  private static fixModelContextProtocolSDK(): void {
    try {
      // 尝试从多个路径加载模块
      const modulePaths = [
        join(process.resourcesPath, 'node_modules', '@modelcontextprotocol', 'sdk'),
        join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk'),
        join(process.cwd(), 'node_modules', '@modelcontextprotocol', 'sdk')
      ]

      for (const modulePath of modulePaths) {
        try {
          const module = require(modulePath)
          logger.info(`成功加载@modelcontextprotocol/sdk从: ${modulePath}`)
          return module
        } catch (error) {
          logger.warn(`无法从 ${modulePath} 加载模块`)
        }
      }

      throw new Error('无法加载@modelcontextprotocol/sdk模块')
    } catch (error) {
      logger.error('模块加载失败:', error)
      throw error
    }
  }

  /**
   * 验证模块完整性
   */
  static validateModules(): string[] {
    const requiredModules = [
      '@modelcontextprotocol/sdk',
      'electron-updater',
      'express'
    ]

    const missingModules: string[] = []

    for (const moduleName of requiredModules) {
      try {
        require(moduleName)
        logger.info(`✓ ${moduleName} 已加载`)
      } catch (error) {
        logger.error(`✗ ${moduleName} 缺失`)
        missingModules.push(moduleName)
      }
    }

    return missingModules
  }
}
