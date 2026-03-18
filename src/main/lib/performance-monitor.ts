/**
 * Performance Monitor Module
 * 提供应用性能监控和分析功能
 */

import { performance } from 'perf_hooks'
import { app } from 'electron'
import { logger } from './logger'

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

interface PerformanceReport {
  metrics: PerformanceMetric[]
  totalDuration: number
  averageDuration: number
  slowOperations: PerformanceMetric[]
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean
  private threshold: number // 毫秒

  constructor(options: { enabled?: boolean; threshold?: number } = {}) {
    this.enabled = options.enabled ?? (process.env.NODE_ENV === 'development')
    this.threshold = options.threshold ?? 1000 // 默认1秒
  }

  /**
   * 开始监控指标
   */
  start(name: string, metadata?: Record<string, unknown>): string {
    if (!this.enabled) return ''

    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    }

    this.metrics.set(id, metric)
    return id
  }

  /**
   * 结束监控指标
   */
  end(id: string): PerformanceMetric | undefined {
    if (!this.enabled) return undefined

    const metric = this.metrics.get(id)
    if (!metric) return undefined

    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime

    // 记录慢操作
    if (metric.duration > this.threshold) {
      logger.warn(`慢操作检测: ${metric.name}`, {
        duration: metric.duration,
        metadata: metric.metadata,
      })
    }

    return metric
  }

  /**
   * 监控异步操作
   */
  async monitorAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const id = this.start(name, metadata)
    try {
      const result = await fn()
      this.end(id)
      return result
    } catch (error) {
      this.end(id)
      throw error
    }
  }

  /**
   * 监控同步操作
   */
  monitorSync<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    const id = this.start(name, metadata)
    try {
      const result = fn()
      this.end(id)
      return result
    } catch (error) {
      this.end(id)
      throw error
    }
  }

  /**
   * 获取性能报告
   */
  getReport(): PerformanceReport {
    const completedMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.duration !== undefined
    ) as (PerformanceMetric & { duration: number })[]

    const totalDuration = completedMetrics.reduce(
      (sum, m) => sum + m.duration,
      0
    )
    const averageDuration = completedMetrics.length > 0 
      ? totalDuration / completedMetrics.length 
      : 0

    const slowOperations = completedMetrics.filter(
      (m) => m.duration > this.threshold
    )

    return {
      metrics: completedMetrics,
      totalDuration,
      averageDuration,
      slowOperations,
    }
  }

  /**
   * 生成性能报告并记录
   */
  generateReport(): void {
    const report = this.getReport()

    if (report.metrics.length === 0) {
      return
    }

    logger.info('性能报告', {
      totalOperations: report.metrics.length,
      totalDuration: report.totalDuration,
      averageDuration: report.averageDuration,
      slowOperations: report.slowOperations.length,
      slowOperationNames: report.slowOperations.map((m) => ({
        name: m.name,
        duration: m.duration,
      })),
    })

    // 如果有慢操作，记录详细警告
    if (report.slowOperations.length > 0) {
      logger.warn('检测到慢操作', {
        slowOperations: report.slowOperations.map((m) => ({
          name: m.name,
          duration: m.duration,
          metadata: m.metadata,
        })),
      })
    }
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * 获取特定指标
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return Array.from(this.metrics.values()).find((m) => m.name === name)
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 更新阈值
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }
}

// 性能监控装饰器
export function monitorPerformance(
  name?: string,
  metadata?: Record<string, unknown>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`

    if (originalMethod.constructor.name === 'AsyncFunction') {
      descriptor.value = async function (...args: any[]) {
        const monitor = new PerformanceMonitor()
        return monitor.monitorAsync(metricName, async () => {
          return originalMethod.apply(this, args)
        }, metadata)
      }
    } else {
      descriptor.value = function (...args: any[]) {
        const monitor = new PerformanceMonitor()
        return monitor.monitorSync(metricName, () => {
          return originalMethod.apply(this, args)
        }, metadata)
      }
    }

    return descriptor
  }
}

// 性能监控单例
export const performanceMonitor = new PerformanceMonitor({
  enabled: true,
  threshold: 1000,
})

// 全局性能监控
if (process.env.NODE_ENV === 'development') {
  // 监控关键启动阶段
  performanceMonitor.start('app_init')

  // 监控窗口创建事件（避免修改 BrowserWindow 原型导致不稳定行为）
  app.on('browser-window-created', () => {
    const metricId = performanceMonitor.start('window_create')
    if (metricId) {
      performanceMonitor.end(metricId)
    }
  })
}

export default performanceMonitor
