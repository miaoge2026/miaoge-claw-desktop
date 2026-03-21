import { StructuredLogger } from '../lib/logger'
import { registerIpcHandler } from './shared'
import type { IpcMain } from 'electron'
import { gw } from './gw'

const logger = new StructuredLogger({ component: 'CronIpcHandlers' })

export const registerCronHandlers = (ipcMain: IpcMain): void => {
  void registerIpcHandler(ipcMain, 'cron:list', logger, async (_event, _params) => gw('cron.list', {}))

  void registerIpcHandler(ipcMain, 'cron:add', logger, async (_event, params) => gw('cron.add', params))

  void registerIpcHandler(ipcMain, 'cron:update', logger, async (_event, params) => gw('cron.update', params))

  void registerIpcHandler(ipcMain, 'cron:remove', logger, async (_event, params) => gw('cron.remove', params))

  void registerIpcHandler(ipcMain, 'cron:run', logger, async (_event, params) => gw('cron.run', params))

  void registerIpcHandler(ipcMain, 'cron:runs', logger, async (_event, params) => gw('cron.runs', params))

  void registerIpcHandler(ipcMain, 'cron:status', logger, async (_event, _params) => gw('cron.status', {}))
}
