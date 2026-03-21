import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import path from 'node:path'
import { StructuredLogger } from '../lib/logger'

export type IpcOkResult<T = unknown> = { ok: true; result?: T } & Record<string, unknown>
export type IpcErrorResult = { ok: false; error: string; details?: unknown }
export type IpcResult<T = unknown> = IpcOkResult<T> | IpcErrorResult

export const createValidationError = (error: string, details?: unknown): IpcErrorResult => ({
  ok: false,
  error,
  details: details ? { type: 'VALIDATION_ERROR', ...((details as Record<string, unknown>) ?? {}) } : { type: 'VALIDATION_ERROR' },
})

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const isSafeWorkspaceRelativePath = (value: string): boolean =>
  isNonEmptyString(value) && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes('..')

export async function registerIpcHandler<TParams = unknown, TResult = unknown>(
  ipcMain: IpcMain,
  channel: string,
  logger: StructuredLogger,
  handler: (event: IpcMainInvokeEvent, params: TParams) => Promise<IpcResult<TResult>> | IpcResult<TResult>,
): Promise<void> {
  ipcMain.handle(channel, async (event, params) => {
    return logger.trackPerformanceAsync(`ipc:${channel}`, async () => {
      return handler(event, params as TParams)
    })
  })
}
