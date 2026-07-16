import type { MvzDocument } from '../mvz/types'
import { evaluateFunction, numericalDerivative } from './plot'

export type PointConstraint = 'xAxis' | 'paramSlider' | 'onFunction' | null

export function constraintForPoint(pointId: string, doc: MvzDocument): PointConstraint {
  for (const fn of doc.functions ?? []) {
    if (!fn.bind) continue
    if (fn.bind.mode === 'quadratic_vertex_roots' && fn.bind.roots.includes(pointId)) {
      return 'xAxis'
    }
  }
  const el = doc.elements.find((e) => e.id === pointId && e.type === 'point')
  if (el?.type === 'point' && el.onFunction) return 'onFunction'
  // Single-letter param points used by expressions: slide along horizontal (y fixed at create)
  if (/^[a-z]$/.test(pointId)) {
    for (const fn of doc.functions ?? []) {
      if (fn.bind) continue
      if (new RegExp(`\\b${pointId}\\b`).test(fn.expr)) return 'paramSlider'
    }
  }
  return null
}

export function applyDragConstraint(
  pointId: string,
  x: number,
  y: number,
  doc: MvzDocument,
): [number, number] {
  const kind = constraintForPoint(pointId, doc)
  if (kind === 'xAxis') return [x, 0]
  if (kind === 'paramSlider') {
    const el = doc.elements.find((e) => e.id === pointId && e.type === 'point')
    const lockedY = el?.type === 'point' ? el.y : y
    return [x, lockedY]
  }
  if (kind === 'onFunction') {
    const el = doc.elements.find((e) => e.id === pointId && e.type === 'point')
    if (el?.type !== 'point' || !el.onFunction) return [x, y]
    const fn = doc.functions?.find((f) => f.id === el.onFunction)
    if (!fn) return [x, y]
    const scope = paramScopeFromDoc(doc, fn.expr)
    const fy = evaluateFunction(fn.expr, x, scope)
    if (fy === null) return [x, y]
    return [x, fy]
  }
  return [x, y]
}

function paramScopeFromDoc(doc: MvzDocument, expr: string): Record<string, number> {
  const scope: Record<string, number> = {}
  for (const m of expr.matchAll(/\b([a-zA-Z])\b/g)) {
    const id = m[1]
    if (id === 'x') continue
    const pt = doc.elements.find((e) => e.id === id && e.type === 'point')
    if (pt?.type === 'point') scope[id] = pt.x
  }
  return scope
}

/** When vertex moves, keep through-point on the parabola */
export function throughPointAfterVertexMove(
  doc: MvzDocument,
  vertexId: string,
): { throughId: string; x: number; y: number } | null {
  const fn = doc.functions?.find(
    (f) => f.bind?.mode === 'quadratic_vertex' && f.bind.vertex === vertexId,
  )
  const bind = fn?.bind
  if (!bind || bind.mode !== 'quadratic_vertex') return null
  const v = doc.elements.find((e) => e.id === bind.vertex && e.type === 'point')
  const p = doc.elements.find((e) => e.id === bind.through && e.type === 'point')
  if (v?.type !== 'point' || p?.type !== 'point') return null
  if (Math.abs(p.x - v.x) < 1e-6) return null
  const a = (p.y - v.y) / ((p.x - v.x) ** 2)
  const newY = a * (p.x - v.x) ** 2 + v.y
  if (!Number.isFinite(newY)) return null
  return { throughId: bind.through, x: p.x, y: newY }
}

/** After a glider moves, update its tangent helper point. */
export function tangentHelperAfterGliderMove(
  doc: MvzDocument,
  gliderId: string,
): { helperId: string; x: number; y: number } | null {
  const glider = doc.elements.find((e) => e.id === gliderId && e.type === 'point')
  if (glider?.type !== 'point' || !glider.onFunction) return null
  const helper = doc.elements.find(
    (e) => e.type === 'point' && e.tangentFrom === gliderId,
  )
  if (helper?.type !== 'point') return null
  const fn = doc.functions?.find((f) => f.id === glider.onFunction)
  if (!fn) return null
  const scope = paramScopeFromDoc(doc, fn.expr)
  const slope = numericalDerivative(fn.expr, glider.x, scope)
  if (slope === null) return null
  const dx = 1.2
  return {
    helperId: helper.id,
    x: glider.x + dx,
    y: glider.y + slope * dx,
  }
}
