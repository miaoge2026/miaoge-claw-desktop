import { performance } from 'perf_hooks'
import { logger } from './logger'

/**
 * 性能指标类型
 */
export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * 性能监控器
 * 提供应用性能指标收集和分析功能
 */
export class PerformanceMonitor {
  private logger: StructuredLogger
  private metrics: PerformanceMetric[]
  private operationStartTimes: Map<string, number>
  private isMonitoring: boolean
  private maxMetrics: number

  constructor() {
    this.logger = logger.child({ component: 'PerformanceMonitor' })
    this.metrics = []
    this.operationStartTimes = new Map()
    this.isMonitoring = false
    this.maxMetrics = 1000 // 最多保留1000条指标
  }

  /**
   * 初始化性能监控
   */
  initialize(): void {
    if (this.isMonitoring) {
      this.logger.warn('性能监控已初始化，跳过重复初始化')
      return
    }

    this.isMonitoring = true
    this.logger.info('性能监控功能已启用')

    // 记录启动时间
    this.recordMetric('app_startup', performance.now(), Date.now())
    
    // 设置定时清理
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 24 * 60 * 60 * 1000) // 每天清理一次
  }

  /**
   * 记录操作开始时间
   */
  startOperation(operationName: string): void {
    this.operationStartTimes.set(operationName, performance.now())
    this.logger.debug(`开始记录操作: ${operationName}`)
  }

  /**
   * 结束操作并记录耗时
   */
  endOperation(operationName: string, metadata?: Record<string, any>): void {
    const startTime = this.operationStartTimes.get(operationName)
    if (!startTime) {
      this.logger.warn(`操作 ${operationName} 未开始，无法记录结束时间`)
      return
    }

    const duration = performance.now() - startTime
    this.recordMetric(operationName, duration, Date.now(), metadata)
    
    // 清理开始时间记录
    this.operationStartTimes.delete(operationName)
    
    // 检查慢操作
    if (duration > 5000) { // 超过5秒
      this.logger.warn(`检测到慢操作: ${operationName} (${duration.toFixed(2)}ms)`)
    }
  }

  /**
   * 记录性能指标
   */
  private recordMetric(name: string, duration: number, timestamp: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp,
      metadata
    }

    this.metrics.push(metric)
    
    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift() // 移除最早的指标
    }

    this.logger.debug(`性能记录: ${name} - ${duration.toFixed(2)}ms`)
  }

  /**
   * 获取性能指标统计
   */
  getMetricsStats(timeRange?: {
    start: number
    end: number
  }): {
    totalOperations: number
    averageDuration: number
    slowOperations: number
    operationsByCategory: Record<string, number>
  } {
    let filteredMetrics = this.metrics
    
    // 按时间范围过滤
    if (timeRange) {
      filteredMetrics = this.metrics.filter(metric => 
        metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      )
    }

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowOperations: 0,
        operationsByCategory: {}
      }
    }

    const totalDuration = filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const slowOperations = filteredMetrics.filter(metric => metric.duration > 1000).length
    
    // 按操作名称分类统计
    const operationsByCategory: Record<string, number> = {}
    filteredMetrics.forEach(metric => {
      const category = metric.name.split('_')[0] || 'unknown'
      operationsByCategory[category] = (operationsByCategory[category] || 0) + 1
    })

    return {
      totalOperations: filteredMetrics.length,
      averageDuration: totalDuration / filteredMetrics.length,
      slowOperations,
      operationsByCategory
    }
  }

  /**
   * 获取最慢的操作
   */
  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * 获取操作耗时分布
   */
  getOperationDistribution(): Record<string, { count: number, avgDuration: number }> {
    const distribution: Record<string, { count: number, totalDuration: number }> = {}
    
    this.metrics.forEach(metric => {
      if (!distribution[metric.name]) {
        distribution[metric.name] = { count: 0, totalDuration: 0 }
      }
      distribution[metric.name].count++
      distribution[metric.name].totalDuration += metric.duration
    })

    // 转换为平均值
    const result: Record<string, { count: number, avgDuration: number }> = {}
    Object.keys(distribution).forEach(operation => {
      const { count, totalDuration } = distribution[operation]
      result[operation] = {
        count,
        avgDuration: totalDuration / count
      }
    })

    return result
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(daysToKeep: number = 7): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    const oldCount = this.metrics.length
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime)
    
    const removedCount = oldCount - this.metrics.length
    if (removedCount > 0) {
      this.logger.info(`已清理 ${removedCount} 条旧性能指标记录`)
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    timestamp: number
    totalOperations: number
    averageResponseTime: number
    slowOperationsCount: number
    recommendations: string[]
  } {
    const stats = this.getMetricsStats()
    const slowestOps = this.getSlowestOperations(5)
    
    const recommendations: string[] = []
    
    if (stats.averageDuration > 1000) {
      recommendations.push('平均响应时间较长，建议优化关键操作')
    }
    
    if (stats.slowOperations > stats.totalOperations * 0.1) {
      recommendations.push('慢操作比例较高，建议性能分析')
    }

    slowestOps.forEach(operation => {
      if (operation.duration > 5000) {
        recommendations.push(`优化慢操作: ${operation.name} (${operation.duration.toFixed(2)}ms)`)
      }
    })

    return {
      timestamp: Date.now(),
      totalOperations: stats.totalOperations,
      averageResponseTime: stats.averageDuration,
      slowOperationsCount: stats.slowOperations,
      recommendations
    }
  }

  /**
   * 重置性能监控
   */
  reset(): void {
    this.metrics = []
    this.operationStartTimes.clear()
    this.logger.info('性能监控已重置')
  }

  /**
   * 销毁性能监控
   */
  destroy(): void {
    this.isMonitoring = false
    this.metrics = []
    this.operationStartTimes.clear()
    this.logger.info('性能监控已销毁')
  }
}

// 创建性能监控器实例
const performanceMonitor = new PerformanceMonitor()

/**
 * 设置性能监控
 * 用于在应用启动时初始化性能监控功能
 */
export function setupPerformanceMonitor(): void {
  performanceMonitor.initialize()
}

/**
 * 获取性能监控器实例
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return performanceMonitor
}

/**
 * 记录操作开始（便捷函数）
 */
export function startPerfMeasurement(operationName: string): void {
  performanceMonitor.startOperation(operationName)
}

/**
 * 结束操作并记录（便捷函数）
 */
export function endPerfMeasurement(operationName: string, metadata?: Record<string, any>): void {
  performanceMonitor.endOperation(operationName, metadata)
}
