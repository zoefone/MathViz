import type { MvzDocument, Annotation } from '../mvz/types'

function pt(doc: MvzDocument, id: string): { x: number; y: number } | null {
  const el = doc.elements.find((e) => e.id === id && e.type === 'point')
  if (el?.type !== 'point') return null
  return { x: el.x, y: el.y }
}

export function distanceBetween(doc: MvzDocument, a: string, b: string): number | null {
  const p = pt(doc, a)
  const q = pt(doc, b)
  if (!p || !q) return null
  return Math.hypot(q.x - p.x, q.y - p.y)
}

export function angleDegrees(doc: MvzDocument, a: string, b: string, c: string): number | null {
  const A = pt(doc, a)
  const B = pt(doc, b)
  const C = pt(doc, c)
  if (!A || !B || !C) return null
  const v1x = A.x - B.x
  const v1y = A.y - B.y
  const v2x = C.x - B.x
  const v2y = C.y - B.y
  const n1 = Math.hypot(v1x, v1y)
  const n2 = Math.hypot(v2x, v2y)
  if (n1 < 1e-12 || n2 < 1e-12) return null
  let cos = (v1x * v2x + v1y * v2y) / (n1 * n2)
  cos = Math.max(-1, Math.min(1, cos))
  return (Math.acos(cos) * 180) / Math.PI
}

export function polygonArea(doc: MvzDocument, vertices: string[]): number | null {
  const coords = vertices.map((id) => pt(doc, id)).filter((c): c is { x: number; y: number } => !!c)
  if (coords.length < 3) return null
  let sum = 0
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    sum += coords[i].x * coords[j].y - coords[j].x * coords[i].y
  }
  return Math.abs(sum) / 2
}

export function fmt(n: number, digits = 2): string {
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  return Number.isInteger(r) ? String(r) : r.toFixed(digits)
}

export interface AlgebraRow {
  id: string
  kind: 'point' | 'length' | 'angle' | 'area' | 'function' | 'circle'
  title: string
  value: string
}

export function buildAlgebraRows(doc: MvzDocument, locale: 'zh' | 'en'): AlgebraRow[] {
  const rows: AlgebraRow[] = []

  for (const el of doc.elements) {
    if (el.type === 'point' && el.visible !== false) {
      rows.push({
        id: `pt-${el.id}`,
        kind: 'point',
        title: el.label ?? el.id,
        value: `(${fmt(el.x)}, ${fmt(el.y)})`,
      })
    }
    if (el.type === 'segment' && el.visible !== false) {
      const d = distanceBetween(doc, el.between[0], el.between[1])
      if (d !== null) {
        rows.push({
          id: `len-${el.id}`,
          kind: 'length',
          title: el.label ?? `${el.between[0]}${el.between[1]}`,
          value: locale === 'zh' ? `长度 = ${fmt(d)}` : `length = ${fmt(d)}`,
        })
      }
    }
    if (el.type === 'circle' && el.visible !== false) {
      const c = pt(doc, el.center)
      if (c) {
        let r = el.radius
        if (r == null && el.through) {
          r = distanceBetween(doc, el.center, el.through) ?? undefined
        }
        if (r != null) {
          rows.push({
            id: `cir-${el.id}`,
            kind: 'circle',
            title: el.label ?? el.id,
            value: `(x-${fmt(c.x)})²+(y-${fmt(c.y)})²=${fmt(r * r)}`,
          })
        }
      }
    }
    if (el.type === 'polygon' && el.visible !== false) {
      const area = polygonArea(doc, el.vertices)
      if (area !== null) {
        rows.push({
          id: `area-${el.id}`,
          kind: 'area',
          title: el.label ?? el.id,
          value: locale === 'zh' ? `面积 = ${fmt(area)}` : `area = ${fmt(area)}`,
        })
      }
    }
  }

  for (const ann of doc.annotations ?? []) {
    if (ann.type === 'distance' && ann.points?.length === 2) {
      const d = distanceBetween(doc, ann.points[0], ann.points[1])
      if (d !== null) {
        rows.push({
          id: `ann-d-${ann.points.join('-')}`,
          kind: 'length',
          title: ann.label || `${ann.points[0]}${ann.points[1]}`,
          value: fmt(d),
        })
      }
    }
    if (ann.type === 'angle' && ann.points?.length === 3) {
      const a = angleDegrees(doc, ann.points[0], ann.points[1], ann.points[2])
      if (a !== null) {
        rows.push({
          id: `ann-a-${ann.points.join('-')}`,
          kind: 'angle',
          title: ann.label || `∠${ann.points[1]}`,
          value: `${fmt(a)}°`,
        })
      }
    }
    if (ann.type === 'area' && ann.points && ann.points.length >= 3) {
      const area = polygonArea(doc, ann.points)
      if (area !== null) {
        rows.push({
          id: `ann-area-${ann.points.join('-')}`,
          kind: 'area',
          title: ann.label || 'S',
          value: fmt(area),
        })
      }
    }
  }

  for (const fn of doc.functions ?? []) {
    if (fn.visible === false) continue
    rows.push({
      id: `fn-${fn.id}`,
      kind: 'function',
      title: fn.id,
      value: `y = ${fn.expr}`,
    })
  }

  return rows
}

export function annotationValueLabel(doc: MvzDocument, ann: Annotation): string {
  if (ann.type === 'distance' && ann.points?.length === 2) {
    const d = distanceBetween(doc, ann.points[0], ann.points[1])
    return d !== null ? fmt(d) : ann.label
  }
  if (ann.type === 'angle' && ann.points?.length === 3) {
    const a = angleDegrees(doc, ann.points[0], ann.points[1], ann.points[2])
    return a !== null ? `${fmt(a)}°` : ann.label
  }
  if (ann.type === 'area' && ann.points && ann.points.length >= 3) {
    const area = polygonArea(doc, ann.points)
    return area !== null ? `S=${fmt(area)}` : ann.label
  }
  return ann.label
}
