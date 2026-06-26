import { useSettingsStore, PROVIDER_DEFAULTS, type Provider } from '../stores/settingsStore'
import { t } from '../i18n'

const LOCAL_MODELS = [
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
]

export function SettingsPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const ai = useSettingsStore((s) => s.ai)
  const setAi = useSettingsStore((s) => s.setAi)
  const setUi = useSettingsStore((s) => s.setUi)

  const inputClass =
    'w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1'
  const labelClass = 'text-xs font-medium mb-1 block'

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="text-sm font-semibold">{t(locale, 'settings')}</h3>

      <div>
        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
          AI 模式
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setAi({ mode: 'api' })}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{
              borderColor: ai.mode === 'api' ? 'var(--accent)' : 'var(--border)',
              background: ai.mode === 'api' ? 'var(--btn-bg)' : 'transparent',
              color: 'var(--text)',
            }}
          >
            {t(locale, 'apiMode')}
          </button>
          <button
            onClick={() => setAi({ mode: 'local' })}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{
              borderColor: ai.mode === 'local' ? 'var(--accent)' : 'var(--border)',
              background: ai.mode === 'local' ? 'var(--btn-bg)' : 'transparent',
              color: 'var(--text)',
            }}
          >
            {t(locale, 'localMode')}
          </button>
        </div>
      </div>

      {ai.mode === 'api' && (
        <>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
              {t(locale, 'provider')}
            </label>
            <select
              value={ai.provider}
              onChange={(e) => setAi({ provider: e.target.value as Provider })}
              className={inputClass}
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
            >
              <option value="openai">OpenAI (GPT)</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="relay">中转站 / Custom Relay</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
              {t(locale, 'baseURL')}
            </label>
            <input
              value={ai.baseURL}
              onChange={(e) => setAi({ baseURL: e.target.value })}
              className={inputClass}
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              placeholder={PROVIDER_DEFAULTS[ai.provider].baseURL}
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
              {t(locale, 'apiKey')}
            </label>
            <input
              type="password"
              value={ai.apiKey}
              onChange={(e) => setAi({ apiKey: e.target.value })}
              className={inputClass}
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
              {t(locale, 'model')}
            </label>
            <input
              value={ai.model}
              onChange={(e) => setAi({ model: e.target.value })}
              className={inputClass}
              style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
            />
          </div>
        </>
      )}

      {ai.mode === 'local' && (
        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            {t(locale, 'localModel')}
          </label>
          <select
            value={ai.localModel}
            onChange={(e) => setAi({ localModel: e.target.value })}
            className={inputClass}
            style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
          >
            {LOCAL_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            需要 WebGPU，首次使用需下载模型
          </p>
        </div>
      )}

      <div>
        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
          {t(locale, 'language')}
        </label>
        <select
          value={locale}
          onChange={(e) => setUi({ locale: e.target.value as 'zh' | 'en' })}
          className={inputClass}
          style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

    </div>
  )
}
