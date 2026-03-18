import { useMemo } from "react"
import { Bot, Calendar, Clock, Copy, MessageSquare, Tags } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useApp } from "@/store/app-context"
import { getAgentAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import type { Agent } from "@/types"
import { formatRelativeTime, statusDotClass, statusLabel } from "./agent-config.types"

interface AgentOverviewTabProps {
  agent: Agent
  cronCount: number
  sessionCount: number
}

export function AgentOverviewTab({ agent, cronCount, sessionCount }: AgentOverviewTabProps) {
  const { dispatch } = useApp()
  useAvatarVersion()
  const agentSkills = useMemo(() => agent.skills.filter(Boolean), [agent.skills])

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(agent.id)
      toast.success("已复制 Agent ID")
    } catch (error) {
      toast.error(`复制失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }

  const handleOpenChat = () => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: `conv-${agent.id}` })
    dispatch({ type: "SET_VIEW", payload: "chat" })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={getAgentAvatarUrl(agent.id)} alt={agent.name} />
            <AvatarFallback>
              <Bot className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{agent.name}</h2>
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass[agent.status] ?? statusDotClass.idle}`} />
              <Badge variant="secondary">{statusLabel[agent.status] ?? agent.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">角色：{agent.role || "未设置"}</Badge>
              <Badge variant="outline">分类：{agent.category || "未分类"}</Badge>
              <Badge variant="outline">ID：{agent.id}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleCopyId()}>
            <Copy className="mr-2 h-4 w-4" />
            复制 ID
          </Button>
          <Button size="sm" onClick={handleOpenChat}>
            <MessageSquare className="mr-2 h-4 w-4" />
            打开会话
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">最近活跃</p>
          <p className="mt-2 text-lg font-semibold">{formatRelativeTime(agent.lastActiveAt)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">当前任务</p>
          <p className="mt-2 text-lg font-semibold">{agent.currentTask || "暂无"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">会话数量</p>
          <p className="mt-2 text-lg font-semibold">{sessionCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">定时任务</p>
          <p className="mt-2 text-lg font-semibold">{cronCount}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">技能</h3>
        </div>
        <Separator className="my-4" />
        {agentSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agentSkills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">该智能体尚未配置技能。</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">运行状态</h3>
          </div>
          <p className="text-sm text-muted-foreground">当前状态：{statusLabel[agent.status] ?? agent.status}</p>
          {typeof agent.taskProgress === "number" && (
            <p className="mt-2 text-sm text-muted-foreground">任务进度：{agent.taskProgress}%</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">时间信息</h3>
          </div>
          <p className="text-sm text-muted-foreground">最后活跃：{formatRelativeTime(agent.lastActiveAt)}</p>
        </div>
      </div>
    </div>
  )
}
