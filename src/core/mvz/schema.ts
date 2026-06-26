import { z } from 'zod'

const styleSchema = z.object({
  color: z.string().optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  auxiliary: z.boolean().optional(),
  thickness: z.number().optional(),
  label: z.string().optional(),
})

const pointSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('point'),
  x: z.number(),
  y: z.number(),
  draggable: z.boolean().optional(),
  visible: z.boolean().optional(),
})

const segmentSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('segment'),
  between: z.tuple([z.string(), z.string()]),
})

const lineSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('line'),
  through: z.tuple([z.string(), z.string()]),
})

const raySchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('ray'),
  from: z.string(),
  through: z.string(),
})

const polygonSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('polygon'),
  vertices: z.array(z.string()).min(3),
})

const circleSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('circle'),
  center: z.string(),
  radius: z.number().positive().optional(),
  through: z.string().optional(),
})

const midpointSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('midpoint'),
  of: z.tuple([z.string(), z.string()]),
})

const perpendicularSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('perpendicular'),
  from: z.string(),
  to: z.string(),
  fullLine: z.boolean().optional(),
})

const perpBisectorSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('perpBisector'),
  between: z.tuple([z.string(), z.string()]),
})

const parallelSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('parallel'),
  through: z.string(),
  to: z.string(),
})

const intersectionSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('intersection'),
  of: z.tuple([z.string(), z.string()]),
})

const angleBisectorSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('angleBisector'),
  vertex: z.string(),
  arm1: z.string(),
  arm2: z.string(),
})

const circumcircleSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('circumcircle'),
  vertices: z.tuple([z.string(), z.string(), z.string()]),
})

const incircleSchema = styleSchema.extend({
  id: z.string(),
  type: z.literal('incircle'),
  vertices: z.tuple([z.string(), z.string(), z.string()]),
})

export const elementSchema = z.discriminatedUnion('type', [
  pointSchema,
  segmentSchema,
  lineSchema,
  raySchema,
  polygonSchema,
  circleSchema,
  midpointSchema,
  perpendicularSchema,
  perpBisectorSchema,
  parallelSchema,
  intersectionSchema,
  angleBisectorSchema,
  circumcircleSchema,
  incircleSchema,
])

export const mvzSchema = z.object({
  version: z.string(),
  viewport: z.object({
    xmin: z.number(),
    xmax: z.number(),
    ymin: z.number(),
    ymax: z.number(),
  }),
  elements: z.array(elementSchema),
  functions: z
    .array(
      z.object({
        id: z.string(),
        expr: z.string(),
        color: z.string().optional(),
        domain: z.tuple([z.number(), z.number()]).optional(),
        visible: z.boolean().optional(),
        bind: z
          .union([
            z.object({ mode: z.literal('linear'), points: z.tuple([z.string(), z.string()]) }),
            z.object({
              mode: z.literal('quadratic_vertex_roots'),
              vertex: z.string(),
              roots: z.tuple([z.string(), z.string()]),
            }),
            z.object({
              mode: z.literal('quadratic_vertex'),
              vertex: z.string(),
              through: z.string(),
            }),
            z.object({
              mode: z.literal('ellipse'),
              center: z.string(),
              major: z.string(),
              minor: z.string(),
              branch: z.enum(['upper', 'lower']),
            }),
            z.object({
              mode: z.literal('hyperbola'),
              center: z.string(),
              vertex: z.string(),
              conjugate: z.string(),
              branch: z.enum(['ru', 'rd', 'lu', 'ld']),
            }),
          ])
          .optional(),
      }),
    )
    .optional(),
  annotations: z
    .array(
      z.object({
        type: z.enum(['angle', 'label']),
        points: z.array(z.string()).optional(),
        at: z.string().optional(),
        label: z.string(),
      }),
    )
    .optional(),
})
