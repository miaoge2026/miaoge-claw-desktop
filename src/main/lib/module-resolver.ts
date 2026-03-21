

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const requireFromHere = createRequire(import.meta.url)

export class ModuleResolver {


  constructor() {
    this.logger = logger.child({ component: 'ModuleResolver' })
    this.searchPaths = this.initializeSearchPaths()
  }

  private initializeSearchPaths(): string[] {
    const candidates = [
      process.resourcesPath ? join(process.resourcesPath, 'node_modules') : null,
      join(__dirname, '..', '..', '..', 'node_modules'),
      join(process.cwd(), 'node_modules'),


    return [...new Set(candidates.filter((candidate) => existsSync(candidate)))]
  }

  fixModuleLoading(): void {


  resolveModule(moduleName: string): string | null {
    if (this.moduleCache.has(moduleName)) {
      return this.moduleCache.get(moduleName) ?? null
    }

    try {

    } catch (error) {
      this.logger.warn(`模块解析失败: ${moduleName}`, normalizeError(error))
      return null
    }
  }

  validateModules(requiredModules: string[] = ['@modelcontextprotocol/sdk', 'electron-updater', 'express']): string[] {
    const missingModules: string[] = []

    for (const moduleName of requiredModules) {
      const resolvedPath = this.resolveModule(moduleName)
      if (!resolvedPath) {
        missingModules.push(moduleName)
        continue
      }

      try {
        accessSync(resolvedPath, constants.R_OK)
      } catch (error) {
        this.logger.warn(`模块不可读: ${moduleName}`, normalizeError(error))
        missingModules.push(moduleName)
      }
    }

    return missingModules
  }

  async repairMissingModules(missingModules: string[]): Promise<boolean> {
    if (missingModules.length === 0) return true

    this.logger.warn('检测到缺失模块，但当前构建不执行自动修复', { missingModules })
    return false
  }

  getSearchPaths(): string[] {
    return [...this.searchPaths]
  }


  }

  clearCache(): void {
    this.moduleCache.clear()
  }

  getCacheInfo(): { cachedModules: string[]; cacheSize: number } {
    return {
      cachedModules: [...this.moduleCache.keys()],
      cacheSize: this.moduleCache.size,
    }
  }
}

export const moduleResolver = new ModuleResolver()
