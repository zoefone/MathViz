import { create } from 'zustand'
import type { MvzDocument, MvzElement, FunctionDef } from '../core/mvz/types'
import { computeMvz } from '../core/mvz/engine'
import { getEmptyDoc, parseMvz, serializeMvz } from '../core/mvz/parser'
import { applyFunctionBinds } from '../core/functions/bind'
import { buildCustomTemplate, type CustomTemplateId } from '../custom/templates'
import { applyAuxiliaryToTarget, type AuxKind, type AuxTarget } from '../custom/auxiliaryActions'

interface HistoryEntry {
  doc: MvzDocument
  code: string
}

export type DrawTool =
  | 'select'
  | 'point'
  | 'segment'
  | 'line'
  | 'circle'
  | 'polygon'
  | 'regularPolygon'
  | 'perpendicular'
  | 'parallel'
  | 'midpoint'
  | 'bisector'

export type ActivePanel = 'presets' | 'code' | 'ai' | 'settings' | 'custom' | 'latex'

export type ConstructionStep =
  | { tool: 'perpendicular'; from?: string; to?: string }
  | { tool: 'parallel'; through?: string; to?: string }
  | { tool: 'midpoint'; points: string[] }
  | { tool: 'bisector'; points: string[] }
  | null

function structureKey(doc: MvzDocument): string {
  const elements = doc.elements.map((e) =>
    e.type === 'point'
      ? { id: e.id, type: e.type, label: e.label, draggable: e.draggable, visible: e.visible }
      : e,
  )
  return JSON.stringify({
    elements,
    functions: doc.functions?.map((f) => ({
      id: f.id,
      expr: f.expr,
      bind: f.bind,
      domain: f.domain,
      color: f.color,
      visible: f.visible,
    })),
    viewport: doc.viewport,
    annotations: doc.annotations,
  })
}

interface AppState {
  doc: MvzDocument
  code: string
  structureKey: string
  parseError: string | null
  computeError: string | null
  history: HistoryEntry[]
  historyIndex: number
  activePanel: ActivePanel
  drawTool: DrawTool
  selectedId: string | null
  pendingSegmentFrom: string | null
  pendingPolygonVerts: string[]
  customCounter: number
  polygonSides: number
  construction: ConstructionStep
  latexDraft: string
  pendingAuxKind: AuxKind | null

  setCode: (code: string) => void
  setDoc: (doc: MvzDocument, recordHistory?: boolean) => void
  syncDocFromBoard: (doc: MvzDocument, recordHistory?: boolean) => void
  loadFromCode: (code: string) => void
  runCode: () => void
  undo: () => void
  redo: () => void
  clearCanvas: () => void
  setActivePanel: (panel: ActivePanel) => void
  setDrawTool: (tool: DrawTool) => void
  setSelectedId: (id: string | null) => void
  addElement: (el: MvzElement) => void
  updateElement: (id: string, patch: Partial<MvzElement>) => void
  removeElement: (id: string) => void
  toggleElementVisible: (id: string) => void
  toggleFunctionVisible: (id: string) => void
  setPendingSegmentFrom: (id: string | null) => void
  pushPolygonVertex: (id: string) => void
  clearPolygonVerts: () => void
  finishPolygon: () => void
  setPolygonSides: (n: number) => void
  setConstruction: (c: ConstructionStep) => void
  setLatexDraft: (s: string) => void
  addFunction: (fn: FunctionDef) => void
  nextCustomId: (prefix: string) => string
  loadCustomTemplate: (id: CustomTemplateId) => void
  setPendingAuxKind: (kind: AuxKind | null) => void
  applyAuxiliaryToTarget: (kind: AuxKind, target: AuxTarget) => void
  getComputed: () => ReturnType<typeof computeMvz> | null
}

function appendHistory(state: AppState, doc: MvzDocument, code: string): Partial<AppState> {
  const trimmed = state.history.slice(0, state.historyIndex + 1)
  trimmed.push({ doc: structuredClone(doc), code })
  return { history: trimmed, historyIndex: trimmed.length - 1 }
}

function commitDoc(doc: MvzDocument, recordHistory: boolean, state: AppState): Partial<AppState> {
  const bound = applyFunctionBinds(doc)
  const code = serializeMvz(bound)
  const updates: Partial<AppState> = {
    doc: bound,
    code,
    structureKey: structureKey(bound),
    parseError: null,
    computeError: null,
  }
  if (recordHistory) Object.assign(updates, appendHistory(state, bound, code))
  return updates
}

export const useAppStore = create<AppState>((set, get) => ({
  doc: getEmptyDoc(),
  code: serializeMvz(getEmptyDoc()),
  structureKey: structureKey(getEmptyDoc()),
  parseError: null,
  computeError: null,
  history: [{ doc: getEmptyDoc(), code: serializeMvz(getEmptyDoc()) }],
  historyIndex: 0,
  activePanel: 'presets',
  drawTool: 'select',
  selectedId: null,
  pendingSegmentFrom: null,
  pendingPolygonVerts: [],
  customCounter: 0,
  polygonSides: 6,
  construction: null,
  latexDraft: 'a*x^2 + b*x + c',
  pendingAuxKind: null,

  setCode: (code) => set({ code }),

  setDoc: (doc, recordHistory = true) => {
    set(commitDoc(doc, recordHistory, get()))
  },

  syncDocFromBoard: (doc, recordHistory = true) => {
    set(commitDoc(doc, recordHistory, get()))
  },

  loadFromCode: (code) => {
    const { doc, error } = parseMvz(code)
    if (error) {
      set({ code, parseError: error })
      return
    }
    set(commitDoc(doc, true, get()))
  },

  runCode: () => get().loadFromCode(get().code),

  clearCanvas: () => {
    const empty = getEmptyDoc()
    set(commitDoc(empty, true, get()))
    set({ selectedId: null, pendingSegmentFrom: null, pendingPolygonVerts: [], construction: null })
  },

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex <= 0) return
    const entry = history[historyIndex - 1]
    set({
      historyIndex: historyIndex - 1,
      doc: structuredClone(entry.doc),
      code: entry.code,
      structureKey: structureKey(entry.doc),
      parseError: null,
      computeError: null,
    })
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set({
      historyIndex: historyIndex + 1,
      doc: structuredClone(entry.doc),
      code: entry.code,
      structureKey: structureKey(entry.doc),
      parseError: null,
      computeError: null,
    })
  },

  setActivePanel: (panel) => set({ activePanel: panel }),

  setDrawTool: (tool) =>
    set({
      drawTool: tool,
      pendingSegmentFrom: null,
      pendingPolygonVerts: [],
      construction: null,
      pendingAuxKind: null,
    }),

  setSelectedId: (id) => set({ selectedId: id }),

  addElement: (el) => {
    const doc = { ...get().doc, elements: [...get().doc.elements, el] }
    set(commitDoc(doc, true, get()))
  },

  updateElement: (id, patch) => {
    const doc = {
      ...get().doc,
      elements: get().doc.elements.map((e) => (e.id === id ? { ...e, ...patch } as MvzElement : e)),
    }
    set(commitDoc(doc, true, get()))
  },

  removeElement: (id) => {
    const doc = {
      ...get().doc,
      elements: get().doc.elements.filter((e) => e.id !== id),
    }
    set(commitDoc(doc, true, get()))
  },

  toggleElementVisible: (id) => {
    const doc = {
      ...get().doc,
      elements: get().doc.elements.map((e) =>
        e.id === id ? { ...e, visible: e.visible === false } : e,
      ),
    }
    set(commitDoc(doc, true, get()))
  },

  toggleFunctionVisible: (id) => {
    const doc = {
      ...get().doc,
      functions: (get().doc.functions ?? []).map((f) =>
        f.id === id ? { ...f, visible: f.visible === false } : f,
      ),
    }
    set(commitDoc(doc, true, get()))
  },

  setPendingSegmentFrom: (id) => set({ pendingSegmentFrom: id }),

  pushPolygonVertex: (id) =>
    set((s) => ({ pendingPolygonVerts: [...s.pendingPolygonVerts, id] })),

  clearPolygonVerts: () => set({ pendingPolygonVerts: [] }),

  finishPolygon: () => {
    const verts = get().pendingPolygonVerts
    if (verts.length < 3) return
    const id = get().nextCustomId('poly')
    get().addElement({ id, type: 'polygon', vertices: verts })
    set({ pendingPolygonVerts: [] })
  },

  setPolygonSides: (n) => set({ polygonSides: Math.max(3, Math.min(24, Math.round(n))) }),

  setConstruction: (c) => set({ construction: c }),

  setLatexDraft: (s) => set({ latexDraft: s }),

  addFunction: (fn) => {
    const doc = {
      ...get().doc,
      functions: [...(get().doc.functions ?? []), fn],
    }
    set(commitDoc(doc, true, get()))
  },

  nextCustomId: (prefix) => {
    const n = get().customCounter + 1
    set({ customCounter: n })
    return `${prefix}${n}`
  },

  loadCustomTemplate: (id) => {
    set(commitDoc(buildCustomTemplate(id), true, get()))
    set({ selectedId: null, pendingSegmentFrom: null, pendingPolygonVerts: [], construction: null, pendingAuxKind: null })
  },

  setPendingAuxKind: (kind) => set({ pendingAuxKind: kind, drawTool: 'select' }),

  applyAuxiliaryToTarget: (kind, target) => {
    set(commitDoc(applyAuxiliaryToTarget(get().doc, kind, target), true, get()))
    set({ pendingAuxKind: null })
  },

  getComputed: () => {
    try {
      return computeMvz(get().doc)
    } catch {
      return null
    }
  },
}))

export { structureKey }
