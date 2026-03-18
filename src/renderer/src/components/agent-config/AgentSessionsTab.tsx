import { useCallback, useEffect, useState } from "react"
import { MessageSquare, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/store/app-context"
import type { Agent } from "@/types"
import type { AgentSession, HistoryMsg } from "./agent-config.types"
import { formatRelativeTime, parseHistoryMessages, parseSessions, sessionDisplayName } from "./agent-config.types"

interface AgentSessionsTabProps {
  agent: Agent
  refreshTick: number
}

export function AgentSessionsTab({ agent, refreshTick }: AgentSessionsTabProps) {
  const { dispatch } = useApp()
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<HistoryMsg[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.ipc.sessionsList({ agentId: agent.id })
      if (result?.ok) {
        setSessions(parseSessions(result.result))
      } else {
        toast.error(result?.error ?? "加载会话失败")
      }
    } catch (error) {
      toast.error(`加载会话失败: ${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setIsLoading(false)
    }
  }, [agent.id])

  const loadSessionMessages = useCallback(async (sessionKey: string) => {
    setIsLoading(true)
    try {
      const result = await window.ipc.chatHistory({ agentId: agent.id, sessionKey })
      if (result?.ok) {
        setMessages(parseHistoryMessages(result.result))
        setSelectedSession(sessionKey)
      } else {
        toast.error(result?.error ?? "加载消息失败")
      }
    } catch (error) {
      toast.error(`加载消息失败: ${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setIsLoading(false)
    }
  }, [agent.id])

  const handleResetSession = useCallback(async (sessionKey: string) => {
    if (!confirm("确定要重置这个会话吗？这将清除所有历史消息。")) {
      return
    }

    try {
      const result = await window.ipc.sessionsReset({ sessionKey })
      if (result?.ok) {
        toast.success("会话重置成功")
        await loadSessionMessages(sessionKey)
      } else {
        toast.error(result?.error ?? "重置失败")
      }
    } catch (error) {
      toast.error(`重置失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }, [loadSessionMessages])

  const handleNewChat = useCallback(() => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: `conv-${agent.id}` })
    dispatch({ type: "SET_VIEW", payload: "chat" })
  }, [agent.id, dispatch])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions, refreshTick])

  return (
    <div className="flex h-full">
      <div className="flex w-80 flex-col border-r bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">会话列表</h3>
          <Button onClick={handleNewChat} size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            新对话
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">加载中...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">暂无会话</div>
          ) : (
            <div className="space-y-1 p-2">
              {sessions.map((session) => (
                <button
                  key={session.sessionKey}
                  type="button"
                  className={`w-full rounded-lg p-3 text-left transition-colors ${selectedSession === session.sessionKey ? "bg-accent" : "hover:bg-accent/50"}`}
                  onClick={() => void loadSessionMessages(session.sessionKey)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{sessionDisplayName(session, agent.id)}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleResetSession(session.sessionKey)
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeTime(session.updatedAt)}</span>
                    {session.model && <Badge variant="outline">{session.model}</Badge>}
                  </div>
                  {session.lastMessagePreview && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{session.lastMessagePreview}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col">
        {selectedSession ? (
          <>
            <div className="border-b bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {sessions.find((session) => session.sessionKey === selectedSession)?.displayName || "会话详情"}
                </h3>
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

            <ScrollArea className="flex-1 p-4">
              {isLoading && messages.length === 0 ? (
                <div className="text-center text-muted-foreground">加载消息中...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">暂无消息</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant={message.role === "user" ? "default" : "secondary"}>{message.role}</Badge>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(message.timestamp)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.content || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">请选择左侧会话查看详情</div>
        )}
      </div>
    </div>
  )
}
