import type { MvzElement } from '../core/mvz/types'

export function elementLabel(el: MvzElement, locale: 'zh' | 'en'): string {
  if (el.label) return el.label
  const typeNames: Record<string, { zh: string; en: string }> = {
    point: { zh: '点', en: 'Point' },
    segment: { zh: '线段', en: 'Segment' },
    line: { zh: '直线', en: 'Line' },
    ray: { zh: '射线', en: 'Ray' },
    polygon: { zh: '多边形', en: 'Polygon' },
    circle: { zh: '圆', en: 'Circle' },
    midpoint: { zh: '中点', en: 'Midpoint' },
    perpendicular: { zh: '垂线', en: 'Perpendicular' },
    perpBisector: { zh: '垂直平分线', en: '⊥ bisector' },
    parallel: { zh: '平行线', en: 'Parallel' },
    intersection: { zh: '交点', en: 'Intersection' },
    angleBisector: { zh: '角平分线', en: 'Bisector' },
    circumcircle: { zh: '外接圆', en: 'Circumcircle' },
    incircle: { zh: '内切圆', en: 'Incircle' },
  }
  const name = typeNames[el.type]
  const suffix = name ? (locale === 'zh' ? name.zh : name.en) : el.type
  return `${el.id} · ${suffix}`
}

export function sortElements(elements: MvzElement[]): MvzElement[] {
  return [...elements].sort((a, b) => {
    const aAux = a.auxiliary ? 1 : 0
    const bAux = b.auxiliary ? 1 : 0
    if (aAux !== bAux) return aAux - bAux
    return a.id.localeCompare(b.id)
  })
}
