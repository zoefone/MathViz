import type { ComputedState, ComputedPoint, MvzDocument, MvzElement, StyleOptions } from '../mvz/types'
import {
  type Vec2,
  midpoint,
  perpendicularFoot,
  lineIntersection,
  angleBisectorDir,
  circumcircle,
  extendLine,
  distance,
  resolveLinePoints,
  sub,
  scale,
  add,
} from '../geometry/vec'

function defaultStyle(el: MvzElement): StyleOptions {
  const auxiliary = el.auxiliary ?? false
  return {
    color: el.color ?? (auxiliary ? '#8E8E93' : '#1C1C1E'),
    style: el.style ?? (auxiliary ? 'dashed' : 'solid'),
    auxiliary,
    thickness: el.thickness ?? (auxiliary ? 1 : 2),
    label: el.label,
  }
}
function getPoint(points: Record<string, ComputedPoint>, id: string): Vec2 {
  const p = points[id]
  if (!p) throw new Error(`Missing point: ${id}`)
  return { x: p.x, y: p.y }
}

export function computeMvz(doc: MvzDocument): ComputedState {
  const points: Record<string, ComputedPoint> = {}
  const segments: ComputedState['segments'] = []
  const lines: ComputedState['lines'] = []
  const rays: ComputedState['rays'] = []
  const polygons: ComputedState['polygons'] = []
  const circles: ComputedState['circles'] = []

  for (const el of doc.elements) {
    switch (el.type) {
      case 'point':
        points[el.id] = { x: el.x, y: el.y }
        break

      case 'midpoint': {
        const a = getPoint(points, el.of[0])
        const b = getPoint(points, el.of[1])
        const m = midpoint(a, b)
        points[el.id] = m
        break
      }

      case 'perpendicular': {
        const from = getPoint(points, el.from)
        const linePts = resolveLinePoints(el.to, points as Record<string, ComputedPoint>)
        if (!linePts) throw new Error(`Cannot resolve line ref: ${el.to}`)
        const foot = perpendicularFoot(from, linePts[0], linePts[1])
        points[el.id] = foot
        segments.push({
          id: el.id + '_seg',
          a: el.from,
          b: el.id,
          style: defaultStyle(el),
        })
        break
      }

      case 'parallel': {
        const through = getPoint(points, el.through)
        const linePts = resolveLinePoints(el.to, points as Record<string, ComputedPoint>)
        if (!linePts) throw new Error(`Cannot resolve line ref: ${el.to}`)
        const dir = sub(linePts[1], linePts[0])
        const p2 = add(through, dir)
        const [lp1, lp2] = extendLine(through, p2)
        lines.push({ id: el.id, p1: lp1, p2: lp2, style: defaultStyle(el) })
        break
      }

      case 'intersection': {
        const resolve = (ref: string): [Vec2, Vec2] | null => {
          const fromPts = resolveLinePoints(ref, points as Record<string, ComputedPoint>)
          if (fromPts) return fromPts
          const stored = lines.find((l) => l.id === ref)
          if (stored) return [stored.p1, stored.p2]
          return null
        }
        const l1 = resolve(el.of[0])
        const l2 = resolve(el.of[1])
        if (!l1 || !l2) throw new Error(`Cannot resolve intersection refs`)
        const inter = lineIntersection(l1[0], l1[1], l2[0], l2[1])
        if (!inter) throw new Error(`Lines do not intersect: ${el.of.join(', ')}`)
        points[el.id] = inter
        break
      }

      case 'angleBisector': {
        const vertex = getPoint(points, el.vertex)
        const arm1 = getPoint(points, el.arm1)
        const arm2 = getPoint(points, el.arm2)
        const dir = angleBisectorDir(vertex, arm1, arm2)
        const end = add(vertex, scale(dir, 5))
        const [lp1, lp2] = extendLine(vertex, end)
        lines.push({ id: el.id, p1: lp1, p2: lp2, style: defaultStyle(el) })
        break
      }

      case 'circumcircle': {
        const a = getPoint(points, el.vertices[0])
        const b = getPoint(points, el.vertices[1])
        const c = getPoint(points, el.vertices[2])
        const cc = circumcircle(a, b, c)
        if (!cc) throw new Error('Degenerate circumcircle')
        circles.push({
          id: el.id,
          center: cc.center,
          radius: cc.radius,
          style: defaultStyle(el),
        })
        break
      }

      case 'segment':
        segments.push({
          id: el.id,
          a: el.between[0],
          b: el.between[1],
          style: defaultStyle(el),
        })
        break

      case 'line': {
        const a = getPoint(points, el.through[0])
        const b = getPoint(points, el.through[1])
        const [lp1, lp2] = extendLine(a, b)
        lines.push({ id: el.id, p1: lp1, p2: lp2, style: defaultStyle(el) })
        break
      }

      case 'ray': {
        const from = getPoint(points, el.from)
        const through = getPoint(points, el.through)
        rays.push({ id: el.id, from, through, style: defaultStyle(el) })
        break
      }

      case 'polygon':
        polygons.push({
          id: el.id,
          vertices: el.vertices,
          style: defaultStyle(el),
        })
        break

      case 'circle': {
        const center = getPoint(points, el.center)
        const radius =
          el.radius ??
          (el.through ? distance(center, getPoint(points, el.through)) : 1)
        circles.push({
          id: el.id,
          center,
          radius,
          style: defaultStyle(el),
        })
        break
      }
    }
  }

  return {
    points,
    segments,
    lines,
    rays,
    polygons,
    circles,
    functions: doc.functions ?? [],
    annotations: doc.annotations ?? [],
    viewport: doc.viewport,
  }
}

export function updatePointInDoc(
  doc: MvzDocument,
  pointId: string,
  x: number,
  y: number,
): MvzDocument {
  return {
    ...doc,
    elements: doc.elements.map((el) =>
      el.type === 'point' && el.id === pointId ? { ...el, x, y } : el,
    ),
  }
}
