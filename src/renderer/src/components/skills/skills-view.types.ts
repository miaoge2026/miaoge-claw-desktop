/**
 * Skills View Types
 * 技能管理相关的类型和接口
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface Skill {
  name: string
  description?: string
  version?: string
  enabled: boolean
  source?: string
  install?: { id?: string; kind: string; label?: string }[]
}

export interface MarketplaceSkill {
  slug: string
  displayName?: string
  name?: string
  description?: string
  version?: string
  score?: number
  author?: string
  downloads?: number
  stars?: number
  versions?: number
  changelog?: string
  license?: string
  createdAt?: number
}

export type Tab = "installed" | "marketplace"

export interface InstalledSkill extends Skill {
  id: string
  path: string
  isCore: boolean
  isDev: boolean
}

export interface SkillStats {
  total: number
  enabled: number
  disabled: number
  core: number
  user: number
}

// ── Helper Functions ────────────────────────────────────────────────────────

export function parseSkillsResult(raw: unknown): Skill[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.skills)
      ? (raw as { skills: unknown[] }).skills
      : []

  return list
    .map((s) => {
      if (typeof s === "string") return { name: s, enabled: true }
      const sk = s as Record<string, unknown>
      return {
        name: typeof sk.name === "string" ? sk.name : "",
        description: typeof sk.description === "string" ? sk.description : undefined,
        version: typeof sk.version === "string" ? sk.version : undefined,
        enabled: typeof sk.enabled === "boolean" ? sk.enabled : true,
        source: typeof sk.source === "string" ? sk.source : undefined,
        install: Array.isArray(sk.install) ? (sk.install as Skill["install"]) : undefined,
      }
    })
    .filter((s) => s.name)
}

export function parseMarketplaceItems(raw: unknown[]): MarketplaceSkill[] {
  return raw
    .map((item) => {
      const r = item as Record<string, unknown>
      const stats = r.stats as Record<string, unknown> | undefined
      const latestVersion = r.latestVersion as Record<string, unknown> | undefined
      return {
        slug: typeof r.slug === "string" ? r.slug : "",
        displayName: typeof r.displayName === "string" ? r.displayName : undefined,
        name: typeof r.name === "string" ? r.name : undefined,
        description:
          typeof r.description === "string"
            ? r.description
            : typeof r.summary === "string"
              ? r.summary
              : undefined,
        version:
          typeof r.version === "string"
            ? r.version
            : typeof latestVersion?.version === "string"
              ? latestVersion.version
              : undefined,
        score: typeof r.score === "number" ? r.score : undefined,
        author: typeof r.author === "string" ? r.author : undefined,
        downloads: typeof stats?.downloads === "number" ? stats.downloads : undefined,
        stars: typeof stats?.stars === "number" ? stats.stars : undefined,
        versions: typeof stats?.versions === "number" ? stats.versions : undefined,
        changelog: typeof r.changelog === "string" ? r.changelog : undefined,
        license: typeof r.license === "string" ? r.license : undefined,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : undefined,
      }
    })
    .filter((s) => s.slug && s.name)
}

export function calculateSkillStats(skills: Skill[]): SkillStats {
  return {
    total: skills.length,
    enabled: skills.filter(s => s.enabled).length,
    disabled: skills.filter(s => !s.enabled).length,
    core: skills.filter(s => s.source === "core").length,
    user: skills.filter(s => s.source !== "core").length,
  }
}

export function formatSkillVersion(version: string): string {
  if (!version) return "未知"
  if (version.startsWith("v")) return version
  return `v${version}`
}

export function formatSkillAuthor(author?: string): string {
  if (!author) return "未知作者"
  return author
}

export function formatSkillDownloads(downloads?: number): string {
  if (!downloads) return "0"
  if (downloads < 1000) return downloads.toString()
  if (downloads < 1000000) return `${(downloads / 1000).toFixed(1)}K`
  return `${(downloads / 1000000).toFixed(1)}M`
}

export function formatSkillStars(stars?: number): string {
  if (!stars) return "0"
  return stars.toString()
}

export function getSkillQualityColor(score?: number): string {
  if (!score) return "text-muted-foreground"
  if (score >= 90) return "text-green-500"
  if (score >= 70) return "text-blue-500"
  if (score >= 50) return "text-yellow-500"
  return "text-red-500"
}

export function getSkillQualityLabel(score?: number): string {
  if (!score) return "未知"
  if (score >= 90) return "优秀"
  if (score >= 70) return "良好"
  if (score >= 50) return "一般"
  return "较差"
}

// ── UI Helper Functions ────────────────────────────────────────────────────

export function getSkillIcon(name: string): string {
  const iconMap: Record<string, string> = {
    "text-generation": "📝",
    "image-processing": "🖼️",
    "audio-processing": "🎵",
    "video-processing": "🎬",
    "data-analysis": "📊",
    "web-search": "🔍",
    "file-management": "📁",
    "code-generation": "💻",
    "translation": "🌐",
    "summarization": "📋",
  }
  return iconMap[name] || "🧩"
}

export function getSkillCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    "text": "bg-blue-500",
    "image": "bg-purple-500",
    "audio": "bg-green-500",
    "video": "bg-red-500",
    "data": "bg-yellow-500",
    "web": "bg-orange-500",
    "file": "bg-gray-500",
    "code": "bg-indigo-500",
    "translation": "bg-pink-500",
    "default": "bg-gray-400",
  }
  return colorMap[category] || colorMap.default
}

// ── Validation Functions ───────────────────────────────────────────────────

export function validateSkillName(name: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name) && name.length > 0 && name.length <= 50
}

export function validateSkillVersion(version: string): boolean {
  return /^v?\d+(\.\d+)*$/.test(version)
}

export function validateSkillDescription(description: string): boolean {
  return description.length <= 500
}

// ── Mock Data ─────────────────────────────────────────────────────────────

export const mockInstalledSkills: Skill[] = [
  {
    name: "text-generation",
    description: "文本生成技能，支持多种语言和风格",
    version: "v1.2.3",
    enabled: true,
    source: "core",
  },
  {
    name: "image-processing",
    description: "图像处理技能，支持多种格式和算法",
    version: "v2.1.0",
    enabled: true,
    source: "user",
  },
  {
    name: "web-search",
    description: "网页搜索技能，实时获取最新信息",
    version: "v1.5.2",
    enabled: false,
    source: "marketplace",
  },
]

export const mockMarketplaceSkills: MarketplaceSkill[] = [
  {
    slug: "advanced-text-generation",
    displayName: "高级文本生成",
    name: "advanced-text-generation",
    description: "更先进的文本生成技能，支持上下文理解",
    version: "v2.0.0",
    score: 95,
    author: "AI Team",
    downloads: 12500,
    stars: 485,
    versions: 5,
    license: "MIT",
  },
  {
    slug: "image-enhancement",
    displayName: "图像增强",
    name: "image-enhancement",
    description: "图像增强技能，提升图像质量",
    version: "v1.8.0",
    score: 88,
    author: "Image Team",
    downloads: 8900,
    stars: 342,
    versions: 3,
    license: "Apache-2.0",
  },
]