import { create, all } from 'mathjs'
import type { FunctionDef } from '../mvz/types'

const math = create(all)

export function preprocessExpr(expr: string): string {
  return expr
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    .replace(/(\))([a-zA-Z(])/g, '$1*$2')
}

const RESERVED_SYMBOLS = new Set(['x', 'sin', 'cos', 'tan', 'log', 'sqrt', 'abs', 'pi', 'e'])

/** Collect single-letter params from an expression (excludes x and built-ins). */
export function collectExprParams(expr: string): string[] {
  const params = new Set<string>()
  for (const m of preprocessExpr(expr).matchAll(/\b([a-zA-Z])\b/g)) {
    if (!RESERVED_SYMBOLS.has(m[1])) params.add(m[1])
  }
  return [...params].sort()
}

export function evaluateFunction(
  expr: string,
  x: number,
  scope: Record<string, number> = {},
): number | null {
  try {
    const node = math.parse(preprocessExpr(expr))
    const compiled = node.compile()
    const y = compiled.evaluate({ x, ...scope })
    if (typeof y === 'number' && Number.isFinite(y)) return y
    if (y && typeof y === 'object' && 're' in y) {
      const re = (y as { re: number; im: number }).re
      const im = (y as { re: number; im: number }).im
      if (Math.abs(im) < 1e-10 && Number.isFinite(re)) return re
      return null
    }
    return null
  } catch {
    return null
  }
}

/** Numerical derivative dy/dx at x. */
export function numericalDerivative(
  expr: string,
  x: number,
  scope: Record<string, number> = {},
  h = 1e-4,
): number | null {
  const y0 = evaluateFunction(expr, x, scope)
  const y1 = evaluateFunction(expr, x + h, scope)
  if (y0 === null || y1 === null) return null
  const d = (y1 - y0) / h
  return Number.isFinite(d) ? d : null
}

export function sampleFunction(
  fn: FunctionDef,
  xmin: number,
  xmax: number,
  samples = 400,
): Array<[number, number]> {
  const domain = fn.domain ?? [xmin, xmax]
  const start = Math.max(domain[0], xmin)
  const end = Math.min(domain[1], xmax)
  const pts: Array<[number, number]> = []

  for (let i = 0; i <= samples; i++) {
    const x = start + (end - start) * (i / samples)
    const y = evaluateFunction(fn.expr, x)
    if (y !== null) pts.push([x, y])
  }
  return pts
}
