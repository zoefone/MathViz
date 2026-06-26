/** Convert common LaTeX / math notation to math.js expression */
export function latexToExpr(input: string): { expr: string; params: string[]; error?: string } {
  let s = input.trim()
  if (!s) return { expr: '', params: [], error: 'empty' }

  // strip f(x)= or y=
  s = s.replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, '')
  s = s.replace(/^\s*y\s*=\s*/i, '')

  const params = new Set<string>()

  s = s
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\sqrt\[(\d+)\]\s*\{([^}]*)\}/g, '($2)^(1/$1)')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\ln\b/g, 'log')
    .replace(/\\log\b/g, 'log')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\,/g, '')
    .replace(/\\;/g, '')
    .replace(/\\\s/g, '')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\^/g, '^')
    .replace(/\\abs\s*\{([^}]*)\}/g, 'abs($1)')
    .replace(/\|([^|]+)\|/g, 'abs($1)')

  // implicit multiplication: 2x, ax, 2(x+1), )( 
  s = s
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    .replace(/(\))([a-zA-Z(])/g, '$1*$2')
    .replace(/([a-zA-Z])(\()/g, (_match, ident: string, paren: string) => {
      const fns = ['sin', 'cos', 'tan', 'log', 'sqrt', 'abs']
      if (fns.some((f) => ident === f || ident.endsWith(f))) return ident + paren
      return `${ident}*${paren}`
    })

  // collect single-letter parameters (exclude x and function names)
  const reserved = new Set(['x', 'sin', 'cos', 'tan', 'log', 'sqrt', 'abs', 'pi', 'e'])
  for (const m of s.matchAll(/\b([a-zA-Z])\b/g)) {
    const id = m[1]
    if (!reserved.has(id)) params.add(id)
  }

  return { expr: s, params: [...params].sort() }
}

export const latexTemplates = [
  { id: 'quadratic', zh: '二次函数', en: 'Quadratic', latex: 'ax^2+bx+c' },
  { id: 'vertex', zh: '顶点式', en: 'Vertex form', latex: 'a(x-h)^2+k' },
  { id: 'sine', zh: '正弦', en: 'Sine', latex: '\\sin(x)' },
  { id: 'abs', zh: '绝对值', en: 'Absolute', latex: '|x|' },
  { id: 'inverse', zh: '反比例', en: 'Inverse', latex: 'k/x' },
] as const
