import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { t } from '../i18n'

const tabs = [
  { id: 'presets' as const, labelKey: 'presets' as const },
  { id: 'custom' as const, labelKey: 'custom' as const },
  { id: 'latex' as const, labelKey: 'latex' as const },
  { id: 'code' as const, labelKey: 'code' as const },
  { id: 'ai' as const, labelKey: 'ai' as const },
  { id: 'settings' as const, labelKey: 'settings' as const },
]

export function SideNav() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const activePanel = useAppStore((s) => s.activePanel)
  const setActivePanel = useAppStore((s) => s.setActivePanel)

  return (
    <nav
      className="flex flex-row gap-1 p-2 shrink-0 border-b overflow-x-auto"
      style={{ borderColor: 'var(--border)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActivePanel(tab.id)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0"
          style={{
            background: activePanel === tab.id ? 'var(--btn-bg)' : 'transparent',
            color: activePanel === tab.id ? 'var(--text)' : 'var(--text-muted)',
          }}
        >
          {t(locale, tab.labelKey)}
        </button>
      ))}
    </nav>
  )
}
