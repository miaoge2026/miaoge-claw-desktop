import { getRuntime } from '../gateway/runtime'
import { StructuredLogger } from '../lib/logger'

/**
 * Gateway request wrapper with enhanced error handling, retry logic, and telemetry
 */
export class GatewayClient {
  private logger = new StructuredLogger({ component: 'GatewayClient' })
  private maxRetries: number
  private retryDelay: number

  constructor(options: { maxRetries?: number; retryDelay?: number } = {}) {
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 1000
  }

  /**
   * Execute a gateway request with comprehensive error handling
   */
  async request<T>(
    method: string,
    params: unknown,
    options: {
      retry?: boolean
      timeout?: number
      idempotencyKey?: string
    } = {}
  ): Promise<{ ok: true; result: T } | { ok: false; error: string; details?: unknown }> {
    const {
      retry = true,
      timeout = 30000,
      idempotencyKey,
    } = options

    const meta = {
      method,
      paramsSize: params ? JSON.stringify(params).length : 0,
      idempotencyKey,
      retry,
      timeout,
    }

    return this.logger.trackPerformanceAsync(
      `gateway_request_${method}`,
      async () => {
        const adapter = getRuntime()
        if (!adapter) {
          this.logger.warn('Gateway not connected', { method })
          return { ok: false, error: 'Gateway not connected.', details: { method } }
        }

        try {
          const result = await this.executeWithRetry(
            () => adapter.request<T>(method, params),
            method,
            retry ? this.maxRetries : 0
          )
          return { ok: true, result }
        } catch (error) {
          return this.handleRequestError(error, method, params)
        }
      },
      meta
    )
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operation: string,
    retries: number
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        this.logger.warn(`Request failed, attempt ${attempt + 1}/${retries + 1}`, {
          operation,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        if (attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  /**
   * Handle request errors with detailed error mapping
   */
  private handleRequestError(
    error: unknown,
    method: string,
    params: unknown
  ): { ok: false; error: string; details?: unknown } {
    const baseMeta = { method, params }

    if (error instanceof Error) {
      this.logger.error('Gateway request failed', error, baseMeta)

      // Specific error handling for common scenarios
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
          ok: false,
          error: 'Request timeout. Please try again.',
          details: { type: 'TIMEOUT', method, params },
        }
      }

      if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        return {
          ok: false,
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          details: { type: 'RATE_LIMIT', method, params },
        }
      }

      if (error.message.includes('invalid') || error.message.includes('not found')) {
        return {
          ok: false,
          error: 'Invalid request: ' + error.message,
          details: { type: 'INVALID_REQUEST', method, params },
        }
      }

      return {
        ok: false,
        error: error.message,
        details: { type: 'UNKNOWN_ERROR', method, params, stack: error.stack },
      }
    }

    this.logger.error('Gateway request failed with unknown error', undefined, baseMeta)
    return {
      ok: false,
      error: 'Unknown error occurred.',
      details: { type: 'UNKNOWN_ERROR', method, params, error },
    }
  }

  /**
   * Health check for gateway connection
   */
  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now()
    try {
      const result = await this.request<string>('system.health', {}, { retry: false, timeout: 5000 })
      return { ok: result.ok, latency: Date.now() - start }
    } catch (error) {
      return { ok: false, latency: Date.now() - start }
    }
  }
}

/**
 * Legacy wrapper for backward compatibility
 */
export const gw = async <T>(
  method: string,
  params: unknown,
): Promise<{ ok: true; result: T } | { ok: false; error: string; details?: unknown }> => {
  const client = new GatewayClient()
  return client.request(method, params)
}
