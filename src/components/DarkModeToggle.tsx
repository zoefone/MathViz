import { useSettingsStore } from '../stores/settingsStore'

export function DarkModeToggle() {
  const darkMode = useSettingsStore((s) => s.ui.darkMode)
  const setUi = useSettingsStore((s) => s.setUi)

  return (
    <button
      type="button"
      title={darkMode ? '浅色模式' : '深色模式'}
      onClick={() => setUi({ darkMode: !darkMode })}
      className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-lg border shadow-sm"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {darkMode ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  )
}
