/**
 * Agent Overview Tab Component
 * 显示智能体的概览信息，包括基本信息、状态、统计等
 */

import { useEffect, useState } from "react"
import { 
  AlertCircle, 
  Bot, 
  Brain, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Copy, 
  FileText, 
  Info, 
  Loader2, 
  Play, 
  RefreshCw, 
  RotateCcw, 
  Save, 
  Trash2, 
  XCircle, 
  Zap 
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useApp } from "@/store/app-context"
import { getAgentAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import type { Agent } from "@/types"
import { 
  formatRelativeTime, 
  formatSchedule, 
  formatNextRun, 
  formatSize,
  statusLabel,
  statusDotClass,
  TABS 
} from "./agent-config.types"

interface AgentOverviewTabProps {
  agent: Agent
  cronCount: number
  sessionCount: number
}

export function AgentOverviewTab({ agent, cronCount, sessionCount }: AgentOverviewTabProps) {
  const { state, dispatch } = useApp()
  const [refreshTick, setRefreshTick] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editName, setEditName] = useState(agent.name)
  const [editPrompt, setEditPrompt] = useState(agent.prompt || "")
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(agent.status || "idle")
  
  const avatarVersion = useAvatarVersion(agent.id)

  useEffect(() => {
    setStatus(agent.status || "idle")
  }, [agent.status])

  const handleStart = async () => {
    setStatus("working")
    try {
      // 启动智能体的逻辑
      toast.success("智能体启动成功")
    } catch (error) {
      toast.error("启动失败: " + (error as Error).message)
      setStatus("idle")
    }
  }

  const handleStop = async () => {
    setStatus("idle")
    toast.info("智能体已停止")
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 保存配置的逻辑
      toast.success("配置保存成功")
    } catch (error) {
      toast.error("保存失败: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      // 复制智能体的逻辑
      toast.success("智能体复制成功")
    } catch (error) {
      toast.error("复制失败: " + (error as Error).message)
    }
  }

  const handleDelete = async () => {
    if (confirm("确定要删除这个智能体吗？此操作不可恢复。")) {
      try {
        // 删除智能体的逻辑
        toast.success("智能体删除成功")
      } catch (error) {
        toast.error("删除失败: " + (error as Error).message)
      }
    }
  }

  const modelName = agent.model?.name || agent.model?.model || "未知模型"

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={getAgentAvatarUrl(agent.id, avatarVersion)} 
              alt={agent.name}
            />
            <AvatarFallback>
              <Bot className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-0"
                disabled={isSaving}
              />
              <div className={`h-2 w-2 rounded-full ${statusDotClass[status]}`} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{modelName}</Badge>
              <Badge variant="secondary">ID: {agent.id}</Badge>
              <Badge variant="secondary">状态: {statusLabel[status]}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "idle" ? (
            <Button onClick={handleStart} size="sm">
              <Play className="h-4 w-4 mr-2" />
              启动
            </Button>
          ) : (
            <Button onClick={handleStop} size="sm" variant="outline">
              <XCircle className="h-4 w-4 mr-2" />
              停止
            </Button>
          )}
          
          <Button onClick={handleDuplicate} size="sm" variant="ghost">
            <Copy className="h-4 w-4 mr-2" />
            复制
          </Button>
          
          <Button onClick={handleDelete} size="sm" variant="ghost" className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">基本信息</h3>
          <Button onClick={() => setIsExpanded(!isExpanded)} size="sm" variant="ghost">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">创建时间</p>
            <p className="font-medium">{formatRelativeTime(agent.createdAt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">最后更新</p>
            <p className="font-medium">{formatRelativeTime(agent.updatedAt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">会话数量</p>
            <p className="font-medium">{sessionCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">定时任务</p>
            <p className="font-medium">{cronCount}</p>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            <Separator />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">系统提示词</label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={4}
                disabled={isSaving}
                placeholder="输入系统提示词..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <div className="flex flex-wrap gap-2">
                {agent.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleSave} size="sm" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                保存配置
              </Button>
              <Button 
                onClick={() => {
                  setEditName(agent.name)
                  setEditPrompt(agent.prompt || "")
                }} 
                size="sm" 
                variant="outline"
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <Zap className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{agent.stats?.tasksCompleted || 0}</p>
          <p className="text-sm text-muted-foreground">完成任务</p>
        </div>
        
        <div className="rounded-lg border bg-card p-4 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{agent.stats?.uptime || 0}h</p>
          <p className="text-sm text-muted-foreground">运行时间</p>
        </div>
        
        <div className="rounded-lg border bg-card p-4 text-center">
          <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <p className="text-2xl font-bold">{formatTokens(agent.stats?.totalTokens || 0)}</p>
          <p className="text-sm text-muted-foreground">总Token数</p>
        </div>
        
        <div className="rounded-lg border bg-card p-4 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold">{agent.stats?.successRate || 0}%</p>
          <p className="text-sm text-muted-foreground">成功率</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="grid grid-cols-3 gap-4">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SHOW_CHAT", payload: agent.id })}>
            <MessageSquare className="h-4 w-4 mr-2" />
            开始对话
          </Button>
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SHOW_SETTINGS", payload: agent.id })}>
            <Settings className="h-4 w-4 mr-2" />
            配置设置
          </Button>
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SHOW_LOGS", payload: agent.id })}>
            <FileText className="h-4 w-4 mr-2" />
            查看日志
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Additional Icons ────────────────────────────────────────────────────────

function MessageSquare({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
}

function Settings({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 6.34L2.1 2.1m17.8 17.8l-4.24-4.24M6.34 17.66L2.1 21.9" />
  </svg>
}