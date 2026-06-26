import { useEffect, useRef, useCallback } from 'react'
import JXG from 'jsxgraph'
import { useAppStore } from '../stores/appStore'
import {
  buildMvzOnBoard,
  updatePointPositions,
  zoomBoard,
  resizeBoardContainer,
} from '../core/mvz/jsxgraph-builder'
import { setBoardInstance } from '../core/mvz/boardRef'
import { applyFunctionBinds } from '../core/functions/bind'
import { applyDragConstraint, throughPointAfterVertexMove } from '../core/functions/constraints'
import { applyBoardTheme } from '../utils/graphTheme'
import { useSettingsStore } from '../stores/settingsStore'
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
  const lastTheme = useRef(darkMode)

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

      const board = JXG.JSXGraph.initBoard(el, {
        boundingbox: [vp.xmin, vp.ymax, vp.xmax, vp.ymin],
        axis: true,
        showNavigation: false,
        showCopyright: false,
        keepaspectratio: true,
        pan: { enabled: true, needTwoFingers: false, needshift: false },
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
          const [cx, cy] = applyDragConstraint(id, pt.X(), pt.Y(), state.doc)
          if (Math.abs(cx - pt.X()) > 1e-9 || Math.abs(cy - pt.Y()) > 1e-9) {
            pt.setPositionDirectly(JXG.COORDS_BY_USER, [cx, cy])
          }
          const snap = throughPointAfterVertexMove(state.doc, id)
          if (snap) {
            const tp = points[snap.throughId]
            if (tp) tp.setPositionDirectly(JXG.COORDS_BY_USER, [snap.x, snap.y])
          }
          board.update()
        })

        pt.on('up', () => {
          const synced = syncRef.current?.(useAppStore.getState().doc)
          if (synced) syncDocFromBoard(applyFunctionBinds(synced), false)
        })
      }

      board.on('down', (e: MouseEvent) => {
        const state = useAppStore.getState()
        if (state.pendingAuxKind) {
          handleAuxiliaryPick(board, e, state)
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
    [syncDocFromBoard, darkMode],
  )

  useEffect(() => {
    const themeChanged = lastTheme.current !== darkMode
    lastTheme.current = darkMode
    if (themeChanged) {
      lastStructureKey.current = ''
    }
    if (structureKey === lastStructureKey.current && boardRef.current && !themeChanged) {
      updatePointPositions(jsxPointsRef.current, doc)
      boardRef.current.update()
      return
    }
    lastStructureKey.current = structureKey
    initBoard(doc)
    return () => {
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current)
        boardRef.current = null
        setBoardInstance(null)
      }
    }
  }, [structureKey, doc, initBoard, darkMode])

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
          cursor: isDrawing ? 'crosshair' : 'grab',
        }}
      />
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10 pointer-events-auto">
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

  if (mode === 'segment') {
    const seg = pickSegmentAt(doc, ux, uy)
    if (seg) state.applyAuxiliaryToTarget(kind, { type: 'segment', between: seg.between })
    return
  }

  if (mode === 'vertex') {
    const vid = pickVertexAt(doc, ux, uy)
    if (!vid) return
    const tri = triangleForVertex(doc, vid)
    if (tri) {
      state.applyAuxiliaryToTarget(kind, { type: 'vertex', id: vid, triangle: tri })
    }
    return
  }

  if (mode === 'quad') {
    const poly = pickPolygonAt(doc, ux, uy)
    if (poly?.type === 'polygon' && poly.vertices.length === 4) {
      state.applyAuxiliaryToTarget(kind, {
        type: 'quad',
        vertices: poly.vertices as [string, string, string, string],
      })
    }
    return
  }

  const poly = pickPolygonAt(doc, ux, uy)
  if (poly?.type === 'polygon' && poly.vertices.length === 3) {
    state.applyAuxiliaryToTarget(kind, {
      type: 'triangle',
      vertices: poly.vertices as [string, string, string],
    })
  }
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

  if (state.drawTool === 'point') {
    const id = state.nextCustomId('P')
    state.addElement({ id, type: 'point', x, y, label: id, draggable: true })
    return
  }

  if (state.drawTool === 'segment' || state.drawTool === 'line') {
    const id = state.nextCustomId('P')
    state.addElement({ id, type: 'point', x, y, label: id, draggable: true })
    if (!state.pendingSegmentFrom) {
      state.setPendingSegmentFrom(id)
    } else {
      const from = state.pendingSegmentFrom
      state.setPendingSegmentFrom(null)
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
    return
  }
}
