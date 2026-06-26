import type { MvzDocument, MvzElement } from '../core/mvz/types'

function pointCoord(doc: MvzDocument, id: string): { x: number; y: number } | null {
  const el = doc.elements.find((e) => e.id === id && e.type === 'point')
  if (!el || el.type !== 'point') return null
  return { x: el.x, y: el.y }
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function pointInPolygon(
  px: number,
  py: number,
  verts: Array<{ x: number; y: number }>,
): boolean {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x
    const yi = verts[i].y
    const xj = verts[j].x
    const yj = verts[j].y
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-15) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export interface SegmentRef {
  between: [string, string]
  sourceId?: string
}

export function collectSegments(doc: MvzDocument): SegmentRef[] {
  const segs: SegmentRef[] = []
  for (const el of doc.elements) {
    if (el.type === 'segment') segs.push({ between: el.between, sourceId: el.id })
    if (el.type === 'polygon') {
      for (let i = 0; i < el.vertices.length; i++) {
        const a = el.vertices[i]
        const b = el.vertices[(i + 1) % el.vertices.length]
        segs.push({ between: [a, b], sourceId: el.id })
      }
    }
  }
  return segs
}

export function pickSegmentAt(
  doc: MvzDocument,
  x: number,
  y: number,
  threshold = 0.45,
): SegmentRef | null {
  let best: SegmentRef | null = null
  let bestDist = threshold
  for (const seg of collectSegments(doc)) {
    const a = pointCoord(doc, seg.between[0])
    const b = pointCoord(doc, seg.between[1])
    if (!a || !b) continue
    const d = distToSegment(x, y, a.x, a.y, b.x, b.y)
    if (d < bestDist) {
      bestDist = d
      best = seg
    }
  }
  return best
}

export function triangleForVertex(
  doc: MvzDocument,
  vertexId: string,
): [string, string, string] | null {
  for (const el of doc.elements) {
    if (el.type === 'polygon' && el.vertices.length === 3 && el.vertices.includes(vertexId)) {
      return el.vertices as [string, string, string]
    }
  }
  return null
}

export function pickPolygonAt(doc: MvzDocument, x: number, y: number): MvzElement | null {
  let best: MvzElement | null = null
  let bestArea = Infinity
  for (const el of doc.elements) {
    if (el.type !== 'polygon') continue
    const coords = el.vertices
      .map((id) => pointCoord(doc, id))
      .filter((c): c is { x: number; y: number } => c !== null)
    if (coords.length < 3) continue
    if (!pointInPolygon(x, y, coords)) continue
    const area = Math.abs(
      coords.reduce((sum, p, i) => {
        const q = coords[(i + 1) % coords.length]
        return sum + p.x * q.y - q.x * p.y
      }, 0),
    )
    if (area < bestArea) {
      bestArea = area
      best = el
    }
  }
  return best
}

export function pickVertexAt(
  doc: MvzDocument,
  x: number,
  y: number,
  threshold = 0.4,
): string | null {
  let best: string | null = null
  let bestDist = threshold
  for (const el of doc.elements) {
    if (el.type !== 'point') continue
    const d = Math.hypot(x - el.x, y - el.y)
    if (d < bestDist) {
      bestDist = d
      best = el.id
    }
  }
  return best
}

export function triangleContainingSegment(
  doc: MvzDocument,
  seg: SegmentRef,
): [string, string, string] | null {
  const [p1, p2] = seg.between
  for (const el of doc.elements) {
    if (el.type !== 'polygon' || el.vertices.length !== 3) continue
    const verts = el.vertices as [string, string, string]
    if (verts.includes(p1) && verts.includes(p2)) return verts
  }
  const points = doc.elements.filter((e) => e.type === 'point').map((e) => e.id)
  if (points.length >= 3) {
    const tri = points.slice(0, 3) as [string, string, string]
    if (tri.includes(p1) && tri.includes(p2)) return tri
  }
  return null
}
