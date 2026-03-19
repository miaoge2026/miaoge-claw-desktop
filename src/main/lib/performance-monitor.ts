/**
 * 性能监控功能
 * 监控应用性能指标
 */

import { performance } from 'perf_hooks'
import { logger } from './logger'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private logger = logger.child({ component: 'PerformanceMonitor' })
  private startTime: number

  constructor() {
    this.startTime = performance.now()
    this.logger.info('性能监控初始化')
  }

  /**
   * 开始计时
   */
  startTimer(name: string, metadata?: Record<string, any>): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(name, duration, metadata)
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    this.logger.debug(`性能记录: ${name} - ${duration.toFixed(2)}ms`, metadata)

    // 如果操作耗时过长，发出警告
    if (duration > 5000) {
      this.logger.warn(`慢操作警告: ${name} 耗时 ${duration.toFixed(2)}ms`, metadata)
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    totalMetrics: number
    averageDuration: number
    slowOperations: PerformanceMetric[]
    startupTime: number
  } {
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / this.metrics.length
    const slowOperations = this.metrics.filter(m => m.duration > 1000)
    const startupTime = performance.now() - this.startTime

    return {
      totalMetrics: this.metrics.length,
      averageDuration,
      slowOperations,
      startupTime
    }
  }

  /**
   * 导出性能数据
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * 清理旧的性能数据
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    const report = this.getPerformanceReport()
    
    this.logger.info('=== 性能报告 ===')
    this.logger.info(`总操作数: ${report.totalMetrics}`)
    this.logger.info(`平均耗时: ${report.averageDuration.toFixed(2)}ms`)
    this.logger.info(`启动时间: ${report.startupTime.toFixed(2)}ms`)
    this.logger.info(`慢操作数: ${report.slowOperations.length}`)
    
    if (report.slowOperations.length > 0) {
      this.logger.info('慢操作列表:')
      report.slowOperations.forEach(op => {
        this.logger.info(`  - ${op.name}: ${op.duration.toFixed(2)}ms`)
      })
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()
