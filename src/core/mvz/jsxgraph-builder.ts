import JXG from 'jsxgraph'
import { collectExprParams, evaluateFunction } from '../functions/plot'
import { evalBoundFunction, getPointCoords } from '../functions/bind'
import { fmt } from '../measure/compute'
import { graphTheme } from '../../utils/graphTheme'
import type { MvzDocument, MvzElement, FunctionDef } from './types'

type Board = JXG.Board
type GeoPoint = JXG.Point
type GeoLine = JXG.Line

function isVisible(el: { visible?: boolean }): boolean {
  return el.visible !== false
}

function dashStyle(style?: string): number {
  if (style === 'dashed') return 2
  if (style === 'dotted') return 1
  return 0
}

function styleAttrs(el: MvzElement, darkMode?: boolean) {
  const t = graphTheme(darkMode)
  const auxiliary = el.auxiliary ?? false
  return {
    strokeColor: el.color ?? (auxiliary ? t.strokeMuted : t.stroke),
    strokeWidth: el.thickness ?? (auxiliary ? 1 : 2),
    dash: dashStyle(el.style ?? (auxiliary ? 'dashed' : 'solid')),
    highlight: false,
    visible: isVisible(el),
  }
}

function parseSegmentRef(ref: string): [string, string] | null {
  const explicit = ref.match(/^seg:([^|]+)\|([^|]+)$/)
  if (explicit) return [explicit[1], explicit[2]]
  const m = ref.match(/^([A-Za-z0-9_]+)([A-Za-z0-9_]+)$/)
  if (!m) return null
  return [m[1], m[2]]
}

function getLineForRef(
  board: Board,
  ref: string,
  points: Record<string, GeoPoint>,
  lines: Record<string, GeoLine>,
): GeoLine {
  if (lines[ref]) return lines[ref]
  const seg = parseSegmentRef(ref)
  if (seg && points[seg[0]] && points[seg[1]]) {
    const line = board.create('line', [points[seg[0]], points[seg[1]]], {
      visible: false,
      fixed: true,
      withLabel: false,
    }) as GeoLine
    lines[ref] = line
    return line
  }
  if (points[ref]) {
    const p = points[ref]
    const helper = board.create('point', [() => p.X() + 1, () => p.Y()], {
      visible: false,
      fixed: true,
    }) as GeoPoint
    const line = board.create('line', [p, helper], {
      visible: false,
      fixed: true,
      withLabel: false,
    }) as GeoLine
    lines[ref] = line
    return line
  }
  throw new Error(`Cannot resolve line ref: ${ref}`)
}

function liveDocFromPoints(doc: MvzDocument, jsxPoints: Record<string, GeoPoint>, baseIds: Set<string>): MvzDocument {
  return {
    ...doc,
    elements: doc.elements.map((el) => {
      if (el.type !== 'point' || !baseIds.has(el.id)) return el
      const pt = jsxPoints[el.id]
      if (!pt) return el
      return { ...el, x: pt.X(), y: pt.Y() }
    }),
  }
}

function paramScopeFromLive(live: MvzDocument, expr: string): Record<string, number> {
  const scope: Record<string, number> = {}
  for (const id of collectExprParams(expr)) {
    const pt = getPointCoords(live, id)
    if (pt) scope[id] = pt.x
  }
  return scope
}

function makeYFn(
  fn: FunctionDef,
  doc: MvzDocument,
  jsxPoints: Record<string, GeoPoint>,
  baseIds: Set<string>,
): (x: number) => number {
  if (fn.bind) {
    return (x: number) => {
      const live = liveDocFromPoints(doc, jsxPoints, baseIds)
      const y = evalBoundFunction(x, fn.bind!, live)
      return y ?? NaN
    }
  }
  return (x: number) => {
    const live = liveDocFromPoints(doc, jsxPoints, baseIds)
    const scope = paramScopeFromLive(live, fn.expr)
    return evaluateFunction(fn.expr, x, scope) ?? NaN
  }
}

function axisVectors(
  doc: MvzDocument,
  centerId: string,
  axis1Id: string,
  axis2Id: string,
): { ox: number; oy: number; ux: number; uy: number; a: number; vx: number; vy: number; b: number } | null {
  const o = getPointCoords(doc, centerId)
  const p1 = getPointCoords(doc, axis1Id)
  const p2 = getPointCoords(doc, axis2Id)
  if (!o || !p1 || !p2) return null
  const dx1 = p1.x - o.x
  const dy1 = p1.y - o.y
  const a = Math.hypot(dx1, dy1)
  if (a < 1e-10) return null
  const ux = dx1 / a
  const uy = dy1 / a
  const dx2 = p2.x - o.x
  const dy2 = p2.y - o.y
  const b = Math.hypot(dx2, dy2)
  if (b < 1e-10) return null
  const vx = dx2 / b
  const vy = dy2 / b
  return { ox: o.x, oy: o.y, ux, uy, a, vx, vy, b }
}

function plotBoundCurve(
  board: Board,
  fn: FunctionDef,
  doc: MvzDocument,
  jsxPoints: Record<string, GeoPoint>,
  baseIds: Set<string>,
  color: string,
) {
  const bind = fn.bind!
  const live = () => liveDocFromPoints(doc, jsxPoints, baseIds)
  const curveAttrs = {
    strokeColor: color,
    strokeWidth: 2,
    fixed: true,
    needsRegularUpdate: true,
    draggable: false,
    highlight: false,
    visible: isVisible(fn),
  }

  if (bind.mode === 'ellipse') {
    const t0 = bind.branch === 'upper' ? 0 : Math.PI
    const t1 = bind.branch === 'upper' ? Math.PI : 2 * Math.PI
    board.create(
      'curve',
      [
        (t: number) => {
          const axes = axisVectors(live(), bind.center, bind.major, bind.minor)
          if (!axes) return NaN
          const { ox, ux, a, vx, b } = axes
          return ox + a * Math.cos(t) * ux + b * Math.sin(t) * vx
        },
        (t: number) => {
          const axes = axisVectors(live(), bind.center, bind.major, bind.minor)
          if (!axes) return NaN
          const { oy, uy, a, vy, b } = axes
          return oy + a * Math.cos(t) * uy + b * Math.sin(t) * vy
        },
        t0,
        t1,
      ],
      curveAttrs,
    )
    return
  }

  if (bind.mode === 'hyperbola') {
    const signU = bind.branch.startsWith('l') ? -1 : 1
    const signV = bind.branch.endsWith('u') ? 1 : -1
    board.create(
      'curve',
      [
        (t: number) => {
          const axes = axisVectors(live(), bind.center, bind.vertex, bind.conjugate)
          if (!axes) return NaN
          const { ox, ux, a, vx, b } = axes
          return ox + signU * a * Math.cosh(t) * ux + signV * b * Math.sinh(t) * vx
        },
        (t: number) => {
          const axes = axisVectors(live(), bind.center, bind.vertex, bind.conjugate)
          if (!axes) return NaN
          const { oy, uy, a, vy, b } = axes
          return oy + signU * a * Math.cosh(t) * uy + signV * b * Math.sinh(t) * vy
        },
        -3,
        3,
      ],
      curveAttrs,
    )
    return
  }

  board.create(
    'functiongraph',
    [
      makeYFn(fn, doc, jsxPoints, baseIds),
      () => {
        const bb = board.getBoundingBox()
        const span = bb[2] - bb[0]
        return bb[0] - span
      },
      () => {
        const bb = board.getBoundingBox()
        const span = bb[2] - bb[0]
        return bb[2] + span
      },
    ],
    curveAttrs,
  )
}

export interface BoardBuildResult {
  points: Record<string, GeoPoint>
  syncBasePointsToDoc: (doc: MvzDocument) => MvzDocument
}

export function buildMvzOnBoard(board: Board, doc: MvzDocument, darkMode?: boolean): BoardBuildResult {
  const t = graphTheme(darkMode)
  const points: Record<string, GeoPoint> = {}
  const lines: Record<string, GeoLine> = {}
  const basePointIds = new Set<string>()

  for (const el of doc.elements) {
    if (!isVisible(el) && el.type !== 'point') continue

    switch (el.type) {
      case 'point': {
        basePointIds.add(el.id)
        const pt = board.create('point', [el.x, el.y], {
          name: el.label ?? el.id,
          size: 3,
          fixed: el.draggable === false,
          strokeColor: t.stroke,
          fillColor: t.stroke,
          label: { strokeColor: t.label, fontSize: 14 },
          withLabel: true,
          visible: isVisible(el),
        }) as GeoPoint
        points[el.id] = pt
        break
      }

      case 'midpoint': {
        const p1 = points[el.of[0]]
        const p2 = points[el.of[1]]
        if (!p1 || !p2) break
        points[el.id] = board.create('midpoint', [p1, p2], {
          name: el.label ?? el.id,
          size: 2,
          fixed: true,
          strokeColor: styleAttrs(el, darkMode).strokeColor,
          fillColor: styleAttrs(el, darkMode).strokeColor,
          withLabel: !!el.label,
          visible: isVisible(el),
        }) as GeoPoint
        break
      }

      case 'perpendicular': {
        const fromPt = points[el.from]
        if (!fromPt) break
        const baseLine = getLineForRef(board, el.to, points, lines)
        const perpLine = board.create('perpendicular', [baseLine, fromPt], {
          visible: el.fullLine ? isVisible(el) : false,
          fixed: true,
          ...(el.fullLine
            ? { ...styleAttrs(el, darkMode), straightFirst: true, straightLast: true }
            : {}),
        }) as GeoLine
        const foot = board.create('intersection', [baseLine, perpLine, 0], {
          name: el.label ?? el.id,
          size: 2,
          fixed: true,
          visible: !!el.label && isVisible(el),
          withLabel: !!el.label,
          strokeColor: styleAttrs(el, darkMode).strokeColor,
          fillColor: styleAttrs(el, darkMode).strokeColor,
        }) as GeoPoint
        points[el.id] = foot
        if (!el.fullLine) {
          board.create('segment', [fromPt, foot], { ...styleAttrs(el, darkMode), fixed: true })
        }
        break
      }

      case 'perpBisector': {
        const a = points[el.between[0]]
        const b = points[el.between[1]]
        if (!a || !b) break
        const baseLine = board.create('line', [a, b], {
          visible: false,
          fixed: true,
          withLabel: false,
        }) as GeoLine
        const mid = board.create('midpoint', [a, b], {
          visible: false,
          fixed: true,
          withLabel: false,
        }) as GeoPoint
        board.create('perpendicular', [baseLine, mid], {
          ...styleAttrs(el, darkMode),
          straightFirst: true,
          straightLast: true,
          fixed: true,
        })
        break
      }

      case 'parallel': {
        const through = points[el.through]
        if (!through) break
        const baseLine = getLineForRef(board, el.to, points, lines)
        lines[el.id] = board.create('parallel', [baseLine, through], {
          ...styleAttrs(el, darkMode),
          straightFirst: true,
          straightLast: true,
          fixed: true,
        }) as GeoLine
        break
      }

      case 'intersection': {
        const l1 = getLineForRef(board, el.of[0], points, lines)
        const l2 = getLineForRef(board, el.of[1], points, lines)
        points[el.id] = board.create('intersection', [l1, l2, 0], {
          name: el.label ?? el.id,
          size: 3,
          fixed: true,
          strokeColor: styleAttrs(el, darkMode).strokeColor,
          fillColor: styleAttrs(el, darkMode).strokeColor,
          withLabel: !!el.label,
          visible: isVisible(el),
        }) as GeoPoint
        break
      }

      case 'angleBisector': {
        const vertex = points[el.vertex]
        const arm1 = points[el.arm1]
        const arm2 = points[el.arm2]
        if (!vertex || !arm1 || !arm2) break
        board.create('bisector', [arm1, vertex, arm2], {
          ...styleAttrs(el, darkMode),
          straightFirst: true,
          straightLast: true,
          fixed: true,
        })
        break
      }

      case 'circumcircle': {
        const verts = el.vertices.map((id) => points[id])
        if (verts.some((v) => !v)) break
        board.create('circumcircle', verts as GeoPoint[], {
          ...styleAttrs(el, darkMode),
          fillColor: 'none',
          fixed: true,
        })
        break
      }

      case 'incircle': {
        const verts = el.vertices.map((id) => points[id])
        if (verts.some((v) => !v)) break
        board.create('incircle', verts as GeoPoint[], {
          ...styleAttrs(el, darkMode),
          fillColor: 'none',
          fixed: true,
        })
        break
      }

      case 'segment': {
        const a = points[el.between[0]]
        const b = points[el.between[1]]
        if (!a || !b) break
        board.create('segment', [a, b], { ...styleAttrs(el, darkMode), fixed: true })
        break
      }

      case 'line': {
        const a = points[el.through[0]]
        const b = points[el.through[1]]
        if (!a || !b) break
        lines[el.id] = board.create('line', [a, b], {
          ...styleAttrs(el, darkMode),
          straightFirst: true,
          straightLast: true,
          fixed: true,
        }) as GeoLine
        break
      }

      case 'ray': {
        const from = points[el.from]
        const through = points[el.through]
        if (!from || !through) break
        board.create('line', [from, through], {
          ...styleAttrs(el, darkMode),
          straightFirst: false,
          straightLast: true,
          fixed: true,
        })
        break
      }

      case 'polygon': {
        const verts = el.vertices.map((id) => points[id]).filter(Boolean)
        if (verts.length < 3) break
        board.create('polygon', verts, {
          borders: styleAttrs(el, darkMode),
          fillColor: t.fill,
          fillOpacity: 0.15,
          fixed: true,
          highlight: false,
          visible: isVisible(el),
        })
        break
      }

      case 'circle': {
        const center = points[el.center]
        if (!center) break
        if (el.radius != null) {
          board.create('circle', [center, el.radius], {
            ...styleAttrs(el, darkMode),
            fillColor: 'none',
            fixed: true,
          })
        } else if (el.through && points[el.through]) {
          board.create('circle', [center, points[el.through]], {
            ...styleAttrs(el, darkMode),
            fillColor: 'none',
            fixed: true,
          })
        }
        break
      }
    }
  }

  for (const fn of doc.functions ?? []) {
    if (!isVisible(fn)) continue
    const color = fn.color ?? t.stroke

    if (fn.bind) {
      plotBoundCurve(board, fn, doc, points, basePointIds, color)
    } else {
      // Always use live functiongraph so letter-params (a,b,c…) update the curve while dragging.
      board.create(
        'functiongraph',
        [
          makeYFn(fn, doc, points, basePointIds),
          () => {
            const bb = board.getBoundingBox()
            const span = bb[2] - bb[0]
            return bb[0] - span
          },
          () => {
            const bb = board.getBoundingBox()
            const span = bb[2] - bb[0]
            return bb[2] + span
          },
        ],
        {
          strokeColor: color,
          strokeWidth: 2,
          fixed: true,
          needsRegularUpdate: true,
          draggable: false,
          highlight: false,
          visible: isVisible(fn),
        },
      )
    }
  }

  for (const ann of doc.annotations ?? []) {
    if (ann.type === 'label' && ann.at && points[ann.at]) {
      const p = points[ann.at]
      board.create('text', [() => p.X() + 0.3, () => p.Y() + 0.3, ann.label], {
        fontSize: 13,
        strokeColor: t.label,
        fixed: true,
      })
    }
    if (ann.type === 'distance' && ann.points?.length === 2) {
      const p1 = points[ann.points[0]]
      const p2 = points[ann.points[1]]
      if (p1 && p2) {
        board.create(
          'text',
          [
            () => (p1.X() + p2.X()) / 2,
            () => (p1.Y() + p2.Y()) / 2 + 0.25,
            () => fmt(Math.hypot(p2.X() - p1.X(), p2.Y() - p1.Y())),
          ],
          { fontSize: 13, strokeColor: t.label, fixed: true, cssClass: 'mvz-measure' },
        )
      }
    }
    if (ann.type === 'angle' && ann.points?.length === 3) {
      const pts = ann.points.map((id) => points[id]).filter(Boolean)
      if (pts.length === 3) {
        const [a, b, c] = pts as [GeoPoint, GeoPoint, GeoPoint]
        board.create('angle', [a, b, c], {
          radius: 0.8,
          strokeColor: t.strokeMuted,
          fillColor: t.fill,
          fillOpacity: 0.3,
          fixed: true,
          name: () => {
            const v1x = a.X() - b.X()
            const v1y = a.Y() - b.Y()
            const v2x = c.X() - b.X()
            const v2y = c.Y() - b.Y()
            const n1 = Math.hypot(v1x, v1y)
            const n2 = Math.hypot(v2x, v2y)
            if (n1 < 1e-12 || n2 < 1e-12) return ''
            let cos = (v1x * v2x + v1y * v2y) / (n1 * n2)
            cos = Math.max(-1, Math.min(1, cos))
            return `${fmt((Math.acos(cos) * 180) / Math.PI)}°`
          },
          withLabel: true,
        })
      }
    }
    if (ann.type === 'area' && ann.points && ann.points.length >= 3) {
      const verts = ann.points.map((id) => points[id]).filter(Boolean) as GeoPoint[]
      if (verts.length >= 3) {
        const cx = () => verts.reduce((s, p) => s + p.X(), 0) / verts.length
        const cy = () => verts.reduce((s, p) => s + p.Y(), 0) / verts.length
        board.create(
          'text',
          [
            cx,
            cy,
            () => {
              let sum = 0
              for (let i = 0; i < verts.length; i++) {
                const j = (i + 1) % verts.length
                sum += verts[i].X() * verts[j].Y() - verts[j].X() * verts[i].Y()
              }
              return `S=${fmt(Math.abs(sum) / 2)}`
            },
          ],
          { fontSize: 13, strokeColor: t.label, fixed: true },
        )
      }
    }
  }

  const syncBasePointsToDoc = (source: MvzDocument): MvzDocument =>
    liveDocFromPoints(source, points, basePointIds)

  return { points, syncBasePointsToDoc }
}

export function updatePointPositions(
  jsxPoints: Record<string, GeoPoint>,
  doc: MvzDocument,
) {
  for (const el of doc.elements) {
    if (el.type !== 'point') continue
    const pt = jsxPoints[el.id]
    if (pt && el.draggable !== false) {
      pt.setPositionDirectly(JXG.COORDS_BY_USER, [el.x, el.y])
    }
  }
}

export function zoomBoard(board: Board, factor: number) {
  const bb = board.getBoundingBox()
  const cx = (bb[0] + bb[2]) / 2
  const cy = (bb[1] + bb[3]) / 2
  const w = (bb[2] - bb[0]) / factor
  const h = (bb[1] - bb[3]) / factor
  board.setBoundingBox([cx - w / 2, cy + h / 2, cx + w / 2, cy - h / 2], false)
  board.update()
}

export function resizeBoardContainer(board: Board, width?: number, height?: number) {
  const ext = board as Board & {
    containerObj?: HTMLElement
    updateContainerDims?: (w?: number, h?: number) => Board
    canvasWidth?: number
    canvasHeight?: number
  }
  const container = ext.containerObj
  if (container) {
    container.style.width = ''
    container.style.height = ''
    container.style.maxWidth = ''
    container.style.maxHeight = ''
  }

  if (typeof ext.updateContainerDims === 'function') {
    if (width !== undefined && height !== undefined && width > 0 && height > 0) {
      ext.updateContainerDims(width, height)
    } else {
      ext.updateContainerDims()
    }
  } else if (
    typeof board.resizeContainer === 'function' &&
    width !== undefined &&
    height !== undefined &&
    width > 0 &&
    height > 0
  ) {
    board.resizeContainer(width, height, true, false)
  }

  board.update()
}
