import { mvzSchema } from './schema'
import type { MvzDocument } from './types'

export function parseMvz(input: string): { doc: MvzDocument; error?: string } {
  try {
    const raw = JSON.parse(input) as unknown
    const result = mvzSchema.safeParse(raw)
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return { doc: getEmptyDoc(), error: msg }
    }
    return { doc: result.data as MvzDocument }
  } catch (e) {
    return { doc: getEmptyDoc(), error: (e as Error).message }
  }
}

export function serializeMvz(doc: MvzDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function getEmptyDoc(): MvzDocument {
  return {
    version: '1.0',
    viewport: { xmin: -10, xmax: 10, ymin: -8, ymax: 8 },
    elements: [],
    functions: [],
    annotations: [],
  }
}

export function validateMvz(doc: unknown): { valid: boolean; error?: string } {
  const result = mvzSchema.safeParse(doc)
  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    }
  }
  return { valid: true }
}
