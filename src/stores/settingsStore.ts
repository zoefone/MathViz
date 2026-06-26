import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AiMode = 'api' | 'local'
export type Provider = 'openai' | 'claude' | 'gemini' | 'relay'

export interface AiSettings {
  mode: AiMode
  provider: Provider
  baseURL: string
  apiKey: string
  model: string
  localModel: string
}

export interface UiSettings {
  darkMode: boolean
  locale: 'zh' | 'en'
}

interface SettingsState {
  ai: AiSettings
  ui: UiSettings
  setAi: (partial: Partial<AiSettings>) => void
  setUi: (partial: Partial<UiSettings>) => void
}

const PROVIDER_DEFAULTS: Record<Provider, { baseURL: string; model: string }> = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  claude: { baseURL: 'https://api.anthropic.com/v1/', model: 'claude-sonnet-4-20250514' },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.0-flash',
  },
  relay: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: {
        mode: 'api',
        provider: 'openai',
        baseURL: PROVIDER_DEFAULTS.openai.baseURL,
        apiKey: '',
        model: PROVIDER_DEFAULTS.openai.model,
        localModel: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      },
      ui: { darkMode: false, locale: 'zh' },

      setAi: (partial) =>
        set((s) => {
          const ai = { ...s.ai, ...partial }
          if (partial.provider && !partial.baseURL && !partial.model) {
            const defaults = PROVIDER_DEFAULTS[partial.provider]
            ai.baseURL = defaults.baseURL
            ai.model = defaults.model
          }
          return { ai }
        }),

      setUi: (partial) => set((s) => ({ ui: { ...s.ui, ...partial } })),
    }),
    { name: 'mathviz-settings' },
  ),
)

export { PROVIDER_DEFAULTS }
