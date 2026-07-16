import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

interface ToastState {
  message: string | null
  kind: ToastKind
  show: (message: string, kind?: ToastKind) => void
  clear: () => void
}

let timer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'info',
  show: (message, kind = 'info') => {
    if (timer) clearTimeout(timer)
    set({ message, kind })
    timer = setTimeout(() => set({ message: null }), 2600)
  },
  clear: () => {
    if (timer) clearTimeout(timer)
    set({ message: null })
  },
}))
