import type { MvzDocument } from '../core/mvz/types'
import { getBoardInstance } from '../core/mvz/boardRef'

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function saveMvzFile(doc: MvzDocument) {
  downloadText(JSON.stringify(doc, null, 2), 'figure.mvz', 'application/json')
}

export function loadMvzFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mvz,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file'))
      resolve(await file.text())
    }
    input.click()
  })
}

export function shareMvzUrl(doc: MvzDocument) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(doc))))
  const url = `${window.location.origin}${window.location.pathname}#mvz=${encoded}`
  navigator.clipboard?.writeText(url)
  return url
}

export function loadMvzFromHash(): MvzDocument | null {
  const hash = window.location.hash
  const match = hash.match(/#mvz=(.+)/)
  if (!match) return null
  try {
    const json = decodeURIComponent(escape(atob(match[1])))
    return JSON.parse(json) as MvzDocument
  } catch {
    return null
  }
}

export function exportBoardPng(_boardEl?: HTMLElement | null) {
  const board = getBoardInstance()
  if (!board) return

  const el = _boardEl ?? document.getElementById('mathviz-board')
  const w = el?.clientWidth ?? 800
  const h = el?.clientHeight ?? 600

  const finish = (dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'mathviz.png'
    a.click()
  }

  try {
    const renderer = board.renderer as {
      dumpToDataURI?: (ignoreTexts?: boolean) => string
      dumpToCanvas?: (id: string, w?: number, h?: number, ignoreTexts?: boolean) => Promise<void>
    }

    const canvas = document.createElement('canvas')
    canvas.id = `mathviz-export-${Date.now()}`
    canvas.width = w
    canvas.height = h
    canvas.style.position = 'fixed'
    canvas.style.left = '-9999px'
    document.body.appendChild(canvas)

    if (renderer.dumpToCanvas) {
      renderer
        .dumpToCanvas(canvas.id, w, h, false)
        .then(() => finish(canvas.toDataURL('image/png')))
        .catch(() => svgFallback())
        .finally(() => canvas.remove())
      return
    }
    svgFallback()
  } catch {
    svgFallback()
  }

  function svgFallback() {
    const renderer = board?.renderer as { dumpToDataURI?: (ignoreTexts?: boolean) => string }
    const uri = renderer?.dumpToDataURI?.(false)
    if (!uri) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      finish(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      const svg = document.querySelector('#mathviz-board svg')
      if (!svg) return
      const svgData = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      img.src = URL.createObjectURL(blob)
    }
    img.src = uri
  }
}

export function exportBoardSvg(boardEl?: HTMLElement | null) {
  const el = boardEl ?? document.getElementById('mathviz-board')
  const svg = el?.querySelector('svg')
  if (!svg) return
  const svgData = new XMLSerializer().serializeToString(svg)
  downloadText(svgData, 'mathviz.svg', 'image/svg+xml')
}
