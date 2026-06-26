import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { t } from '../i18n'

export function CodePanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const code = useAppStore((s) => s.code)
  const setCode = useAppStore((s) => s.setCode)
  const runCode = useAppStore((s) => s.runCode)
  const parseError = useAppStore((s) => s.parseError)
  const computeError = useAppStore((s) => s.computeError)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold">{t(locale, 'code')}</span>
        <button
          onClick={runCode}
          className="px-4 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {t(locale, 'run')}
        </button>
      </div>
      {(parseError || computeError) && (
        <div className="px-3 py-2 text-xs" style={{ color: '#FF3B30', background: 'rgba(255,59,48,0.08)' }}>
          {parseError || computeError}
        </div>
      )}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 p-3 text-sm font-mono resize-none outline-none"
        style={{
          background: 'var(--input-bg)',
          color: 'var(--text)',
          minHeight: '200px',
        }}
        spellCheck={false}
      />
    </div>
  )
}
