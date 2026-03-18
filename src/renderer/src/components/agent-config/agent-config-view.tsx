/**
 * Agent Configuration View Component
 * 智能体配置主组件，管理多个Tab页面
 */

import { useEffect, useState, useCallback } from "react"
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
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useApp } from "@/store/app-context"
import { getAgentAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import type { Agent } from "@/types"
import type { CronJob, CronSchedule } from "@/types/cron"
import { TABS } from "./agent-config.types"
import { AgentOverviewTab } from "./AgentOverviewTab"
import { AgentSessionsTab } from "./AgentSessionsTab"

/**
 * Agent Configuration View - 智能体配置主组件
 * 管理智能体的多个配置页面：概览、会话、技能、定时任务、记忆
 */
export function AgentConfigView() {
  const { state, dispatch } = useApp()
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [refreshTick, setRefreshTick] = useState(0)
  
  // 获取当前选中的智能体
  const agent = state.selectedAgent ? state.agents.find(a => a.id === state.selectedAgent) : null

  // 刷新当前Tab
  const handleRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  // 如果未选择智能体，显示空状态
  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请选择一个智能体进行配置
      </div>
    )
  }

  // 渲染当前活动的Tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <AgentOverviewTab 
            agent={agent} 
            cronCount={state.cronJobs.filter(job => job.agentId === agent.id).length}
            sessionCount={state.sessions.filter(s => s.agentId === agent.id).length}
          />
        )
      
      case "sessions":
        return (
          <AgentSessionsTab 
            agent={agent} 
            refreshTick={refreshTick}
          />
        )
      
      case "memory":
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">记忆管理</h2>
            <p className="text-muted-foreground">记忆管理功能开发中...</p>
          </div>
        )
      
      case "skills":
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">技能配置</h2>
            <p className="text-muted-foreground">技能配置功能开发中...</p>
          </div>
        )
      
      case "cron":
        return (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">定时任务</h2>
            <p className="text-muted-foreground">定时任务功能开发中...</p>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部：智能体信息和Tab导航 */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <Badge variant="outline">ID: {agent.id}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} size="sm" variant="ghost">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
            <Button size="sm" variant="ghost">
              <FileText className="h-4 w-4 mr-2" />
              查看日志
            </Button>
          </div>
        </div>

        {/* Tab导航 */}
        <div className="flex items-center gap-1 p-2">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1",
                activeTab === tab.id && "bg-accent text-accent-foreground"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </div>
    </div>
  )
}
