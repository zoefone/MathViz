export interface Viewport {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export interface StyleOptions {
  color?: string
  style?: 'solid' | 'dashed' | 'dotted'
  auxiliary?: boolean
  thickness?: number
  label?: string
  visible?: boolean
}

export type ElementType =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'polygon'
  | 'circle'
  | 'midpoint'
  | 'perpendicular'
  | 'perpBisector'
  | 'parallel'
  | 'intersection'
  | 'angleBisector'
  | 'circumcircle'
  | 'incircle'

export interface BaseElement extends StyleOptions {
  id: string
  type: ElementType
  label?: string
}

export interface PointElement extends BaseElement {
  type: 'point'
  x: number
  y: number
  draggable?: boolean
  /** Constrain this point to stay on the given function graph (glider). */
  onFunction?: string
  /** This point is the free end of the tangent line at `tangentFrom` on the same function. */
  tangentFrom?: string
}

export interface SegmentElement extends BaseElement {
  type: 'segment'
  between: [string, string]
}

export interface LineElement extends BaseElement {
  type: 'line'
  through: [string, string]
}

export interface RayElement extends BaseElement {
  type: 'ray'
  from: string
  through: string
}

export interface PolygonElement extends BaseElement {
  type: 'polygon'
  vertices: string[]
}

export interface CircleElement extends BaseElement {
  type: 'circle'
  center: string
  radius?: number
  through?: string
}

export interface MidpointElement extends BaseElement {
  type: 'midpoint'
  of: [string, string]
}

export interface PerpendicularElement extends BaseElement {
  type: 'perpendicular'
  from: string
  to: string
  /** When true, draw the full perpendicular line through `from`, not only the segment to the foot. */
  fullLine?: boolean
}

export interface PerpBisectorElement extends BaseElement {
  type: 'perpBisector'
  between: [string, string]
}

export interface ParallelElement extends BaseElement {
  type: 'parallel'
  through: string
  to: string
}

export interface IntersectionElement extends BaseElement {
  type: 'intersection'
  of: [string, string]
}

export interface AngleBisectorElement extends BaseElement {
  type: 'angleBisector'
  vertex: string
  arm1: string
  arm2: string
}

export interface CircumcircleElement extends BaseElement {
  type: 'circumcircle'
  vertices: [string, string, string]
}

export interface IncircleElement extends BaseElement {
  type: 'incircle'
  vertices: [string, string, string]
}

export type MvzElement =
  | PointElement
  | SegmentElement
  | LineElement
  | RayElement
  | PolygonElement
  | CircleElement
  | MidpointElement
  | PerpendicularElement
  | PerpBisectorElement
  | ParallelElement
  | IntersectionElement
  | AngleBisectorElement
  | CircumcircleElement
  | IncircleElement

export type FunctionBind =
  | { mode: 'linear'; points: [string, string] }
  | { mode: 'quadratic_vertex_roots'; vertex: string; roots: [string, string] }
  | { mode: 'quadratic_vertex'; vertex: string; through: string }
  | { mode: 'ellipse'; center: string; major: string; minor: string; branch: 'upper' | 'lower' }
  | {
      mode: 'hyperbola'
      center: string
      vertex: string
      conjugate: string
      branch: 'ru' | 'rd' | 'lu' | 'ld'
    }

export interface FunctionDef {
  id: string
  expr: string
  color?: string
  domain?: [number, number]
  bind?: FunctionBind
  visible?: boolean
}

export interface Annotation {
  type: 'angle' | 'label'
  points?: string[]
  at?: string
  label: string
}

export interface MvzDocument {
  version: string
  viewport: Viewport
  elements: MvzElement[]
  functions?: FunctionDef[]
  annotations?: Annotation[]
}

export interface ComputedPoint {
  x: number
  y: number
}

export interface ComputedState {
  points: Record<string, ComputedPoint>
  segments: Array<{ id: string; a: string; b: string; style: StyleOptions }>
  lines: Array<{ id: string; p1: ComputedPoint; p2: ComputedPoint; style: StyleOptions }>
  rays: Array<{ id: string; from: ComputedPoint; through: ComputedPoint; style: StyleOptions }>
  polygons: Array<{ id: string; vertices: string[]; style: StyleOptions }>
  circles: Array<{ id: string; center: ComputedPoint; radius: number; style: StyleOptions }>
  functions: FunctionDef[]
  annotations: Annotation[]
  viewport: Viewport
}
