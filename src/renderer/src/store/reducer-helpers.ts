import type { Conversation, Message } from '@/types'
import type { AppState } from './app-types'

export const formatChatTimestamp = (date: Date = new Date()): string =>
  date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

export const summarizeMessage = (content: string): string => content.slice(0, 100)

export const replaceConversation = (
  conversations: Conversation[],
  conversationId: string,
  updater: (conversation: Conversation) => Conversation,
): Conversation[] => conversations.map((conversation) => conversation.id === conversationId ? updater(conversation) : conversation)

export const appendConversationMessage = (
  state: AppState,
  conversationId: string,
  message: Message,
): AppState => ({
  ...state,
  messages: {
    ...state.messages,
    [conversationId]: [...(state.messages[conversationId] ?? []), message],
  },
})

export const updateConversationPreview = (
  conversations: Conversation[],
  conversationId: string,
  update: { lastMessage: string; lastMessageTime: string; unreadCount?: number; lastMessageSender?: string },
): Conversation[] => replaceConversation(conversations, conversationId, (conversation) => ({
  ...conversation,
  lastMessage: update.lastMessage,
  lastMessageTime: update.lastMessageTime,
  ...(typeof update.unreadCount === 'number' ? { unreadCount: update.unreadCount } : {}),
  ...(typeof update.lastMessageSender === 'string' ? { lastMessageSender: update.lastMessageSender } : {}),
}))
