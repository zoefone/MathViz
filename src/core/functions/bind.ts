import type { FunctionBind, MvzDocument } from '../mvz/types'

export function getPointCoords(
  doc: MvzDocument,
  id: string,
): { x: number; y: number } | null {
  const el = doc.elements.find((e) => e.id === id && e.type === 'point')
  if (!el || el.type !== 'point') return null
  return { x: el.x, y: el.y }
}

export function evalBoundFunction(x: number, bind: FunctionBind, doc: MvzDocument): number | null {
  switch (bind.mode) {
    case 'linear': {
      const a = getPointCoords(doc, bind.points[0])
      const b = getPointCoords(doc, bind.points[1])
      if (!a || !b) return null
      if (Math.abs(b.x - a.x) < 1e-10) return null
      const m = (b.y - a.y) / (b.x - a.x)
      const c = a.y - m * a.x
      const y = m * x + c
      return Number.isFinite(y) ? y : null
    }
    case 'quadratic_vertex_roots': {
      const v = getPointCoords(doc, bind.vertex)
      const r1 = getPointCoords(doc, bind.roots[0])
      const r2 = getPointCoords(doc, bind.roots[1])
      if (!v || !r1 || !r2) return null
      if (Math.abs(r1.x - r2.x) < 1e-10) return null
      const a = v.y / ((r1.x - v.x) * (r2.x - v.x))
      const y = a * (x - r1.x) * (x - r2.x)
      return Number.isFinite(y) ? y : null
    }
    case 'quadratic_vertex': {
      const v = getPointCoords(doc, bind.vertex)
      const p = getPointCoords(doc, bind.through)
      if (!v || !p) return null
      if (Math.abs(p.x - v.x) < 1e-10) return null
      const a = (p.y - v.y) / ((p.x - v.x) ** 2)
      const y = a * (x - v.x) ** 2 + v.y
      return Number.isFinite(y) ? y : null
    }
    case 'ellipse': {
      const o = getPointCoords(doc, bind.center)
      const maj = getPointCoords(doc, bind.major)
      const min = getPointCoords(doc, bind.minor)
      if (!o || !maj || !min) return null
      const a = Math.hypot(maj.x - o.x, maj.y - o.y)
      const b = Math.hypot(min.x - o.x, min.y - o.y)
      if (a < 1e-10 || b < 1e-10) return null
      const t = (x - o.x) / a
      if (t * t > 1) return null
      const root = Math.sqrt(1 - t * t)
      const y = o.y + (bind.branch === 'upper' ? 1 : -1) * b * root
      return Number.isFinite(y) ? y : null
    }
    case 'hyperbola': {
      const o = getPointCoords(doc, bind.center)
      const v = getPointCoords(doc, bind.vertex)
      const c = getPointCoords(doc, bind.conjugate)
      if (!o || !v || !c) return null
      const a = Math.hypot(v.x - o.x, v.y - o.y)
      const b = Math.hypot(c.x - o.x, c.y - o.y)
      if (a < 1e-10 || b < 1e-10) return null
      const xr = x - o.x
      const isLeft = bind.branch.startsWith('l')
      const isUp = bind.branch.endsWith('u')
      if (isLeft) {
        if (xr > -a) return null
      } else if (xr < a) {
        return null
      }
      const inside = xr * xr - a * a
      if (inside < 0) return null
      const y = o.y + (isUp ? 1 : -1) * (b / a) * Math.sqrt(inside)
      return Number.isFinite(y) ? y : null
    }
    default:
      return null
  }
}

export function exprFromBind(bind: FunctionBind, doc: MvzDocument): string {
  switch (bind.mode) {
    case 'linear': {
      const a = getPointCoords(doc, bind.points[0])
      const b = getPointCoords(doc, bind.points[1])
      if (!a || !b || Math.abs(b.x - a.x) < 1e-10) return '0'
      const m = (b.y - a.y) / (b.x - a.x)
      const c = a.y - m * a.x
      return `${round(m)}*x + ${round(c)}`
    }
    case 'quadratic_vertex_roots': {
      const v = getPointCoords(doc, bind.vertex)
      const r1 = getPointCoords(doc, bind.roots[0])
      const r2 = getPointCoords(doc, bind.roots[1])
      if (!v || !r1 || !r2 || Math.abs(r1.x - r2.x) < 1e-10) return '0'
      const a = v.y / ((r1.x - v.x) * (r2.x - v.x))
      return `${round(a)}*(x - ${round(r1.x)})*(x - ${round(r2.x)})`
    }
    case 'quadratic_vertex': {
      const v = getPointCoords(doc, bind.vertex)
      const p = getPointCoords(doc, bind.through)
      if (!v || !p || Math.abs(p.x - v.x) < 1e-10) return '0'
      const a = (p.y - v.y) / ((p.x - v.x) ** 2)
      return `${round(a)}*(x - ${round(v.x)})^2 + ${round(v.y)}`
    }
    case 'ellipse':
      return bind.branch === 'upper' ? 'ellipse_upper' : 'ellipse_lower'
    case 'hyperbola':
      return `hyperbola_${bind.branch}`
    default:
      return '0'
  }
}

function round(n: number): string {
  const r = Math.round(n * 1000) / 1000
  return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/\.?0+$/, '')
}

export function applyFunctionBinds(doc: MvzDocument): MvzDocument {
  if (!doc.functions?.length) return doc
  return {
    ...doc,
    functions: doc.functions.map((fn) => {
      if (!fn.bind) return fn
      return { ...fn, expr: exprFromBind(fn.bind, doc) }
    }),
  }
}
