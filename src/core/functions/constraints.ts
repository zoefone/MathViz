import type { MvzDocument } from '../mvz/types'

export type PointConstraint = 'xAxis' | null

export function constraintForPoint(pointId: string, doc: MvzDocument): PointConstraint {
  for (const fn of doc.functions ?? []) {
    if (!fn.bind) continue
    if (fn.bind.mode === 'quadratic_vertex_roots' && fn.bind.roots.includes(pointId)) {
      return 'xAxis'
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
  if (constraintForPoint(pointId, doc) === 'xAxis') return [x, 0]
  return [x, y]
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
