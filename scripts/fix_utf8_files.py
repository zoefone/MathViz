# -*- coding: utf-8 -*-
"""Rewrite AlgebraPanel and measure/compute as UTF-8. ASCII-only source."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LENGTH_ZH = "\u957f\u5ea6 = "
AREA_ZH = "\u9762\u79ef = "

compute = (
    "import type { MvzDocument, Annotation } from '../mvz/types'\n"
    "\n"
    "function pt(doc: MvzDocument, id: string): { x: number; y: number } | null {\n"
    "  const el = doc.elements.find((e) => e.id === id && e.type === 'point')\n"
    "  if (el?.type !== 'point') return null\n"
    "  return { x: el.x, y: el.y }\n"
    "}\n"
    "\n"
    "export function distanceBetween(doc: MvzDocument, a: string, b: string): number | null {\n"
    "  const p = pt(doc, a)\n"
    "  const q = pt(doc, b)\n"
    "  if (!p || !q) return null\n"
    "  return Math.hypot(q.x - p.x, q.y - p.y)\n"
    "}\n"
    "\n"
    "export function angleDegrees(doc: MvzDocument, a: string, b: string, c: string): number | null {\n"
    "  const A = pt(doc, a)\n"
    "  const B = pt(doc, b)\n"
    "  const C = pt(doc, c)\n"
    "  if (!A || !B || !C) return null\n"
    "  const v1x = A.x - B.x\n"
    "  const v1y = A.y - B.y\n"
    "  const v2x = C.x - B.x\n"
    "  const v2y = C.y - B.y\n"
    "  const n1 = Math.hypot(v1x, v1y)\n"
    "  const n2 = Math.hypot(v2x, v2y)\n"
    "  if (n1 < 1e-12 || n2 < 1e-12) return null\n"
    "  let cos = (v1x * v2x + v1y * v2y) / (n1 * n2)\n"
    "  cos = Math.max(-1, Math.min(1, cos))\n"
    "  return (Math.acos(cos) * 180) / Math.PI\n"
    "}\n"
    "\n"
    "export function polygonArea(doc: MvzDocument, vertices: string[]): number | null {\n"
    "  const coords = vertices.map((id) => pt(doc, id)).filter((c): c is { x: number; y: number } => !!c)\n"
    "  if (coords.length < 3) return null\n"
    "  let sum = 0\n"
    "  for (let i = 0; i < coords.length; i++) {\n"
    "    const j = (i + 1) % coords.length\n"
    "    sum += coords[i].x * coords[j].y - coords[j].x * coords[i].y\n"
    "  }\n"
    "  return Math.abs(sum) / 2\n"
    "}\n"
    "\n"
    "export function fmt(n: number, digits = 2): string {\n"
    "  const r = Math.round(n * 10 ** digits) / 10 ** digits\n"
    "  return Number.isInteger(r) ? String(r) : r.toFixed(digits)\n"
    "}\n"
    "\n"
    "export interface AlgebraRow {\n"
    "  id: string\n"
    "  kind: 'point' | 'length' | 'angle' | 'area' | 'function' | 'circle'\n"
    "  title: string\n"
    "  value: string\n"
    "}\n"
    "\n"
    "export function buildAlgebraRows(doc: MvzDocument, locale: 'zh' | 'en'): AlgebraRow[] {\n"
    "  const rows: AlgebraRow[] = []\n"
    "\n"
    "  for (const el of doc.elements) {\n"
    "    if (el.type === 'point' && el.visible !== false) {\n"
    "      rows.push({\n"
    "        id: `pt-${el.id}`,\n"
    "        kind: 'point',\n"
    "        title: el.label ?? el.id,\n"
    "        value: `(${fmt(el.x)}, ${fmt(el.y)})`,\n"
    "      })\n"
    "    }\n"
    "    if (el.type === 'segment' && el.visible !== false) {\n"
    "      const d = distanceBetween(doc, el.between[0], el.between[1])\n"
    "      if (d !== null) {\n"
    "        rows.push({\n"
    "          id: `len-${el.id}`,\n"
    "          kind: 'length',\n"
    "          title: el.label ?? `${el.between[0]}${el.between[1]}`,\n"
    "          value: locale === 'zh' ? `" + LENGTH_ZH + "${fmt(d)}` : `length = ${fmt(d)}`,\n"
    "        })\n"
    "      }\n"
    "    }\n"
    "    if (el.type === 'circle' && el.visible !== false) {\n"
    "      const c = pt(doc, el.center)\n"
    "      if (c) {\n"
    "        let r = el.radius\n"
    "        if (r == null && el.through) {\n"
    "          r = distanceBetween(doc, el.center, el.through) ?? undefined\n"
    "        }\n"
    "        if (r != null) {\n"
    "          rows.push({\n"
    "            id: `cir-${el.id}`,\n"
    "            kind: 'circle',\n"
    "            title: el.label ?? el.id,\n"
    "            value: `(x-${fmt(c.x)})\\u00b2+(y-${fmt(c.y)})\\u00b2=${fmt(r * r)}`,\n"
    "          })\n"
    "        }\n"
    "      }\n"
    "    }\n"
    "    if (el.type === 'polygon' && el.visible !== false) {\n"
    "      const area = polygonArea(doc, el.vertices)\n"
    "      if (area !== null) {\n"
    "        rows.push({\n"
    "          id: `area-${el.id}`,\n"
    "          kind: 'area',\n"
    "          title: el.label ?? el.id,\n"
    "          value: locale === 'zh' ? `" + AREA_ZH + "${fmt(area)}` : `area = ${fmt(area)}`,\n"
    "        })\n"
    "      }\n"
    "    }\n"
    "  }\n"
    "\n"
    "  for (const ann of doc.annotations ?? []) {\n"
    "    if (ann.type === 'distance' && ann.points?.length === 2) {\n"
    "      const d = distanceBetween(doc, ann.points[0], ann.points[1])\n"
    "      if (d !== null) {\n"
    "        rows.push({\n"
    "          id: `ann-d-${ann.points.join('-')}`,\n"
    "          kind: 'length',\n"
    "          title: ann.label || `${ann.points[0]}${ann.points[1]}`,\n"
    "          value: fmt(d),\n"
    "        })\n"
    "      }\n"
    "    }\n"
    "    if (ann.type === 'angle' && ann.points?.length === 3) {\n"
    "      const a = angleDegrees(doc, ann.points[0], ann.points[1], ann.points[2])\n"
    "      if (a !== null) {\n"
    "        rows.push({\n"
    "          id: `ann-a-${ann.points.join('-')}`,\n"
    "          kind: 'angle',\n"
    "          title: ann.label || `\\u2220${ann.points[1]}`,\n"
    "          value: `${fmt(a)}\\u00b0`,\n"
    "        })\n"
    "      }\n"
    "    }\n"
    "    if (ann.type === 'area' && ann.points && ann.points.length >= 3) {\n"
    "      const area = polygonArea(doc, ann.points)\n"
    "      if (area !== null) {\n"
    "        rows.push({\n"
    "          id: `ann-area-${ann.points.join('-')}`,\n"
    "          kind: 'area',\n"
    "          title: ann.label || 'S',\n"
    "          value: fmt(area),\n"
    "        })\n"
    "      }\n"
    "    }\n"
    "  }\n"
    "\n"
    "  for (const fn of doc.functions ?? []) {\n"
    "    if (fn.visible === false) continue\n"
    "    rows.push({\n"
    "      id: `fn-${fn.id}`,\n"
    "      kind: 'function',\n"
    "      title: fn.id,\n"
    "      value: `y = ${fn.expr}`,\n"
    "    })\n"
    "  }\n"
    "\n"
    "  return rows\n"
    "}\n"
    "\n"
    "export function annotationValueLabel(doc: MvzDocument, ann: Annotation): string {\n"
    "  if (ann.type === 'distance' && ann.points?.length === 2) {\n"
    "    const d = distanceBetween(doc, ann.points[0], ann.points[1])\n"
    "    return d !== null ? fmt(d) : ann.label\n"
    "  }\n"
    "  if (ann.type === 'angle' && ann.points?.length === 3) {\n"
    "    const a = angleDegrees(doc, ann.points[0], ann.points[1], ann.points[2])\n"
    "    return a !== null ? `${fmt(a)}\\u00b0` : ann.label\n"
    "  }\n"
    "  if (ann.type === 'area' && ann.points && ann.points.length >= 3) {\n"
    "    const area = polygonArea(doc, ann.points)\n"
    "    return area !== null ? `S=${fmt(area)}` : ann.label\n"
    "  }\n"
    "  return ann.label\n"
    "}\n"
)

# Fix unicode escapes that should be real chars in TS output
compute = compute.replace("\\u00b2", "\u00b2").replace("\\u2220", "\u2220").replace("\\u00b0", "\u00b0")

TITLE = "\u4ee3\u6570\u89c6\u56fe"
DESC = "\u5b9e\u65f6\u663e\u793a\u5750\u6807\u3001\u957f\u5ea6\u3001\u89d2\u5ea6\u3001\u9762\u79ef\u4e0e\u51fd\u6570\u5f0f\uff1b\u62d6\u52a8\u70b9\u540e\u81ea\u52a8\u66f4\u65b0"
EMPTY = "\u753b\u5e03\u4e3a\u7a7a\uff0c\u5148\u4ece\u6a21\u677f\u6216\u81ea\u5b9a\u4e49\u5f00\u59cb"
MEAS = "\u6d4b\u91cf\u6807\u6ce8"
DEL = "\u5220"

algebra_lines = [
    "import { useMemo } from 'react'",
    "import { useAppStore } from '../stores/appStore'",
    "import { useSettingsStore } from '../stores/settingsStore'",
    "import { buildAlgebraRows } from '../core/measure/compute'",
    "",
    "export function AlgebraPanel() {",
    "  const locale = useSettingsStore((s) => s.ui.locale)",
    "  const doc = useAppStore((s) => s.doc)",
    "  const selectedId = useAppStore((s) => s.selectedId)",
    "  const setSelectedId = useAppStore((s) => s.setSelectedId)",
    "  const removeAnnotationAt = useAppStore((s) => s.removeAnnotationAt)",
    "",
    "  const rows = useMemo(() => buildAlgebraRows(doc, locale), [doc, locale])",
    "",
    "  return (",
    '    <div className="p-3 space-y-3 overflow-y-auto h-full text-sm">',
    "      <div>",
    '        <h2 className="text-sm font-semibold mb-1">',
    "          {locale === 'zh' ? '" + TITLE + "' : 'Algebra view'}",
    "        </h2>",
    "        <p className=\"text-xs\" style={{ color: 'var(--text-muted)' }}>",
    "          {locale === 'zh'",
    "            ? '" + DESC + "'",
    "            : 'Live coordinates, lengths, angles, areas and functions'}",
    "        </p>",
    "      </div>",
    "",
    '      <div className="space-y-1">',
    "        {rows.length === 0 && (",
    "          <p className=\"text-xs\" style={{ color: 'var(--text-muted)' }}>",
    "            {locale === 'zh' ? '" + EMPTY + "' : 'Canvas empty - start from a preset'}",
    "          </p>",
    "        )}",
    "        {rows.map((row) => {",
    "          const selectable =",
    "            row.kind === 'point' || row.kind === 'length' || row.kind === 'circle' || row.kind === 'area'",
    "          const elId =",
    "            row.kind === 'point'",
    "              ? row.id.replace(/^pt-/, '')",
    "              : row.kind === 'length'",
    "                ? row.id.replace(/^len-/, '')",
    "                : row.kind === 'circle'",
    "                  ? row.id.replace(/^cir-/, '')",
    "                  : row.kind === 'area'",
    "                    ? row.id.replace(/^area-/, '')",
    "                    : null",
    "          const active = elId && selectedId === elId",
    "          return (",
    "            <button",
    "              key={row.id}",
    '              type="button"',
    "              disabled={!selectable || !elId}",
    "              onClick={() => elId && setSelectedId(elId)}",
    '              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono border"',
    "              style={{",
    "                borderColor: active ? 'var(--accent)' : 'var(--border)',",
    "                background: active ? 'var(--btn-bg)' : 'var(--card-bg)',",
    "                color: 'var(--text)',",
    "              }}",
    "            >",
    "              <span style={{ color: 'var(--text-muted)' }}>{row.title}</span>",
    '              <span className="ml-2">{row.value}</span>',
    "            </button>",
    "          )",
    "        })}",
    "      </div>",
    "",
    "      {(doc.annotations ?? []).length > 0 && (",
    "        <div>",
    '          <h3 className="text-xs font-semibold mb-1.5" style={{ color: \'var(--text-muted)\' }}>',
    "            {locale === 'zh' ? '" + MEAS + "' : 'Measurements'}",
    "          </h3>",
    '          <div className="space-y-1">',
    "            {(doc.annotations ?? []).map((ann, i) => (",
    "              <div",
    "                key={ann.type + '-' + i}",
    '                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"',
    "                style={{ background: 'var(--input-bg)' }}",
    "              >",
    '                <span className="flex-1 truncate">',
    "                  {ann.type}: {ann.label}",
    "                  {ann.points ? ' (' + ann.points.join(',') + ')' : ''}",
    "                </span>",
    "                <button",
    '                  type="button"',
    '                  className="px-2 py-0.5 rounded"',
    "                  style={{ background: 'var(--btn-bg)', color: 'var(--text)' }}",
    "                  onClick={() => removeAnnotationAt(i)}",
    "                >",
    "                  {locale === 'zh' ? '" + DEL + "' : 'Del'}",
    "                </button>",
    "              </div>",
    "            ))}",
    "          </div>",
    "        </div>",
    "      )}",
    "    </div>",
    "  )",
    "}",
    "",
]

(ROOT / "src/core/measure/compute.ts").write_text(compute, encoding="utf-8", newline="\n")
(ROOT / "src/components/AlgebraPanel.tsx").write_text("\n".join(algebra_lines), encoding="utf-8", newline="\n")
print("OK")
