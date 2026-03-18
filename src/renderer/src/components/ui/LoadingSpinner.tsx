/**
 * Loading Spinner Component
 * 提供多种加载状态和过渡动画
 */

import type { HTMLAttributes, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  type?: "spinner" | "dots" | "pulse" | "ring"
  text?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingSpinner({
  size = "md",
  type = "spinner",
  text,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const renderSpinner = () => {
    switch (type) {
      case "dots":
        return (
          <div className="flex gap-1">
            <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "0ms" }} />
            <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "150ms" }} />
            <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "300ms" }} />
          </div>
        )
      case "pulse":
        return <div className={cn("rounded-full bg-current animate-pulse", sizeClasses[size])} />
      case "ring":
        return <div className={cn("rounded-full border-2 border-current border-t-transparent animate-spin", sizeClasses[size])} />
      default:
        return <Loader2 className={cn("animate-spin", sizeClasses[size])} />
    }
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 shadow-lg">
          {renderSpinner()}
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {renderSpinner()}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md bg-muted animate-pulse", className)} {...props} />
}

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">出错了！</h1>
          <p className="text-muted-foreground">应用程序遇到了一个意外错误。</p>
        </div>

        <div className="rounded-lg bg-muted p-4 text-left">
          <p className="mb-2 text-sm font-medium">错误信息：</p>
          <p className="break-all text-xs text-muted-foreground">{error.message || "未知错误"}</p>
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={resetErrorBoundary} size="sm">
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            重试
          </Button>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            刷新页面
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">如果问题仍然存在，请联系技术支持。</p>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-muted-foreground">{icon || <div className="h-12 w-12 rounded-full bg-muted" />}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <CheckCircleIcon className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </div>
  )
}

export function WarningMessage({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in rounded-lg bg-yellow-500 px-4 py-3 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </div>
  )
}

function AlertCircleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v2m0 4h.01" /></svg>
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}

function RefreshCwIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
}
