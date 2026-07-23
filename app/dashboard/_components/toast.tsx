"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

type ToastTone = "default" | "success" | "error"
type Toast = { id: string; title: string; message?: string; tone: ToastTone }

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID()
    setToasts((items) => [...items, { ...toast, id }].slice(-4))
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 4200)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[80] grid w-[min(360px,calc(100vw-32px))] gap-2">
        {toasts.map((toast) => (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition"
            key={toast.id}
            role="status"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 size-2 rounded-full ${
                  toast.tone === "success"
                    ? "bg-[var(--good)]"
                    : toast.tone === "error"
                      ? "bg-[var(--bad)]"
                      : "bg-[var(--text)]"
                }`}
              />
              <span className="min-w-0">
                <span className="block font-semibold">{toast.title}</span>
                {toast.message ? <span className="mt-1 block text-[var(--muted)]">{toast.message}</span> : null}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}
