import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { DrawTool } from '../stores/appStore'
import { customTemplates } from '../custom/templates'
import { auxiliaryItems, auxPickMode } from '../custom/auxiliaryActions'
import { elementLabel, sortElements } from '../custom/elementLabels'

const drawTools: { id: DrawTool; label: string; labelEn: string }[] = [
  { id: 'select', label: '选择', labelEn: 'Select' },
  { id: 'point', label: '点', labelEn: 'Point' },
  { id: 'segment', label: '线段', labelEn: 'Segment' },
  { id: 'line', label: '直线', labelEn: 'Line' },
  { id: 'circle', label: '圆', labelEn: 'Circle' },
  { id: 'polygon', label: '多边形', labelEn: 'Polygon' },
  { id: 'regularPolygon', label: '正多边形', labelEn: 'Regular' },
  { id: 'midpoint', label: '中点', labelEn: 'Midpoint' },
  { id: 'perpendicular', label: '垂线', labelEn: 'Perp' },
  { id: 'parallel', label: '平行线', labelEn: 'Parallel' },
  { id: 'bisector', label: '角平分线', labelEn: 'Bisector' },
]

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function CustomPanel() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const drawTool = useAppStore((s) => s.drawTool)
  const setDrawTool = useAppStore((s) => s.setDrawTool)
  const doc = useAppStore((s) => s.doc)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const updateElement = useAppStore((s) => s.updateElement)
  const removeElement = useAppStore((s) => s.removeElement)
  const toggleElementVisible = useAppStore((s) => s.toggleElementVisible)
  const toggleFunctionVisible = useAppStore((s) => s.toggleFunctionVisible)
  const pendingSegmentFrom = useAppStore((s) => s.pendingSegmentFrom)
  const pendingPolygonVerts = useAppStore((s) => s.pendingPolygonVerts)
  const polygonSides = useAppStore((s) => s.polygonSides)
  const setPolygonSides = useAppStore((s) => s.setPolygonSides)
  const finishPolygon = useAppStore((s) => s.finishPolygon)
  const loadCustomTemplate = useAppStore((s) => s.loadCustomTemplate)
  const pendingAuxKind = useAppStore((s) => s.pendingAuxKind)
  const setPendingAuxKind = useAppStore((s) => s.setPendingAuxKind)
  const construction = useAppStore((s) => s.construction)

  const selected = doc.elements.find((e) => e.id === selectedId)
  const sortedElements = sortElements(doc.elements)
  const pendingAuxItem = auxiliaryItems.find((i) => i.id === pendingAuxKind)

  const constructionHint = (() => {
    if (!construction) return null
    if (construction.tool === 'midpoint') {
      return locale === 'zh'
        ? `中点：再点 ${2 - construction.points.length} 个点`
        : `Midpoint: pick ${2 - construction.points.length} more point(s)`
    }
    if (construction.tool === 'bisector') {
      return locale === 'zh'
        ? `角平分线：依次点 臂1 → 顶点 → 臂2（已 ${construction.points.length}/3）`
        : `Bisector: arm1 → vertex → arm2 (${construction.points.length}/3)`
    }
    if (construction.tool === 'perpendicular') {
      return construction.from
        ? locale === 'zh'
          ? '垂线：再点击一条边/线段'
          : 'Perp: click a segment'
        : locale === 'zh'
          ? '垂线：先点一点（过该点作垂线）'
          : 'Perp: click a point first'
    }
    if (construction.tool === 'parallel') {
      return construction.through
        ? locale === 'zh'
          ? '平行线：再点击一条边/线段'
          : 'Parallel: click a segment'
        : locale === 'zh'
          ? '平行线：先点一点（过该点作平行线）'
          : 'Parallel: click a point first'
    }
    return null
  })()

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">
      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '选择图形模板' : 'Graphic templates'}
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '点击模板载入示例，可继续编辑' : 'Click to load an editable example'}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {customTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => loadCustomTemplate(tpl.id)}
              className="px-2 py-2 rounded-lg text-xs border text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}
            >
              {locale === 'zh' ? tpl.zh : tpl.en}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={() => setDrawTool('point')}
            className="px-2 py-2 rounded-lg text-xs border"
            style={{ borderColor: 'var(--border)', background: 'var(--btn-bg)', color: 'var(--text)' }}
          >
            {locale === 'zh' ? '+ 添加自由点' : '+ Free point'}
          </button>
          <button
            type="button"
            onClick={() => setDrawTool('segment')}
            className="px-2 py-2 rounded-lg text-xs border"
            style={{ borderColor: 'var(--border)', background: 'var(--btn-bg)', color: 'var(--text)' }}
          >
            {locale === 'zh' ? '+ 添加线段' : '+ Segment'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '绘制工具' : 'Draw tools'}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {drawTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setDrawTool(tool.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: drawTool === tool.id ? 'var(--accent)' : 'var(--btn-bg)',
                color: drawTool === tool.id ? 'var(--accent-text)' : 'var(--text)',
              }}
            >
              {locale === 'zh' ? tool.label : tool.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs flex-wrap">
        <label style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '正多边形边数' : 'Regular polygon sides'}
        </label>
        <input
          type="number"
          min={3}
          max={24}
          value={polygonSides}
          onChange={(e) => setPolygonSides(Number(e.target.value))}
          className="w-14 px-2 py-1 rounded border"
          style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
        />
        <span style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh'
            ? '多边形：逐点点击，≥3 点后点首点或点「完成」；正多边形：点 1 次'
            : 'Polygon: click vertices, close on first point or Finish; Regular: 1 click'}
        </span>
      </div>

      {drawTool === 'polygon' && pendingPolygonVerts.length >= 3 && (
        <button
          type="button"
          onClick={() => finishPolygon()}
          className="w-full py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {locale === 'zh' ? '完成多边形' : 'Finish polygon'}
        </button>
      )}

      {(pendingSegmentFrom || pendingPolygonVerts.length > 0 || constructionHint) && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {constructionHint
            ? constructionHint
            : pendingSegmentFrom
              ? locale === 'zh'
                ? '线段：已选起点，再点终点'
                : 'Segment: pick end point'
              : locale === 'zh'
                ? `多边形：已点 ${pendingPolygonVerts.length} 个顶点（至少 3 个）`
                : `Polygon: ${pendingPolygonVerts.length} vertices (min 3)`}
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '辅助线' : 'Auxiliary lines'}
        </h3>
        <div className="text-xs mb-2 space-y-1 rounded-lg p-2" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
          {locale === 'zh' ? (
            <>
              <p>1. 点击辅助线按钮（高亮表示已选中）</p>
              <p>2. 在画布上点击目标：边/线段/三角形/四边形/顶点</p>
              <p>3. 高、中线、垂直平分线 → 点击一条边</p>
              <p>4. 角平分线 → 点击三角形的一个顶点</p>
              <p>5. 外接圆/内切圆/重心/垂心/欧拉线 → 点击三角形内部</p>
              <p>6. 对角线 → 点击四边形内部</p>
            </>
          ) : (
            <>
              <p>1. Click an auxiliary button (highlighted when active)</p>
              <p>2. Click the target on canvas: edge, segment, triangle, quad, or vertex</p>
              <p>3. Altitude, median, ⊥ bisector → click an edge</p>
              <p>4. Angle bisector → click a triangle vertex</p>
              <p>5. Circles, centroid, orthocenter, Euler → click inside triangle</p>
              <p>6. Diagonals → click inside quadrilateral</p>
            </>
          )}
        </div>
        {pendingAuxItem && (
          <p className="text-xs mb-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
            {locale === 'zh'
              ? `请在画布上选择目标：${pendingAuxItem.zh}（${auxPickMode(pendingAuxItem.id) === 'segment' ? '点击边' : auxPickMode(pendingAuxItem.id) === 'vertex' ? '点击顶点' : auxPickMode(pendingAuxItem.id) === 'quad' ? '点击四边形' : '点击三角形'}）`
              : `Pick target for: ${pendingAuxItem.en}`}
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {auxiliaryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={locale === 'zh' ? item.hint.zh : item.hint.en}
              onClick={() => setPendingAuxKind(pendingAuxKind === item.id ? null : item.id)}
              className="px-2 py-2 rounded-lg text-xs border text-left"
              style={{
                borderColor: 'var(--border)',
                background: pendingAuxKind === item.id ? 'var(--accent)' : 'var(--btn-bg)',
                color: pendingAuxKind === item.id ? 'var(--accent-text)' : 'var(--text)',
              }}
            >
              {locale === 'zh' ? item.zh : item.en}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {locale === 'zh' ? '元素列表' : 'Elements'}
        </h3>
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {sortedElements.map((el) => (
            <div key={el.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleElementVisible(el.id)}
                className="p-1 rounded opacity-70 hover:opacity-100 shrink-0"
                style={{ color: 'var(--text-muted)' }}
                title={locale === 'zh' ? '显示/隐藏' : 'Show/hide'}
              >
                <EyeIcon open={el.visible !== false} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(el.id)}
                className="flex-1 text-left px-2 py-1 rounded text-xs min-w-0"
                style={{
                  background: selectedId === el.id ? 'var(--btn-bg)' : 'transparent',
                  color: el.auxiliary ? 'var(--text-muted)' : 'var(--text)',
                  opacity: el.visible === false ? 0.45 : 1,
                }}
              >
                <span className="truncate block">{elementLabel(el, locale)}</span>
              </button>
            </div>
          ))}
          {(doc.functions ?? []).map((fn) => (
            <div key={fn.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleFunctionVisible(fn.id)}
                className="p-1 rounded opacity-70 hover:opacity-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <EyeIcon open={fn.visible !== false} />
              </button>
              <span className="flex-1 px-2 py-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                ƒ: {fn.expr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="space-y-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-semibold">
            {locale === 'zh' ? '选中元素' : 'Selected'} · {elementLabel(selected, locale)}
          </h3>
          {selected.type === 'point' && (
            <>
              <label className="flex items-center gap-2 text-xs">
                x
                <input
                  type="number"
                  step="0.1"
                  value={selected.x}
                  onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) } as never)}
                  className="flex-1 px-2 py-1 rounded border text-xs"
                  style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                y
                <input
                  type="number"
                  step="0.1"
                  value={selected.y}
                  onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) } as never)}
                  className="flex-1 px-2 py-1 rounded border text-xs"
                  style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              removeElement(selected.id)
              setSelectedId(null)
            }}
            className="w-full py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--btn-bg)', color: 'var(--text)' }}
          >
            {locale === 'zh' ? '删除' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}
