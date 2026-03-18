/**
 * Agent Sessions Tab Component
 * 显示和管理智能体的所有会话历史
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/store/app-context"
import { toast } from "sonner"
import { ChevronRight, MessageSquare, RotateCcw, Trash2 } from "lucide-react"
import type { Agent } from "@/types"
import { 
  parseHistoryMessages, 
  parseSessions, 
  formatRelativeTime,
  sessionDisplayName,
  formatTokens
} from "./agent-config.types"

interface AgentSessionsTabProps {
  agent: Agent
  refreshTick: number
}

export function AgentSessionsTab({ agent, refreshTick }: AgentSessionsTabProps) {
  const { state, dispatch } = useApp()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      // 调用API获取会话列表
      const result = await window.ipc.sessions.list({ agentId: agent.id })
      if (result.ok) {
        const parsed = parseSessions(result.result)
        setSessions(parsed)
      }
    } catch (error) {
      toast.error("加载会话失败: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [agent.id])

  // 加载会话历史消息
  const loadSessionMessages = useCallback(async (sessionKey: string) => {
    setIsLoading(true)
    try {
      const result = await window.ipc.chat.history({ agentId: agent.id, sessionKey })
      if (result.ok) {
        const parsed = parseHistoryMessages(result.result)
        setMessages(parsed)
        setSelectedSession(sessionKey)
      }
    } catch (error) {
      toast.error("加载消息失败: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [agent.id])

  // 重置会话
  const handleResetSession = useCallback(async (sessionKey: string) => {
    if (!confirm("确定要重置这个会话吗？这将清除所有历史消息。")) {
      return
    }

    try {
      const result = await window.ipc.sessions.reset({ sessionKey })
      if (result.ok) {
        toast.success("会话重置成功")
        loadSessionMessages(sessionKey)
      }
    } catch (error) {
      toast.error("重置失败: " + (error as Error).message)
    }
  }, [loadSessionMessages])

  // 删除会话
  const handleDeleteSession = useCallback(async (sessionKey: string) => {
    if (!confirm("确定要删除这个会话吗？此操作不可恢复。")) {
      return
    }

    try {
      const result = await window.ipc.sessions.delete({ sessionKey })
      if (result.ok) {
        toast.success("会话删除成功")
        loadSessions()
        if (selectedSession === sessionKey) {
          setSelectedSession(null)
          setMessages([])
        }
      }
    } catch (error) {
      toast.error("删除失败: " + (error as Error).message)
    }
  }, [selectedSession, loadSessions])

  // 查看会话详情
  const handleViewSession = useCallback((sessionKey: string) => {
    loadSessionMessages(sessionKey)
  }, [loadSessionMessages])

  // 开始新对话
  const handleNewChat = useCallback(() => {
    dispatch({ type: "SHOW_CHAT", payload: agent.id })
  }, [dispatch, agent.id])

  useEffect(() => {
    loadSessions()
  }, [loadSessions, refreshTick])

  return (
    <div className="flex h-full">
      {/* 左侧：会话列表 */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">会话列表</h3>
          <Button onClick={handleNewChat} size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            新对话
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-pulse">加载中...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              暂无会话
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.sessionKey}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSession === session.sessionKey 
                      ? "bg-accent" 
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => handleViewSession(session.sessionKey)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm truncate">
                      {sessionDisplayName(session, agent.id)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResetSession(session.sessionKey)
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSession(session.sessionKey)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatRelativeTime(session.updatedAt)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {session.model || "默认"}
                      </Badge>
                      {session.lastMessagePreview && (
                        <span className="truncate max-w-[100px]">
                          {session.lastMessagePreview}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 右侧：消息详情 */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {sessions.find(s => s.sessionKey === selectedSession)?.displayName || "会话详情"}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {sessions.find(s => s.sessionKey === selectedSession)?.model || "未知模型"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedSession(null)
                      setMessages([])
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {isLoading && messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <div className="animate-pulse">加载消息中...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${
                        message.role === "assistant" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "assistant"
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                          <span>{message.role}</span>
                          <span>{formatRelativeTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            选择一个会话查看详细信息
          </div>
        )}
      </div>
    </div>
  )
}

// ── Additional Icons ────────────────────────────────────────────────────────

function X({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
}