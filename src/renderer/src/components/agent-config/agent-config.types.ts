/**
 * Agent Config Component Types
 * 定义Agent配置相关的类型和接口
 */

import type { Agent } from "@/types"
import type { CronJob, CronSchedule } from "@/types/cron"

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Skill {
  name: string
  description?: string
  version?: string
  enabled: boolean
}

export interface AgentSession {
  sessionKey: string      // mapped from `key` in gateway response
  sessionId?: string
  updatedAt?: number      // ms timestamp
  label?: string
  displayName?: string
  channel?: string
  subject?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  contextTokens?: number
  kind?: string
  lastMessagePreview?: string
}

export interface HistoryMsg {
  id: string
  role: string
  content: string
  timestamp: number
  attachments?: Array<{ type: string; name: string }>
}

export interface DailyMemoryFile {
  date: string
  size: number
  preview?: string
}

export type TabId = "overview" | "sessions" | "memory" | "skills" | "cron"

// ── Helper Functions ────────────────────────────────────────────────────────

export const statusLabel: Record<string, string> = {
  idle: "空闲",
  working: "工作中",
  thinking: "思考中",
  chatting: "对话中",
  busy: "忙碌",
  completed: "已完成",
}

export const statusDotClass: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  working: "bg-blue-500 animate-pulse",
  thinking: "bg-blue-500 animate-pulse",
  chatting: "bg-green-500",
  busy: "bg-amber-500",
  completed: "bg-muted-foreground/40",
}

export function formatRelativeTime(ts: string | number | undefined): string {
  if (!ts) return "—"
  const ms = typeof ts === "number" ? ts : Date.parse(ts)
  if (isNaN(ms)) return "—"
  const diff = Date.now() - ms
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

export function formatSchedule(schedule: CronSchedule): string {
  if (schedule.kind === "at") return `一次性: ${schedule.at}`
  if (schedule.kind === "every") {
    const ms = schedule.everyMs
    if (ms < 60_000) return `每 ${ms / 1000} 秒`
    if (ms < 3_600_000) return `每 ${ms / 60_000} 分钟`
    if (ms < 86_400_000) return `每 ${ms / 3_600_000} 小时`
    return `每 ${ms / 86_400_000} 天`
  }
  if (schedule.kind === "cron") return `Cron: ${schedule.expr}`
  return "未知"
}

export function formatNextRun(ms: number | null | undefined): string {
  if (ms == null) return "—"
  const now = Date.now()
  const diff = ms - now
  if (diff < 0) return "已过期"
  if (diff < 60_000) return `即将运行 (${Math.floor(diff / 1000)} 秒后)`
  if (diff < 3_600_000) return `即将运行 (${Math.floor(diff / 60_000)} 分钟后)`
  return `即将运行 (${Math.floor(diff / 3_600_000)} 小时后)`
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString()
  return `${(n / 1000).toFixed(1)}K`
}

export function sessionDisplayName(s: AgentSession, agentId: string): string {
  return s.displayName || s.label || `${agentId}-${s.sessionKey}`
}

// ── Parser Functions ────────────────────────────────────────────────────────

export function parseSessions(raw: unknown): AgentSession[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r: any) => ({
    sessionKey: r.key || r.sessionKey || "",
    sessionId: r.sessionId,
    updatedAt: r.updatedAt ? Date.parse(r.updatedAt) : undefined,
    label: r.label,
    displayName: r.displayName,
    channel: r.channel,
    subject: r.subject,
    model: r.model,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    contextTokens: r.contextTokens,
    kind: r.kind,
    lastMessagePreview: r.lastMessagePreview,
  }))
}

export function parseHistoryMessages(raw: unknown): HistoryMsg[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r: any) => ({
    id: r.id || r.messageId || "",
    role: r.role || "unknown",
    content: extractText(r.content),
    timestamp: r.timestamp ? Date.parse(r.timestamp) : Date.now(),
    attachments: r.attachments,
  }))
}

export function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("\n")
  }
  return JSON.stringify(content)
}

export function parseSkillsResult(raw: unknown): Skill[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r: any) => ({
    name: r.name || "",
    description: r.description,
    version: r.version,
    enabled: r.enabled !== false,
  }))
}

export const TABS = [
  { id: "overview" as const, label: "概览" },
  { id: "sessions" as const, label: "会话" },
  { id: "memory" as const, label: "记忆" },
  { id: "skills" as const, label: "技能" },
  { id: "cron" as const, label: "定时任务" },
]

export const lastRunBadge: Record<string, { label: string; className: string }> = {
  success: { label: "成功", className: "bg-green-500 text-white" },
  failure: { label: "失败", className: "bg-destructive text-white" },
  running: { label: "运行中", className: "bg-blue-500 text-white animate-pulse" },
}