import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3l9.5 16.5H2.5L12 3z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
}

const COLORS = {
  success: { bar: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
  error:   { bar: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  warning: { bar: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
  info:    { bar: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => {
          const color = COLORS[t.type] || COLORS.info
          return (
            <div
              key={t.id}
              className="pointer-events-auto max-w-sm animate-slideInRight"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                border: `1px solid ${color.border}`,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-white">
                <span style={{ color: color.bar }}>{ICONS[t.type] || ICONS.info}</span>
                {t.message}
              </div>
              {/* Progress bar */}
              <div style={{ height: '2px', background: 'rgba(148,163,184,0.05)' }}>
                <div
                  style={{
                    height: '100%',
                    background: color.bar,
                    animation: 'progress-drain 4s linear forwards',
                    borderRadius: '0 0 0 2px',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
