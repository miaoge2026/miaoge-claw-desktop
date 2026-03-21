declare module 'ws' {
  type ErrorCallback = (error?: Error | null) => void
  class WebSocket {
    static readonly OPEN: number
    readonly readyState: number
    constructor(url: string)
    once(event: 'close', listener: () => void): this
    on(event: string, listener: (...args: any[]) => void): this
    send(data: string, cb?: ErrorCallback): void
    close(code?: number, reason?: string): void
    terminate(): void
  }
  export { WebSocket }
}
