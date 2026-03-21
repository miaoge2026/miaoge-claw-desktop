import type { IpcMain } from 'electron'
import { GatewayClient } from './gw'
import { StructuredLogger } from '../lib/logger'
import { createValidationError, isNonEmptyString, registerIpcHandler } from './shared'

/**
 * Chat IPC handlers with enhanced error handling, validation, and telemetry
 */
export class ChatIpcHandlers {
  private logger = new StructuredLogger({ component: 'ChatIpcHandlers' })
  private gatewayClient: GatewayClient

  constructor(options: { maxRetries?: number; retryDelay?: number } = {}) {
    this.gatewayClient = new GatewayClient(options)
  }

  /**
   * Register all chat-related IPC handlers
   */
  register(ipcMain: IpcMain): void {
    // Send a message to an agent
    void registerIpcHandler(ipcMain, 'chat:send', this.logger, async (_event, params) => {
      const { agentId, message, sessionKey, idempotencyKey, attachments } = params as {
        agentId: string
        message: string
        sessionKey: string
        idempotencyKey: string
        attachments?: Array<{ type: string; mimeType: string; content: string }>
      }

      return this.logger.trackPerformanceAsync(
        `chat_send_${sessionKey}`,
        async () => {
          // Input validation
          if (!isNonEmptyString(sessionKey) || !isNonEmptyString(message) || !isNonEmptyString(idempotencyKey)) {
            this.logger.warn('Invalid chat.send parameters', { agentId, sessionKey, hasMessage: !!message, hasIdempotencyKey: !!idempotencyKey })
            return createValidationError('Missing required parameters: sessionKey, message, and idempotencyKey are required.')
          }

          // Validate attachment size (max 50MB total)
          const totalAttachmentSize = attachments?.reduce((sum, att) => sum + (att.content?.length || 0), 0) || 0
          if (totalAttachmentSize > 50 * 1024 * 1024) {
            return createValidationError('Total attachment size exceeds 50MB limit.', { totalAttachmentSize })
          }

          const payload = { sessionKey, message, idempotencyKey, attachments }
          this.logger.debug('Sending chat message', { sessionKey, agentId, messageLength: message.length, attachmentCount: attachments?.length || 0 })

          return this.gatewayClient.request('chat.send', payload, {
            retry: true,
            idempotencyKey,
          })
        },
        { agentId, sessionKey, messageLength: message.length }
      )
    })

    // Abort an in-flight run
    void registerIpcHandler(ipcMain, 'chat:abort', this.logger, async (_event, params) => {
      const { sessionKey, runId } = params as { sessionKey?: string; runId?: string }

      if (!sessionKey && !runId) {
        this.logger.warn('Invalid chat.abort parameters: neither sessionKey nor runId provided')
        return createValidationError('Either sessionKey or runId is required.')
      }

      return this.logger.trackPerformanceAsync(
        'chat_abort',
        () => this.gatewayClient.request('chat.abort', { sessionKey, runId }, { retry: false }),
        { sessionKey, runId }
      )
    })

    // Load chat history for a session
    void registerIpcHandler(ipcMain, 'chat:history', this.logger, async (_event, params) => {
      const { agentId, sessionKey: providedSessionKey } = params as { agentId: string; sessionKey?: string }
      const sessionKey = providedSessionKey ?? `agent:${agentId}:main`

      return this.logger.trackPerformanceAsync(
        'chat_history',
        () => this.gatewayClient.request('chat.history', { sessionKey }, { retry: true }),
        { agentId, sessionKey }
      )
    })

    // List sessions with filtering and pagination
    void registerIpcHandler(ipcMain, 'sessions:list', this.logger, async (_event, params) => {
      return this.logger.trackPerformanceAsync(
        'sessions_list',
        () => this.gatewayClient.request('sessions.list', params ?? {}, { retry: true }),
        { params }
      )
    })

    // Reset a session (clear history)
    void registerIpcHandler(ipcMain, 'sessions:reset', this.logger, async (_event, params) => {
      const { sessionKey } = params as { sessionKey: string }

      if (!sessionKey) {
        this.logger.warn('Invalid sessions.reset parameters: sessionKey is required')
        return createValidationError('sessionKey is required.')
      }

      return this.logger.trackPerformanceAsync(
        'sessions_reset',
        () => this.gatewayClient.request('sessions.reset', { sessionKey }, { retry: false }),
        { sessionKey }
      )
    })

    // Patch session settings (e.g. thinking/verbose toggles)
    void registerIpcHandler(ipcMain, 'sessions:patch', this.logger, async (_event, params) => {
      const { sessionKey, patch } = params as { sessionKey: string; patch: Record<string, unknown> }

      if (!sessionKey || !patch || Object.keys(patch).length === 0) {
        this.logger.warn('Invalid sessions.patch parameters', { sessionKey, hasPatch: !!patch })
        return createValidationError('sessionKey and non-empty patch are required.')
      }

      return this.logger.trackPerformanceAsync(
        'sessions_patch',
        () => this.gatewayClient.request('sessions.patch', { sessionKey, patch }, { retry: false }),
        { sessionKey, patchKeys: Object.keys(patch) }
      )
    })

    // Get session status
    void registerIpcHandler(ipcMain, 'sessions:status', this.logger, async (_event, params) => {
      const { sessionKey } = params as { sessionKey: string }

      if (!sessionKey) {
        this.logger.warn('Invalid sessions.status parameters: sessionKey is required')
        return createValidationError('sessionKey is required.')
      }

      return this.logger.trackPerformanceAsync(
        'sessions_status',
        () => this.gatewayClient.request('sessions.status', { sessionKey }, { retry: true }),
        { sessionKey }
      )
    })
  }
}

/**
 * Legacy handler registration for backward compatibility
 */
export const registerChatHandlers = (ipcMain: IpcMain): void => {
  const handlers = new ChatIpcHandlers()
  handlers.register(ipcMain)
}
