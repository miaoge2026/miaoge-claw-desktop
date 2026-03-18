import { useEffect, useMemo, useState } from "react"
import { Bot, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import type { Agent } from "@/types"
import { AgentOverviewTab } from "./AgentOverviewTab"
import { AgentSessionsTab } from "./AgentSessionsTab"
import { TABS, type TabId } from "./agent-config.types"

export function AgentConfigView() {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  useEffect(() => {
    if (state.agents.length === 0) {
      setSelectedAgentId(null)
      return
    }

    if (!selectedAgentId || !state.agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(state.agents[0].id)
    }
  }, [selectedAgentId, state.agents])

  const agent = useMemo(
    () => state.agents.find((item) => item.id === selectedAgentId) ?? null,
    [selectedAgentId, state.agents]
  )

  const agentConversationCount = (targetAgent: Agent) =>
    state.conversations.filter((conversation) => conversation.members.includes(targetAgent.id)).length

  const renderActiveTab = () => {
    if (!agent) return null

    switch (activeTab) {
      case "overview":
        return (
          <AgentOverviewTab agent={agent} cronCount={0} sessionCount={agentConversationCount(agent)} />
        )
      case "sessions":
        return <AgentSessionsTab agent={agent} refreshTick={refreshTick} />
      case "memory":
        return <div className="p-6 text-muted-foreground">记忆管理功能开发中...</div>
      case "skills":
        return <div className="p-6 text-muted-foreground">技能配置功能开发中...</div>
      case "cron":
        return <div className="p-6 text-muted-foreground">定时任务功能开发中...</div>
      default:
        return null
    }
  }

  if (state.agents.length === 0) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">当前没有可配置的智能体</div>
  }

  return (
    <div className="flex h-full">
      <div className="flex w-72 flex-col border-r bg-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Agent 配置</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setRefreshTick((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {state.agents.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  selectedAgentId === item.id ? "border-primary bg-accent" : "hover:bg-accent/50"
                )}
                onClick={() => setSelectedAgentId(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{item.name}</p>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.role || "未设置角色"}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b bg-card p-2">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={cn("flex-1", activeTab === tab.id && "bg-accent text-accent-foreground")}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{renderActiveTab()}</div>
      </div>
    </div>
  )
}
