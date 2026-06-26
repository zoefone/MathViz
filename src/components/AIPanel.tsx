import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { generateMvzFromPrompt } from '../ai/pipeline'
import { t } from '../i18n'

export function AIPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const ai = useSettingsStore((s) => s.ai)
  const setDoc = useAppStore((s) => s.setDoc)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setStatus(t(locale, 'generating'))

    const result = await generateMvzFromPrompt(prompt, ai, (text, progress) => {
      setStatus(progress !== undefined ? `${text} (${progress.toFixed(0)}%)` : text)
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      setStatus('')
      return
    }
    if (result.doc) {
      setDoc(result.doc)
      setStatus(locale === 'zh' ? '生成成功' : 'Generated')
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <h3 className="text-sm font-semibold">{t(locale, 'ai')}</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {ai.mode === 'api'
          ? `${t(locale, 'apiMode')}: ${ai.provider}`
          : `${t(locale, 'localMode')}: ${ai.localModel}`}
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t(locale, 'promptPlaceholder')}
        className="w-full p-3 rounded-xl text-sm resize-none outline-none border"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--input-bg)',
          color: 'var(--text)',
          minHeight: '100px',
        }}
      />
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        {loading ? t(locale, 'generating') : t(locale, 'generate')}
      </button>
      {status && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{status}</p>
      )}
      {error && (
        <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>
      )}
    </div>
  )
}
