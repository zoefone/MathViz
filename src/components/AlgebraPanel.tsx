import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { buildAlgebraRows } from '../core/measure/compute'

export function AlgebraPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const doc = useAppStore((s) => s.doc)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const removeAnnotationAt = useAppStore((s) => s.removeAnnotationAt)

  const rows = useMemo(() => buildAlgebraRows(doc, locale), [doc, locale])

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">
      <div>
        <h2 className="text-sm font-semibold mb-1">
          {locale === 'zh' ? '代数视图' : 'Algebra view'}
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh'
            ? '实时显示坐标、长度、角度、面积与函数式；拖动点后自动更新'
            : 'Live coordinates, lengths, angles, areas and functions'}
        </p>
      </div>

      <div className="space-y-1">
        {rows.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {locale === 'zh' ? '画布为空，先从模板或自定义开始' : 'Canvas empty - start from a preset'}
          </p>
        )}
        {rows.map((row) => {
          const selectable =
            row.kind === 'point' || row.kind === 'length' || row.kind === 'circle' || row.kind === 'area'
          const elId =
            row.kind === 'point'
              ? row.id.replace(/^pt-/, '')
              : row.kind === 'length'
                ? row.id.replace(/^len-/, '')
                : row.kind === 'circle'
                  ? row.id.replace(/^cir-/, '')
                  : row.kind === 'area'
                    ? row.id.replace(/^area-/, '')
                    : null
          const active = elId && selectedId === elId
          return (
            <button
              key={row.id}
              type="button"
              disabled={!selectable || !elId}
              onClick={() => elId && setSelectedId(elId)}
              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono border"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--btn-bg)' : 'var(--card-bg)',
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{row.title}</span>
              <span className="ml-2">{row.value}</span>
            </button>
          )
        })}
      </div>

      {(doc.annotations ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {locale === 'zh' ? '测量标注' : 'Measurements'}
          </h3>
          <div className="space-y-1">
            {(doc.annotations ?? []).map((ann, i) => (
              <div
                key={ann.type + '-' + i}
                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                style={{ background: 'var(--input-bg)' }}
              >
                <span className="flex-1 truncate">
                  {ann.type}: {ann.label}
                  {ann.points ? ' (' + ann.points.join(',') + ')' : ''}
                </span>
                <button
                  type="button"
                  className="px-2 py-0.5 rounded"
                  style={{ background: 'var(--btn-bg)', color: 'var(--text)' }}
                  onClick={() => removeAnnotationAt(i)}
                >
                  {locale === 'zh' ? '删' : 'Del'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
