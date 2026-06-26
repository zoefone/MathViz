import { create, all } from 'mathjs'
import type { FunctionDef } from '../mvz/types'

const math = create(all)

export function preprocessExpr(expr: string): string {
  return expr
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    .replace(/(\))([a-zA-Z(])/g, '$1*$2')
}

export function evaluateFunction(expr: string, x: number): number | null {
  try {
    const node = math.parse(preprocessExpr(expr))
    const compiled = node.compile()
    const y = compiled.evaluate({ x })
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
