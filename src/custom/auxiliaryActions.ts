import type { MvzDocument } from '../core/mvz/types'
import { triangleContainingSegment } from './pickTarget'

export type AuxKind =
  | 'altitude'
  | 'median'
  | 'angleBisector'
  | 'perpBisector'
  | 'circumcircle'
  | 'incircle'
  | 'centroid'
  | 'orthocenter'
  | 'eulerLine'
  | 'diagonal'

export type AuxTarget =
  | { type: 'triangle'; vertices: [string, string, string] }
  | { type: 'quad'; vertices: [string, string, string, string] }
  | { type: 'segment'; between: [string, string] }
  | { type: 'vertex'; id: string; triangle: [string, string, string] }

function segRef(a: string, b: string): string {
  return `seg:${a}|${b}`
}

let auxCounter = 0
function auxId(prefix: string): string {
  auxCounter += 1
  return `${prefix}${auxCounter}`
}

export function auxPickMode(kind: AuxKind): AuxTarget['type'] {
  switch (kind) {
    case 'altitude':
    case 'median':
    case 'perpBisector':
      return 'segment'
    case 'angleBisector':
      return 'vertex'
    case 'diagonal':
      return 'quad'
    default:
      return 'triangle'
  }
}

export function applyAuxiliaryToTarget(
  doc: MvzDocument,
  kind: AuxKind,
  target: AuxTarget,
): MvzDocument {
  auxCounter = doc.elements.length
  let elements = [...doc.elements]

  switch (kind) {
    case 'altitude': {
      if (target.type !== 'segment') return doc
      const tri = triangleContainingSegment(doc, { between: target.between })
      if (!tri) return doc
      const [p1, p2] = target.between
      const from = tri.find((v) => v !== p1 && v !== p2)
      if (!from) return doc
      elements.push({
        id: auxId('h'),
        type: 'perpendicular',
        from,
        to: segRef(p1, p2),
        label: `高 ${from}`,
        fullLine: true,
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'median': {
      if (target.type !== 'segment') return doc
      const tri = triangleContainingSegment(doc, { between: target.between })
      if (!tri) return doc
      const [p1, p2] = target.between
      const from = tri.find((v) => v !== p1 && v !== p2)
      if (!from) return doc
      const mId = auxId('m')
      elements.push({ id: mId, type: 'midpoint', of: [p1, p2], label: `中点 ${p1}${p2}`, auxiliary: true })
      elements.push({
        id: auxId('med'),
        type: 'segment',
        between: [from, mId],
        label: `中线 ${from}`,
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'angleBisector': {
      if (target.type !== 'vertex') return doc
      const [a, b, c] = target.triangle
      const v = target.id
      const others = [a, b, c].filter((x) => x !== v) as [string, string]
      elements.push({
        id: auxId('bis'),
        type: 'angleBisector',
        vertex: v,
        arm1: others[0],
        arm2: others[1],
        label: `角平分线 ${v}`,
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'perpBisector': {
      if (target.type !== 'segment') return doc
      const [p1, p2] = target.between
      elements.push({
        id: auxId('pb'),
        type: 'perpBisector',
        between: [p1, p2],
        label: `垂直平分线 ${p1}${p2}`,
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'circumcircle': {
      if (target.type !== 'triangle') return doc
      elements.push({
        id: auxId('cc'),
        type: 'circumcircle',
        vertices: target.vertices,
        label: '外接圆',
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'incircle': {
      if (target.type !== 'triangle') return doc
      elements.push({
        id: auxId('ic'),
        type: 'incircle',
        vertices: target.vertices,
        label: '内切圆',
        auxiliary: true,
        style: 'dashed',
      })
      break
    }
    case 'centroid': {
      if (target.type !== 'triangle') return doc
      const [a, b, c] = target.vertices
      const mAB = auxId('m')
      elements.push({ id: mAB, type: 'midpoint', of: [a, b], label: `中点 ${a}${b}`, auxiliary: true })
      const medC = auxId('med')
      elements.push({ id: medC, type: 'segment', between: [c, mAB], label: '中线 C', auxiliary: true, style: 'dashed' })
      const mAC = auxId('m')
      elements.push({ id: mAC, type: 'midpoint', of: [a, c], label: `中点 ${a}${c}`, auxiliary: true })
      const medB = auxId('med')
      elements.push({ id: medB, type: 'segment', between: [b, mAC], label: '中线 B', auxiliary: true, style: 'dashed' })
      elements.push({
        id: auxId('G'),
        type: 'intersection',
        of: [segRef(c, mAB), segRef(b, mAC)],
        label: 'G 重心',
        auxiliary: true,
      })
      break
    }
    case 'orthocenter': {
      if (target.type !== 'triangle') return doc
      const [a, b, c] = target.vertices
      const hA = auxId('h')
      elements.push({ id: hA, type: 'perpendicular', from: a, to: segRef(b, c), label: `高 ${a}`, fullLine: true, auxiliary: true, style: 'dashed' })
      const hB = auxId('h')
      elements.push({ id: hB, type: 'perpendicular', from: b, to: segRef(a, c), label: `高 ${b}`, fullLine: true, auxiliary: true, style: 'dashed' })
      elements.push({
        id: auxId('H'),
        type: 'intersection',
        of: [segRef(a, hA), segRef(b, hB)],
        label: 'H 垂心',
        auxiliary: true,
      })
      break
    }
    case 'eulerLine': {
      if (target.type !== 'triangle') return doc
      const withOrtho = applyAuxiliaryToTarget({ ...doc, elements }, 'orthocenter', target)
      const withCent = applyAuxiliaryToTarget(withOrtho, 'centroid', target)
      elements = withCent.elements
      const h = elements.find((e) => e.label?.startsWith('H'))?.id
      const g = elements.find((e) => e.label?.startsWith('G'))?.id
      if (h && g) {
        elements.push({
          id: auxId('euler'),
          type: 'line',
          through: [h, g],
          label: '欧拉线',
          auxiliary: true,
          style: 'dashed',
        })
      }
      break
    }
    case 'diagonal': {
      if (target.type !== 'quad') return doc
      const [a, b, c, d] = target.vertices
      elements.push({ id: auxId('d1'), type: 'segment', between: [a, c], label: '对角线 AC', auxiliary: true, style: 'dashed' })
      elements.push({ id: auxId('d2'), type: 'segment', between: [b, d], label: '对角线 BD', auxiliary: true, style: 'dashed' })
      break
    }
  }

  return { ...doc, elements }
}

export const auxiliaryItems: {
  id: AuxKind
  zh: string
  en: string
  hint: { zh: string; en: string }
}[] = [
  { id: 'altitude', zh: '高', en: 'Altitude', hint: { zh: '点按钮后点击一条边', en: 'Click an edge after selecting' } },
  { id: 'median', zh: '中线', en: 'Median', hint: { zh: '点按钮后点击一条边', en: 'Click an edge after selecting' } },
  { id: 'angleBisector', zh: '角平分线', en: 'Bisector', hint: { zh: '点按钮后点击一个顶点', en: 'Click a vertex after selecting' } },
  { id: 'perpBisector', zh: '垂直平分线', en: '⊥ bisector', hint: { zh: '点按钮后点击一条线段', en: 'Click a segment after selecting' } },
  { id: 'circumcircle', zh: '外接圆', en: 'Circumcircle', hint: { zh: '点按钮后点击三角形内部', en: 'Click inside a triangle' } },
  { id: 'incircle', zh: '内切圆', en: 'Incircle', hint: { zh: '点按钮后点击三角形内部', en: 'Click inside a triangle' } },
  { id: 'centroid', zh: '重心', en: 'Centroid', hint: { zh: '点按钮后点击三角形内部', en: 'Click inside a triangle' } },
  { id: 'orthocenter', zh: '垂心', en: 'Orthocenter', hint: { zh: '点按钮后点击三角形内部', en: 'Click inside a triangle' } },
  { id: 'eulerLine', zh: '欧拉线', en: 'Euler line', hint: { zh: '点按钮后点击三角形内部', en: 'Click inside a triangle' } },
  { id: 'diagonal', zh: '对角线', en: 'Diagonal', hint: { zh: '点按钮后点击四边形内部', en: 'Click inside a quadrilateral' } },
]
