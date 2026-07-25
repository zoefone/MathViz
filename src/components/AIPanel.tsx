import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { generateMvzFromPrompt } from '../ai/pipeline'
import { t } from '../i18n'

const EXAMPLES_ZH = [
  '画一个直角三角形并标出三条高',
  '画二次函数 y=x^2-2x-3 及与 x 轴交点',
  '画椭圆并标出长轴短轴端点',
  '画向量加法的平行四边形法则',
  '画单位圆与角 θ 的正弦线',
]

const EXAMPLES_EN = [
  'Right triangle with three altitudes',
  'Parabola y=x^2-2x-3 with x-intercepts',
  'Ellipse with major/minor axis endpoints',
  'Vector addition parallelogram',
  'Unit circle with sine line for angle θ',
]

export function AIPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const ai = useSettingsStore((s) => s.ai)
  const setActivePanel = useAppStore((s) => s.setActivePanel)
  const setDoc = useAppStore((s) => s.setDoc)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const examples = locale === 'zh' ? EXAMPLES_ZH : EXAMPLES_EN
  const needsKey = ai.mode === 'api' && !ai.apiKey.trim()

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    if (needsKey) {
      setError(
        locale === 'zh'
          ? '请先在「设置」里填写 API Key，或切换到本地 AI'
          : 'Set an API Key in Settings, or switch to Local AI',
      )
      return
    }
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
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      <h3 className="text-sm font-semibold">{t(locale, 'ai')}</h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {ai.mode === 'api'
          ? `${t(locale, 'apiMode')}: ${ai.provider}`
          : `${t(locale, 'localMode')}: ${ai.localModel}`}
      </p>

      {needsKey && (
        <div
          className="text-xs rounded-xl px-3 py-2 space-y-1"
          style={{ background: 'var(--btn-bg)', color: 'var(--text)' }}
        >
          <p>
            {locale === 'zh'
              ? '未配置 API Key。可：① 去设置填写 Key；② 改用本地 WebLLM（需 WebGPU）；③ 先用「模板」体验。'
              : 'No API key. Set one in Settings, use Local WebLLM (needs WebGPU), or try Presets.'}
          </p>
          <button
            type="button"
            className="underline"
            onClick={() => setActivePanel('settings')}
          >
            {locale === 'zh' ? '打开设置 →' : 'Open settings →'}
          </button>
        </div>
      )}

      <div>
        <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '示例提示（点击填入）' : 'Example prompts'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="px-2 py-1 rounded-full text-xs border text-left"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

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
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {status}
        </p>
      )}
      {error && <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>}
    </div>
  )
}
