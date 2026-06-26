import type { MvzDocument } from '../core/mvz/types'

export type CustomTemplateId =
  | 'triangle'
  | 'circle'
  | 'quadrilateral'
  | 'segment'
  | 'line'
  | 'quadratic'
  | 'parabola'
  | 'freePoint'

export const customTemplates: {
  id: CustomTemplateId
  zh: string
  en: string
}[] = [
  { id: 'triangle', zh: '三角形', en: 'Triangle' },
  { id: 'circle', zh: '圆', en: 'Circle' },
  { id: 'quadrilateral', zh: '四边形', en: 'Quad' },
  { id: 'segment', zh: '线段', en: 'Segment' },
  { id: 'line', zh: '直线', en: 'Line' },
  { id: 'quadratic', zh: '二次函数', en: 'Quadratic' },
  { id: 'parabola', zh: '抛物线', en: 'Parabola' },
  { id: 'freePoint', zh: '自由点', en: 'Free point' },
]

export function buildCustomTemplate(id: CustomTemplateId): MvzDocument {
  const base: MvzDocument = {
    version: '1.0',
    viewport: { xmin: -6, xmax: 6, ymin: -5, ymax: 5 },
    elements: [],
    functions: [],
    annotations: [],
  }

  switch (id) {
    case 'triangle':
      return {
        ...base,
        elements: [
          { id: 'A', type: 'point', x: -2, y: -1, label: 'A', draggable: true },
          { id: 'B', type: 'point', x: 2, y: -1, label: 'B', draggable: true },
          { id: 'C', type: 'point', x: 0, y: 2, label: 'C', draggable: true },
          { id: 'tri', type: 'polygon', vertices: ['A', 'B', 'C'] },
        ],
      }
    case 'circle':
      return {
        ...base,
        elements: [
          { id: 'O', type: 'point', x: 0, y: 0, label: 'O', draggable: true },
          { id: 'P', type: 'point', x: 2, y: 0, label: 'P', draggable: true },
          { id: 'c1', type: 'circle', center: 'O', through: 'P' },
        ],
      }
    case 'quadrilateral':
      return {
        ...base,
        elements: [
          { id: 'A', type: 'point', x: -2, y: -1, label: 'A', draggable: true },
          { id: 'B', type: 'point', x: 2, y: -1, label: 'B', draggable: true },
          { id: 'C', type: 'point', x: 2, y: 2, label: 'C', draggable: true },
          { id: 'D', type: 'point', x: -2, y: 2, label: 'D', draggable: true },
          { id: 'quad', type: 'polygon', vertices: ['A', 'B', 'C', 'D'] },
        ],
      }
    case 'segment':
      return {
        ...base,
        elements: [
          { id: 'A', type: 'point', x: -2, y: 0, label: 'A', draggable: true },
          { id: 'B', type: 'point', x: 2, y: 1, label: 'B', draggable: true },
          { id: 's1', type: 'segment', between: ['A', 'B'] },
        ],
      }
    case 'line':
      return {
        ...base,
        elements: [
          { id: 'A', type: 'point', x: -2, y: -1, label: 'A', draggable: true },
          { id: 'B', type: 'point', x: 2, y: 1, label: 'B', draggable: true },
          { id: 'l1', type: 'line', through: ['A', 'B'] },
        ],
      }
    case 'quadratic':
      return {
        ...base,
        viewport: { xmin: -5, xmax: 5, ymin: -6, ymax: 4 },
        elements: [
          { id: 'V', type: 'point', x: 1, y: -4, label: 'V', draggable: true },
          { id: 'r1', type: 'point', x: -1, y: 0, label: 'x₁', draggable: true },
          { id: 'r2', type: 'point', x: 3, y: 0, label: 'x₂', draggable: true },
        ],
        functions: [{
          id: 'f1',
          expr: 'x^2 - 2*x - 3',
          bind: { mode: 'quadratic_vertex_roots', vertex: 'V', roots: ['r1', 'r2'] },
        }],
      }
    case 'parabola':
      return {
        ...base,
        elements: [
          { id: 'V', type: 'point', x: 0, y: 0, label: 'V', draggable: true },
          { id: 'P', type: 'point', x: 2, y: 1, label: 'P', draggable: true },
        ],
        functions: [{
          id: 'f1',
          expr: 'x^2/4',
          bind: { mode: 'quadratic_vertex', vertex: 'V', through: 'P' },
        }],
      }
    case 'freePoint':
      return {
        ...base,
        elements: [{ id: 'P', type: 'point', x: 1, y: 1, label: 'P', draggable: true }],
      }
  }
}
