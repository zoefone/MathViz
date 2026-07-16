import { useToastStore } from '../stores/toastStore'

export function Toast() {
  const message = useToastStore((s) => s.message)
  const kind = useToastStore((s) => s.kind)
  if (!message) return null

  const bg =
    kind === 'error' ? '#FF453A' : kind === 'success' ? '#34C759' : 'var(--accent)'
  const color = kind === 'info' ? 'var(--accent-text)' : '#fff'

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-none safe-area-toast"
      style={{ background: bg, color, bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      role="status"
    >
      {message}
    </div>
  )
}
