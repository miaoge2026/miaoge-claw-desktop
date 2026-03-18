/**
 * UX Enhancements Module
 * 提供用户体验增强功能
 */

import React, { useState, useEffect, useCallback } from 'react'

// ── Animation Utilities ────────────────────────────────────────────────────────

export interface AnimationConfig {
  duration: number
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  delay?: number
}

export const fadeIn = (config: AnimationConfig) => ({
  from: { opacity: 0 },
  to: { opacity: 1 },
  duration: config.duration,
  easing: config.easing,
  delay: config.delay,
})

export const slideIn = (config: AnimationConfig & { direction: 'up' | 'down' | 'left' | 'right' }) => {
  const distance = 20
  const directions: Record<'up' | 'down' | 'left' | 'right', { x: number; y: number }> = {
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
  }

  return {
    from: { transform: `translate(${directions[config.direction].x}px, ${directions[config.direction].y}px)`, opacity: 0 },
    to: { transform: 'translate(0, 0)', opacity: 1 },
    duration: config.duration,
    easing: config.easing,
    delay: config.delay,
  }
}

// ── Custom Hooks ──────────────────────────────────────────────────────────────

export function useLoadingState(initial = false) {
  const [isLoading, setIsLoading] = useState(initial)
  const [loadingText, setLoadingText] = useState('')
  const [progress, setProgress] = useState<number | null>(null)

  const startLoading = useCallback((text = '加载中...') => {
    setIsLoading(true)
    setLoadingText(text)
    setProgress(null)
  }, [])

  const updateProgress = useCallback((value: number, text?: string) => {
    setProgress(value)
    if (text) setLoadingText(text)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    setProgress(null)
  }, [])

  return {
    isLoading,
    loadingText,
    progress,
    startLoading,
    updateProgress,
    stopLoading,
  }
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  return [storedValue, setValue] as const
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// ── Accessibility Utilities ───────────────────────────────────────────────────

export function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.style.position = 'absolute'
  announcement.style.left = '-10000px'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

export function focusFirstError(errors: Record<string, string>) {
  const firstErrorKey = Object.keys(errors)[0]
  if (firstErrorKey) {
    const element = document.querySelector<HTMLElement>(`[data-error="${firstErrorKey}"]`)
    if (element) {
      element.setAttribute('tabindex', '-1')
      element.focus()
    }
  }
}

// ── Form Validation ───────────────────────────────────────────────────────────

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  validate?: (value: any) => boolean | string
  message?: string
}

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (!value || value.toString().trim() === '')) {
    return rules.message || '此字段为必填项'
  }

  if (rules.minLength && value.length < rules.minLength) {
    return rules.message || `最少需要 ${rules.minLength} 个字符`
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return rules.message || `最多允许 ${rules.maxLength} 个字符`
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || '格式不正确'
  }

  if (rules.validate) {
    const result = rules.validate(value)
    if (typeof result === 'string') {
      return result
    }
    if (result === false) {
      return rules.message || '验证失败'
    }
  }

  return null
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any)

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string | null>> = {}
    let allValid = true

    for (const key of Object.keys(validationRules) as Array<keyof T>) {
      const error = validateField(values[key], validationRules[key])
      newErrors[key] = error
      if (error) allValid = false
    }

    setErrors(newErrors as Record<keyof T, string | null>)
    return allValid
  }, [values, validationRules])

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const error = validateField(values[field], validationRules[field])
    setErrors((prev) => ({ ...prev, [field]: error }))
  }, [values, validationRules])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({} as any)
    setTouched({} as any)
  }, [initialValues])

  const isValid = Object.values(errors).every((error) => error === null)

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    isValid,
    setValues,
  }
}

// ── Keyboard Shortcuts ───────────────────────────────────────────────────────

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const keyMatches = event.key === key || event.code === key
      const ctrlMatches = options.ctrl ? event.ctrlKey : !event.ctrlKey
      const shiftMatches = options.shift ? event.shiftKey : !event.shiftKey
      const altMatches = options.alt ? event.altKey : !event.altKey

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [key, handler, options])
}

// ── Error Boundary ──────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h1>出错了</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      )
    }

    return this.props.children
  }
}

// ── Responsive Design ───────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => 
    window.matchMedia(query).matches
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query, matches])

  return matches
}

export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch: 'ontouchstart' in window,
  }
}

// ── Gesture Support ────────────────────────────────────────────────────────

export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)

  const handleTouchStart = useCallback((event: TouchEvent) => {
    setStartX(event.touches[0].clientX)
    setStartY(event.touches[0].clientY)
  }, [])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const endX = event.changedTouches[0].clientX
    const endY = event.changedTouches[0].clientY
    const deltaX = endX - startX
    const deltaY = endY - startY

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }
  }, [startX, startY, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])
}

export default {
  // Animations
  fadeIn,
  slideIn,
  
  // Hooks
  useLoadingState,
  useDebouncedValue,
  useLocalStorage,
  useOnlineStatus,
  useKeyboardShortcut,
  useMediaQuery,
  useBreakpoint,
  useSwipeGesture,
  
  // Accessibility
  announceToScreenReader,
  focusFirstError,
  
  // Form
  useFormValidation,
  validateField,
  
  // Error Handling
  ErrorBoundary,
}
