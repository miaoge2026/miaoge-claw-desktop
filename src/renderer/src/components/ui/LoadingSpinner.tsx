/**
 * Loading Spinner Component
 * 提供多种加载状态和过渡动画
 */

import { cn } from "@/lib/utils"
import { Loader2, RefreshCw, Spinner } from "lucide-react"

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
  className 
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
            <div className={cn("bg-current rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: "0ms" }} />
            <div className={cn("bg-current rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: "150ms" }} />
            <div className={cn("bg-current rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: "300ms" }} />
          </div>
        )
      
      case "pulse":
        return (
          <div className={cn("bg-current rounded-full animate-pulse", sizeClasses[size])} />
        )
      
      case "ring":
        return (
          <div className={cn("border-2 border-current border-t-transparent rounded-full animate-spin", sizeClasses[size])} />
        )
      
      default:
        return <Spinner className={cn("animate-spin", sizeClasses[size])} />
    }
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg p-6 flex flex-col items-center gap-4 border">
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

/**
 * Skeleton Screen Component
 * 提供内容加载时的骨架屏效果
 */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-muted rounded-md", className)}
      {...props}
    />
  )
}

/**
 * Error Boundary Fallback Component
 * 提供友好的错误提示界面
 */

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">出错了！</h1>
          <p className="text-muted-foreground">
            应用程序遇到了一个意外错误。
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 text-left">
          <p className="text-sm font-medium mb-2">错误信息：</p>
          <p className="text-xs text-muted-foreground break-all">
            {error.message || "未知错误"}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={resetErrorBoundary} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            刷新页面
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          如果问题仍然存在，请联系技术支持。
        </p>
      </div>
    </div>
  )
}

/**
 * Empty State Component
 * 提供空状态的友好提示
 */

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-muted-foreground">
        {icon || <div className="h-12 w-12 rounded-full bg-muted" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  )
}

/**
 * Success Message Component
 * 提供操作成功的反馈
 */

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </div>
  )
}

/**
 * Warning Message Component
 * 提供警告信息反馈
 */

export function WarningMessage({ message }: { message: string }) {
  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </div>
  )
}

// ── Additional Icons ────────────────────────────────────────────────────────

function AlertCircle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4m0 4h.01" />
  </svg>
}

function AlertTriangle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v2m0 4h.01" />
  </svg>
}

function CheckCircle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
}

function RefreshCw({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
}

function Spinner({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
}