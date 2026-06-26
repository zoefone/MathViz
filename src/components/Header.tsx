import { useSettingsStore } from '../stores/settingsStore'
import { t } from '../i18n'

export function Header() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const darkMode = useSettingsStore((s) => s.ui.darkMode)

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--header-bg)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          M
        </div>
        <span className="text-lg font-semibold tracking-tight">{t(locale, 'appName')}</span>
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {darkMode ? '◐' : '◯'} {locale === 'zh' ? '数学可视化' : 'Math Visualization'}
      </div>
    </header>
  )
}
