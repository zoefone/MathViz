export interface Vec2 {
  x: number
  y: number
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function normalize(v: Vec2): Vec2 {
  const l = len(v)
  if (l === 0) return { x: 0, y: 0 }
  return { x: v.x / l, y: v.y / l }
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function distance(a: Vec2, b: Vec2): number {
  return len(sub(a, b))
}

export function perpendicularFoot(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a)
  const t = dot(sub(point, a), ab) / dot(ab, ab)
  return add(a, scale(ab, t))
}

export function lineIntersection(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const d = cross(sub(p2, p1), sub(p4, p3))
  if (Math.abs(d) < 1e-10) return null
  const t = cross(sub(p3, p1), sub(p4, p3)) / d
  return add(p1, scale(sub(p2, p1), t))
}

export function angleBisectorDir(vertex: Vec2, arm1: Vec2, arm2: Vec2): Vec2 {
  const d1 = normalize(sub(arm1, vertex))
  const d2 = normalize(sub(arm2, vertex))
  const bis = add(d1, d2)
  if (len(bis) < 1e-10) return d1
  return normalize(bis)
}

export function circumcircle(a: Vec2, b: Vec2, c: Vec2): { center: Vec2; radius: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-10) return null

  const aSq = a.x * a.x + a.y * a.y
  const bSq = b.x * b.x + b.y * b.y
  const cSq = c.x * c.x + c.y * c.y

  const ux = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d
  const uy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d
  const center = { x: ux, y: uy }
  return { center, radius: distance(center, a) }
}

export function extendLine(p1: Vec2, p2: Vec2, extent = 100): [Vec2, Vec2] {
  const dir = normalize(sub(p2, p1))
  return [sub(p1, scale(dir, extent)), add(p2, scale(dir, extent))]
}

export function parseSegmentRef(ref: string): [string, string] | null {
  const explicit = ref.match(/^seg:([^|]+)\|([^|]+)$/)
  if (explicit) return [explicit[1], explicit[2]]
  const m = ref.match(/^([A-Za-z0-9_]+)([A-Za-z0-9_]+)$/)
  if (!m) return null
  return [m[1], m[2]]
}

export function resolveLinePoints(
  ref: string,
  points: Record<string, Vec2>,
): [Vec2, Vec2] | null {
  const seg = parseSegmentRef(ref)
  if (seg && points[seg[0]] && points[seg[1]]) {
    return [points[seg[0]], points[seg[1]]]
  }
  if (points[ref]) {
    const p = points[ref]
    return [p, { x: p.x + 1, y: p.y }]
  }
  return null
}
