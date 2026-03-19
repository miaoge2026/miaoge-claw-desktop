import { performance } from 'perf_hooks'
import { logger } from './logger'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceReport {
  totalMetrics: number
  averageDuration: number
  slowOperations: PerformanceMetric[]
  startupTime: number
  memoryUsage: NodeJS.MemoryUsage
}

/**
 * 性能监控器
 * 监控应用性能指标，提供性能分析和优化建议
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[]
  private logger: StructuredLogger
  private startTime: number
  private maxMetricsAge: number

  constructor() {
    this.metrics = []
    this.logger = logger.child({ component: 'PerformanceMonitor' })
    this.startTime = performance.now()
    this.maxMetricsAge = 24 * 60 * 60 * 1000 // 24小时
    this.logger.info('性能监控器初始化完成')
  }

  /**
   * 开始计时
   * 返回一个函数，调用时结束计时并记录指标
   */
  startTimer(name: string, metadata?: Record<string, any>): () => void {
    const start = performance.now()
    const timestamp = Date.now()
    
    const endTimer = () => {
      const duration = performance.now() - start
      this.recordMetric(name, duration, timestamp, metadata)
    }

    return endTimer
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, duration: number, timestamp: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp,
      metadata
    }

    this.metrics.push(metric)
    this.logger.debug(`性能记录: ${name} - ${duration.toFixed(2)}ms`, metadata)

    // 如果操作耗时过长，发出警告
    if (duration > 5000) {
      this.logger.warn(`慢操作警告: ${name} 耗时 ${duration.toFixed(2)}ms`, metadata)
    }

    // 限制指标数量，避免内存泄漏
    this.limitMetrics()
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration: value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    this.logger.debug(`自定义指标: ${name} - ${value}`, metadata)
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
    this.logger.debug(`性能记录: ${name} - ${duration.toFixed(2)}ms`, metadata)

    // 如果操作耗时过长，发出警告
    if (duration > 5000) {
      this.logger.warn(`慢操作警告: ${name} 耗时 ${duration.toFixed(2)}ms`, metadata)
    }

    // 限制指标数量，避免内存泄漏
    this.limitMetrics()
  }

  /**
   * 限制指标数量
   */
  private limitMetrics(): void {
    const maxMetrics = 10000 // 最多保留10000条指标
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics)
      this.logger.warn(`指标数量超过限制，已清理旧数据，当前数量: ${this.metrics.length}`)
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    const now = Date.now()
    const cutoff = now - this.maxMetricsAge
    
    // 过滤有效指标
    const validMetrics = this.metrics.filter(m => m.timestamp > cutoff)
    
    // 计算统计数据
    const totalDuration = validMetrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = validMetrics.length > 0 ? totalDuration / validMetrics.length : 0
    const slowOperations = validMetrics.filter(m => m.duration > 1000)
    const startupTime = performance.now() - this.startTime
    
    // 获取内存使用情况
    const memoryUsage = process.memoryUsage()
    
    return {
      totalMetrics: validMetrics.length,
      averageDuration,
      slowOperations,
      startupTime,
      memoryUsage
    }
  }

  /**
   * 导出性能数据
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2)
    }
    
    // CSV格式导出
    const headers = ['name', 'duration', 'timestamp', 'metadata']
    const rows = this.metrics.map(m => [
      m.name,
      m.duration,
      m.timestamp,
      JSON.stringify(m.metadata || {})
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * 清理旧的性能数据
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    const originalCount = this.metrics.length
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    
    const cleanedCount = originalCount - this.metrics.length
    this.logger.info(`清理性能数据: 清理了${cleanedCount}条旧数据，当前数量: ${this.metrics.length}`)
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
    
    // 内存使用信息
    const { heapUsed, heapTotal, external } = report.memoryUsage
    this.logger.info(`内存使用: ${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB`)
    this.logger.info(`外部内存: ${(external / 1024 / 1024).toFixed(2)}MB`)
    
    // 慢操作详情
    if (report.slowOperations.length > 0) {
      this.logger.warn('慢操作列表:')
      report.slowOperations.forEach(op => {
        this.logger.warn(`  - ${op.name}: ${op.duration.toFixed(2)}ms`)
      })
    }
    
    this.logger.info('=== 性能报告结束 ===')
  }

  /**
   * 获取特定操作的统计信息
   */
  getOperationStats(operationName: string): {
    count: number
    averageDuration: number
    minDuration: number
    maxDuration: number
  } {
    const operations = this.metrics.filter(m => m.name === operationName)
    
    if (operations.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0
      }
    }
    
    const durations = operations.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    
    return {
      count: operations.length,
      averageDuration: totalDuration / operations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    }
  }

  /**
   * 重置性能监控
   */
  reset(): void {
    this.metrics = []
    this.startTime = performance.now()
    this.logger.info('性能监控已重置')
  }
}

// 导出性能监控器实例
export const performanceMonitor = new PerformanceMonitor()
