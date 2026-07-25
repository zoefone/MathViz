import { useEffect, useRef, useCallback } from 'react'
import JXG from 'jsxgraph'
import { useAppStore } from '../stores/appStore'
import { useToastStore } from '../stores/toastStore'
import { useSettingsStore } from '../stores/settingsStore'
import {
  buildMvzOnBoard,
  updatePointPositions,
  zoomBoard,
  resizeBoardContainer,
} from '../core/mvz/jsxgraph-builder'
import { setBoardInstance } from '../core/mvz/boardRef'
import { applyFunctionBinds } from '../core/functions/bind'
import {
  applyDragConstraint,
  throughPointAfterVertexMove,
  tangentHelperAfterGliderMove,
} from '../core/functions/constraints'
import { applyBoardTheme } from '../utils/graphTheme'
import type { MvzDocument } from '../core/mvz/types'
import { auxPickMode } from '../custom/auxiliaryActions'
import {
  pickPolygonAt,
  pickSegmentAt,
  pickVertexAt,
  triangleForVertex,
} from '../custom/pickTarget'

export function MathCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<JXG.Board | null>(null)
  const jsxPointsRef = useRef<Record<string, JXG.Point>>({})
  const syncRef = useRef<((doc: MvzDocument) => MvzDocument) | null>(null)
  const lastStructureKey = useRef('')

  const doc = useAppStore((s) => s.doc)
  const structureKey = useAppStore((s) => s.structureKey)
  const syncDocFromBoard = useAppStore((s) => s.syncDocFromBoard)
  const activePanel = useAppStore((s) => s.activePanel)
  const drawTool = useAppStore((s) => s.drawTool)
  const pendingAuxKind = useAppStore((s) => s.pendingAuxKind)
  const darkMode = useSettingsStore((s) => s.ui.darkMode)
  const showGrid = useSettingsStore((s) => s.ui.showGrid)
  const showAxes = useSettingsStore((s) => s.ui.showAxes)
  const lastTheme = useRef(darkMode)
  const boardChromeKey = `${showGrid}-${showAxes}`

  const initBoard = useCallback(
    (document: MvzDocument) => {
      if (!containerRef.current) return

      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current)
        boardRef.current = null
        setBoardInstance(null)
      }

      const vp = document.viewport
      const el = containerRef.current
      const drawing =
        useAppStore.getState().activePanel === 'custom' &&
        useAppStore.getState().drawTool !== 'select'
      const ui = useSettingsStore.getState().ui

      const board = JXG.JSXGraph.initBoard(el, {
        boundingbox: [vp.xmin, vp.ymax, vp.xmax, vp.ymin],
        axis: ui.showAxes,
        grid: ui.showGrid,
        showNavigation: false,
        showCopyright: false,
        keepaspectratio: true,
        pan: { enabled: true, needTwoFingers: drawing, needshift: false },
        zoom: { wheel: true, needshift: false, factor: 1.15 },
        showInfobox: false,
        renderer: 'svg',
        resize: { enabled: true, throttle: 50 },
      } as unknown as JXG.BoardAttributes)

      boardRef.current = board
      setBoardInstance(board)

      const { syncBasePointsToDoc, points } = buildMvzOnBoard(board, document, darkMode)
      jsxPointsRef.current = points
      syncRef.current = syncBasePointsToDoc
      applyBoardTheme(board, darkMode)

      for (const [id, pt] of Object.entries(points)) {
        const pel = document.elements.find((e) => e.id === id && e.type === 'point')
        if (!pel || pel.type !== 'point' || pel.draggable === false) continue

        pt.on('drag', () => {
          const state = useAppStore.getState()
          let x = pt.X()
          let y = pt.Y()
          if (useSettingsStore.getState().ui.snapToGrid) {
            x = Math.round(x)
            y = Math.round(y)
          }
          const [cx, cy] = applyDragConstraint(id, x, y, state.doc)
          if (Math.abs(cx - pt.X()) > 1e-9 || Math.abs(cy - pt.Y()) > 1e-9) {
            pt.setPositionDirectly(JXG.COORDS_BY_USER, [cx, cy])
          }
          const snap = throughPointAfterVertexMove(state.doc, id)
          if (snap) {
            const tp = points[snap.throughId]
            if (tp) tp.setPositionDirectly(JXG.COORDS_BY_USER, [snap.x, snap.y])
          }
          const liveDoc: MvzDocument = {
            ...state.doc,
            elements: state.doc.elements.map((e) =>
              e.id === id && e.type === 'point' ? { ...e, x: cx, y: cy } : e,
            ),
          }
          const th = tangentHelperAfterGliderMove(liveDoc, id)
          if (th) {
            const hp = points[th.helperId]
            if (hp) hp.setPositionDirectly(JXG.COORDS_BY_USER, [th.x, th.y])
          }
          board.update()
        })

        pt.on('up', () => {
          let synced = syncRef.current?.(useAppStore.getState().doc)
          if (!synced) return
          synced = applyFunctionBinds(synced)
          const th = tangentHelperAfterGliderMove(synced, id)
          if (th) {
            synced = {
              ...synced,
              elements: synced.elements.map((e) =>
                e.id === th.helperId && e.type === 'point'
                  ? { ...e, x: th.x, y: th.y }
                  : e,
              ),
            }
          }
          syncDocFromBoard(synced, false)
        })
      }

      board.on('down', (e: MouseEvent) => {
        const state = useAppStore.getState()
        if (state.pendingAuxKind) {
          handleAuxiliaryPick(board, e, state)
          return
        }
        if (state.activePanel === 'custom' && state.drawTool === 'select') {
          handleSelect(board, e, state)
          return
        }
        if (state.activePanel === 'custom' && state.drawTool !== 'select') {
          handleCustomDraw(board, e, state)
        }
      })

      board.update()
      requestAnimationFrame(() => {
        if (boardRef.current) {
          resizeBoardContainer(boardRef.current)
        }
      })
    },
    [syncDocFromBoard, darkMode, boardChromeKey],
  )

  useEffect(() => {
    const themeChanged = lastTheme.current !== darkMode
    lastTheme.current = darkMode
    if (themeChanged) lastStructureKey.current = ''
    const keyed = `${structureKey}::${boardChromeKey}`
    if (keyed === lastStructureKey.current && boardRef.current && !themeChanged) {
      updatePointPositions(jsxPointsRef.current, doc)
      boardRef.current.update()
      return
    }
    lastStructureKey.current = keyed
    initBoard(doc)
    return () => {
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current)
        boardRef.current = null
        setBoardInstance(null)
      }
    }
  }, [structureKey, doc, initBoard, darkMode, boardChromeKey])

  useEffect(() => {
    const board = boardRef.current
    if (board) applyBoardTheme(board, darkMode)
  }, [darkMode, structureKey])

  useEffect(() => {
    const el = containerRef.current
    const shell = el?.parentElement
    if (!el) return

    const fit = () => {
      const board = boardRef.current
      if (!board) return
      resizeBoardContainer(board)
    }

    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    if (shell) ro.observe(shell)
    window.addEventListener('resize', fit)
    fit()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [structureKey])

  const handleZoom = (factor: number) => {
    if (boardRef.current) zoomBoard(boardRef.current, factor)
  }

  const isDrawing = activePanel === 'custom' && drawTool !== 'select' && !pendingAuxKind

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div
        ref={containerRef}
        id="mathviz-board"
        className="w-full h-full jxgbox"
        style={{
          background: 'var(--canvas-bg)',
          cursor: isDrawing || pendingAuxKind ? 'crosshair' : 'grab',
        }}
      />
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10 pointer-events-auto safe-area-br">
        <button
          type="button"
          title="放大"
          className="w-9 h-9 rounded-lg text-lg font-medium shadow-sm border"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          onClick={() => handleZoom(1.25)}
        >
          +
        </button>
        <button
          type="button"
          title="缩小"
          className="w-9 h-9 rounded-lg text-lg font-medium shadow-sm border"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          onClick={() => handleZoom(0.8)}
        >
          −
        </button>
      </div>
    </div>
  )
}

export function getBoardElement(): HTMLElement | null {
  return document.getElementById('mathviz-board')
}

function handleSelect(
  board: JXG.Board,
  e: MouseEvent,
  state: ReturnType<typeof useAppStore.getState>,
) {
  if ((e.target as Element)?.closest?.('.JXGtext')) return
  const [ux, uy] = board.getUsrCoordsOfMouse(e)
  const vid = pickVertexAt(state.doc, ux, uy, 0.5)
  if (vid) {
    state.setSelectedId(vid)
    return
  }
  const seg = pickSegmentAt(state.doc, ux, uy, 0.5)
  if (seg?.sourceId) {
    state.setSelectedId(seg.sourceId)
    return
  }
  state.setSelectedId(null)
}

function handleAuxiliaryPick(
  board: JXG.Board,
  e: MouseEvent,
  state: ReturnType<typeof useAppStore.getState>,
) {
  if ((e.target as Element)?.closest?.('.JXGtext')) return
  const [ux, uy] = board.getUsrCoordsOfMouse(e)
  const kind = state.pendingAuxKind
  if (!kind) return

  const mode = auxPickMode(kind)
  const doc = state.doc
  const locale = useSettingsStore.getState().ui.locale
  const toast = useToastStore.getState().show
  const miss = () =>
    toast(locale === 'zh' ? '未点到目标，请再试' : 'Missed target, try again', 'error')

  if (mode === 'segment') {
    const seg = pickSegmentAt(doc, ux, uy)
    if (seg) state.applyAuxiliaryToTarget(kind, { type: 'segment', between: seg.between })
    else miss()
    return
  }

  if (mode === 'vertex') {
    const vid = pickVertexAt(doc, ux, uy)
    if (!vid) {
      miss()
      return
    }
    const tri = triangleForVertex(doc, vid)
    if (tri) {
      state.applyAuxiliaryToTarget(kind, { type: 'vertex', id: vid, triangle: tri })
    } else miss()
    return
  }

  if (mode === 'quad') {
    const poly = pickPolygonAt(doc, ux, uy)
    if (poly?.type === 'polygon' && poly.vertices.length === 4) {
      state.applyAuxiliaryToTarget(kind, {
        type: 'quad',
        vertices: poly.vertices as [string, string, string, string],
      })
    } else miss()
    return
  }

  const poly = pickPolygonAt(doc, ux, uy)
  if (poly?.type === 'polygon' && poly.vertices.length === 3) {
    state.applyAuxiliaryToTarget(kind, {
      type: 'triangle',
      vertices: poly.vertices as [string, string, string],
    })
  } else miss()
}

function ensurePoint(
  state: ReturnType<typeof useAppStore.getState>,
  x: number,
  y: number,
): string {
  let px = x
  let py = y
  if (useSettingsStore.getState().ui.snapToGrid) {
    px = Math.round(px)
    py = Math.round(py)
  }
  const existing = pickVertexAt(state.doc, px, py, 0.35)
  if (existing) return existing
  const id = state.nextCustomId('P')
  state.addElement({ id, type: 'point', x: px, y: py, label: id, draggable: true })
  return id
}

function lineRefFromPick(
  state: ReturnType<typeof useAppStore.getState>,
  x: number,
  y: number,
): string | null {
  for (const el of state.doc.elements) {
    if (el.type === 'line') {
      const a = state.doc.elements.find((e) => e.id === el.through[0] && e.type === 'point')
      const b = state.doc.elements.find((e) => e.id === el.through[1] && e.type === 'point')
      if (a?.type === 'point' && b?.type === 'point') {
        const d = distPointToLine(x, y, a.x, a.y, b.x, b.y)
        if (d < 0.45) return el.id
      }
    }
  }
  const seg = pickSegmentAt(state.doc, x, y, 0.55)
  if (seg) return `seg:${seg.between[0]}|${seg.between[1]}`
  return null
}

function distPointToLine(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy)
  if (len < 1e-12) return Math.hypot(px - ax, py - ay)
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
}

function handleCustomDraw(
  board: JXG.Board,
  e: MouseEvent,
  state: ReturnType<typeof useAppStore.getState>,
) {
  if ((e.target as Element)?.closest?.('.JXGtext')) return
  const coords = board.getUsrCoordsOfMouse(e)
  const x = coords[0]
  const y = coords[1]
  const locale = useSettingsStore.getState().ui.locale
  const toast = useToastStore.getState().show

  if (state.drawTool === 'point') {
    const id = state.nextCustomId('P')
    state.addElement({ id, type: 'point', x, y, label: id, draggable: true })
    return
  }

  if (state.drawTool === 'midpoint') {
    const pid = ensurePoint(state, x, y)
    const step = state.construction
    const points = step?.tool === 'midpoint' ? [...step.points, pid] : [pid]
    if (points.length < 2) {
      state.setConstruction({ tool: 'midpoint', points })
      return
    }
    state.addElement({
      id: state.nextCustomId('M'),
      type: 'midpoint',
      of: [points[0], points[1]],
      label: 'M',
    })
    state.setConstruction({ tool: 'midpoint', points: [] })
    toast(locale === 'zh' ? '已添加中点' : 'Midpoint added', 'success')
    return
  }

  if (state.drawTool === 'bisector') {
    const pid = ensurePoint(state, x, y)
    const step = state.construction
    const points = step?.tool === 'bisector' ? [...step.points, pid] : [pid]
    if (points.length < 3) {
      state.setConstruction({ tool: 'bisector', points })
      return
    }
    state.addElement({
      id: state.nextCustomId('bis'),
      type: 'angleBisector',
      arm1: points[0],
      vertex: points[1],
      arm2: points[2],
      auxiliary: true,
      style: 'dashed',
    })
    state.setConstruction({ tool: 'bisector', points: [] })
    toast(locale === 'zh' ? '已添加角平分线' : 'Bisector added', 'success')
    return
  }

  if (state.drawTool === 'perpendicular' || state.drawTool === 'parallel') {
    const step = state.construction
    const needPoint = state.drawTool === 'perpendicular' ? !step || step.tool !== 'perpendicular' || !step.from : !step || step.tool !== 'parallel' || !step.through

    if (needPoint) {
      const pid = ensurePoint(state, x, y)
      if (state.drawTool === 'perpendicular') {
        state.setConstruction({ tool: 'perpendicular', from: pid })
      } else {
        state.setConstruction({ tool: 'parallel', through: pid })
      }
      return
    }

    const seg = pickSegmentAt(state.doc, x, y, 0.55)
    if (!seg) {
      toast(locale === 'zh' ? '请点击一条边/线段' : 'Click a segment', 'error')
      return
    }
    const lineRef = `seg:${seg.between[0]}|${seg.between[1]}`
    if (state.drawTool === 'perpendicular' && step?.tool === 'perpendicular' && step.from) {
      state.addElement({
        id: state.nextCustomId('perp'),
        type: 'perpendicular',
        from: step.from,
        to: lineRef,
        fullLine: true,
        auxiliary: true,
        style: 'dashed',
      })
      state.setConstruction({ tool: 'perpendicular' })
      toast(locale === 'zh' ? '已添加垂线' : 'Perpendicular added', 'success')
    } else if (state.drawTool === 'parallel' && step?.tool === 'parallel' && step.through) {
      state.addElement({
        id: state.nextCustomId('par'),
        type: 'parallel',
        through: step.through,
        to: lineRef,
        auxiliary: true,
        style: 'dashed',
      })
      state.setConstruction({ tool: 'parallel' })
      toast(locale === 'zh' ? '已添加平行线' : 'Parallel added', 'success')
    }
    return
  }

  if (state.drawTool === 'ray') {
    const id = ensurePoint(state, x, y)
    const step = state.construction
    if (!step || step.tool !== 'ray' || !step.from) {
      state.setConstruction({ tool: 'ray', from: id })
      return
    }
    if (step.from === id) return
    state.addElement({
      id: state.nextCustomId('ray'),
      type: 'ray',
      from: step.from,
      through: id,
    })
    state.setConstruction({ tool: 'ray' })
    toast(locale === 'zh' ? '已添加射线' : 'Ray added', 'success')
    return
  }

  if (state.drawTool === 'intersect') {
    const ref = lineRefFromPick(state, x, y)
    if (!ref) {
      toast(locale === 'zh' ? '请点击直线或线段' : 'Click a line/segment', 'error')
      return
    }
    const step = state.construction
    const lines = step?.tool === 'intersect' ? [...step.lines, ref] : [ref]
    if (lines.length < 2) {
      state.setConstruction({ tool: 'intersect', lines })
      return
    }
    state.addElement({
      id: state.nextCustomId('I'),
      type: 'intersection',
      of: [lines[0], lines[1]],
      label: 'I',
    })
    state.setConstruction({ tool: 'intersect', lines: [] })
    toast(locale === 'zh' ? '已添加交点' : 'Intersection added', 'success')
    return
  }

  if (state.drawTool === 'measureDistance') {
    const pid = ensurePoint(state, x, y)
    const step = state.construction
    const points = step?.tool === 'measureDistance' ? [...step.points, pid] : [pid]
    if (points.length < 2) {
      state.setConstruction({ tool: 'measureDistance', points })
      return
    }
    state.addAnnotation({
      type: 'distance',
      points: [points[0], points[1]],
      label: `${points[0]}${points[1]}`,
    })
    state.setConstruction({ tool: 'measureDistance', points: [] })
    toast(locale === 'zh' ? '已标注距离' : 'Distance marked', 'success')
    return
  }

  if (state.drawTool === 'measureAngle') {
    const pid = ensurePoint(state, x, y)
    const step = state.construction
    const points = step?.tool === 'measureAngle' ? [...step.points, pid] : [pid]
    if (points.length < 3) {
      state.setConstruction({ tool: 'measureAngle', points })
      return
    }
    state.addAnnotation({
      type: 'angle',
      points: [points[0], points[1], points[2]],
      label: `∠${points[1]}`,
    })
    state.setConstruction({ tool: 'measureAngle', points: [] })
    toast(locale === 'zh' ? '已标注角度' : 'Angle marked', 'success')
    return
  }

  if (state.drawTool === 'measureArea') {
    const poly = pickPolygonAt(state.doc, x, y)
    if (poly?.type !== 'polygon') {
      toast(locale === 'zh' ? '请点击多边形内部' : 'Click inside a polygon', 'error')
      return
    }
    state.addAnnotation({
      type: 'area',
      points: poly.vertices,
      label: poly.label ?? poly.id,
    })
    toast(locale === 'zh' ? '已标注面积' : 'Area marked', 'success')
    return
  }

  if (state.drawTool === 'segment' || state.drawTool === 'line') {
    const id = ensurePoint(state, x, y)
    if (!state.pendingSegmentFrom) {
      state.setPendingSegmentFrom(id)
    } else {
      const from = state.pendingSegmentFrom
      state.setPendingSegmentFrom(null)
      if (from === id) return
      if (state.drawTool === 'segment') {
        state.addElement({ id: state.nextCustomId('s'), type: 'segment', between: [from, id] })
      } else {
        state.addElement({ id: state.nextCustomId('l'), type: 'line', through: [from, id] })
      }
    }
    return
  }

  if (state.drawTool === 'circle') {
    const centerId = state.nextCustomId('O')
    state.addElement({ id: centerId, type: 'point', x, y, label: 'O', draggable: true })
    const rimId = state.nextCustomId('P')
    state.addElement({ id: rimId, type: 'point', x: x + 2, y, label: 'P', draggable: true })
    state.addElement({ id: state.nextCustomId('c'), type: 'circle', center: centerId, through: rimId })
    return
  }

  if (state.drawTool === 'regularPolygon') {
    const n = state.polygonSides
    const cx = x
    const cy = y
    const r = 2
    const vertIds: string[] = []
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2
      const pid = state.nextCustomId('V')
      vertIds.push(pid)
      state.addElement({
        id: pid,
        type: 'point',
        x: cx + r * Math.cos(ang),
        y: cy + r * Math.sin(ang),
        label: pid,
        draggable: true,
      })
    }
    state.addElement({ id: state.nextCustomId('poly'), type: 'polygon', vertices: vertIds })
    return
  }

  if (state.drawTool === 'polygon') {
    const pending = state.pendingPolygonVerts
    if (pending.length >= 3) {
      const first = state.doc.elements.find((e) => e.id === pending[0] && e.type === 'point')
      if (first?.type === 'point' && Math.hypot(x - first.x, y - first.y) < 0.35) {
        state.addElement({ id: state.nextCustomId('poly'), type: 'polygon', vertices: pending })
        state.clearPolygonVerts()
        return
      }
    }
    const id = state.nextCustomId('V')
    state.addElement({ id, type: 'point', x, y, label: id, draggable: true })
    state.pushPolygonVertex(id)
  }
}
