import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import { latexToExpr, latexTemplates } from '../core/latex/parse'
import { graphTheme } from '../utils/graphTheme'

const DEFAULT_PARAM_X: Record<string, number> = {
  a: 1,
  b: -2,
  c: -3,
  h: 0,
  k: 0,
  m: 1,
  n: 1,
}

export function LatexPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const latexDraft = useAppStore((s) => s.latexDraft)
  const setLatexDraft = useAppStore((s) => s.setLatexDraft)
  const addFunction = useAppStore((s) => s.addFunction)
  const nextCustomId = useAppStore((s) => s.nextCustomId)
  const doc = useAppStore((s) => s.doc)
  const toast = useToastStore((s) => s.show)

  const parsed = useMemo(() => latexToExpr(latexDraft), [latexDraft])
  const t = graphTheme()

  const renderToCanvas = () => {
    if (!parsed.expr || parsed.error) return
    const id = nextCustomId('f')
    addFunction({
      id,
      expr: parsed.expr,
      color: t.stroke,
      visible: true,
    })
    const ymin = doc.viewport.ymin
    const sliderY = ymin + (doc.viewport.ymax - ymin) * 0.12
    let slot = 0
    for (const p of parsed.params) {
      const exists = useAppStore.getState().doc.elements.some((e) => e.id === p)
      if (!exists) {
        const x0 = DEFAULT_PARAM_X[p] ?? 1
        useAppStore.getState().addElement({
          id: p,
          type: 'point',
          x: x0,
          y: sliderY + slot * 0.45,
          label: `${p}`,
          draggable: true,
        })
        slot += 1
      }
    }
    toast(
      locale === 'zh'
        ? parsed.params.length
          ? `已渲染；拖动参数点 ${parsed.params.join(',')}（横移改值）`
          : '已渲染到画布'
        : parsed.params.length
          ? `Rendered; drag ${parsed.params.join(',')} horizontally`
          : 'Rendered to canvas',
      'success',
    )
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">
      <h2 className="text-sm font-semibold">{locale === 'zh' ? 'LaTeX 公式' : 'LaTeX Formula'}</h2>
      <textarea
        value={latexDraft}
        onChange={(e) => setLatexDraft(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 rounded-xl border text-sm font-mono resize-none"
        style={{ borderColor: 'var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
        placeholder={locale === 'zh' ? '例如 f(x)=ax^2+bx+c 或 \\sin(x)' : 'e.g. f(x)=ax^2+bx+c or \\sin(x)'}
      />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {locale === 'zh'
          ? '字母参数会生成可拖动点：横向拖动改变参数值，曲线实时更新'
          : 'Letter params become draggable points; drag horizontally to change the value'}
      </p>

      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '快捷模板' : 'Quick templates'}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {latexTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setLatexDraft(tpl.latex)}
              className="px-2.5 py-1 rounded-full text-xs border"
              style={{ borderColor: 'var(--border)', background: 'var(--btn-bg)', color: 'var(--text)' }}
            >
              {locale === 'zh' ? tpl.zh : tpl.en}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'var(--btn-bg)' }}>
        <div className="font-medium">{locale === 'zh' ? '解析后的表达式' : 'Parsed expression'}</div>
        <code style={{ color: 'var(--text)' }}>{parsed.expr || '—'}</code>
        {parsed.params.length > 0 && (
          <div style={{ color: 'var(--text-muted)' }}>
            {locale === 'zh' ? '参数' : 'Params'}: {parsed.params.join(', ')}
          </div>
        )}
        {parsed.error && <div style={{ color: '#FF453A' }}>{parsed.error}</div>}
      </div>

      <button
        type="button"
        onClick={renderToCanvas}
        disabled={!parsed.expr || !!parsed.error}
        className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        {locale === 'zh' ? '渲染到画布' : 'Render to canvas'}
      </button>
    </div>
  )
}
