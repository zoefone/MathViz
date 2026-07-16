import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import { t } from '../i18n'
import { exportBoardPng, exportBoardSvg, saveMvzFile, loadMvzFile, shareMvzUrl } from '../utils/export'

const CLEAR_WINDOW_MS = 2500

function IconBtn({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-40"
      style={{
        background: active ? 'var(--accent)' : 'var(--btn-bg)',
        color: active ? 'var(--accent-text)' : 'var(--text)',
      }}
    >
      {children}
    </button>
  )
}

export function Toolbar({
  mobilePanelClosed,
  onOpenPanel,
}: {
  mobilePanelClosed?: boolean
  onOpenPanel?: () => void
} = {}) {
  const locale = useSettingsStore((s) => s.ui.locale)
  const doc = useAppStore((s) => s.doc)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const clearCanvas = useAppStore((s) => s.clearCanvas)
  const historyIndex = useAppStore((s) => s.historyIndex)
  const history = useAppStore((s) => s.history)
  const loadFromCode = useAppStore((s) => s.loadFromCode)
  const toast = useToastStore((s) => s.show)

  const clearArmedAt = useRef(0)
  const [clearArmed, setClearArmed] = useState(false)

  const handleClear = () => {
    const now = Date.now()
    if (!clearArmed || now - clearArmedAt.current > CLEAR_WINDOW_MS) {
      clearArmedAt.current = now
      setClearArmed(true)
      setTimeout(() => setClearArmed(false), CLEAR_WINDOW_MS)
      return
    }
    setClearArmed(false)
    clearCanvas()
  }

  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b shrink-0 safe-area-pt"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5">
        {mobilePanelClosed && onOpenPanel && (
          <IconBtn title={locale === 'zh' ? '打开面板' : 'Open panel'} onClick={onOpenPanel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </IconBtn>
        )}
        <IconBtn title={t(locale, 'undo')} onClick={undo} disabled={historyIndex <= 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14H4V9"/><path d="M4 14c1.5-4 6-7 10-5.5"/></svg>
        </IconBtn>
        <IconBtn title={t(locale, 'redo')} onClick={redo} disabled={historyIndex >= history.length - 1}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14h5v-5"/><path d="M20 14c-1.5-4-6-7-10-5.5"/></svg>
        </IconBtn>
        <IconBtn
          title={clearArmed ? t(locale, 'clearConfirm') : t(locale, 'clearCanvas')}
          onClick={handleClear}
          active={clearArmed}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </IconBtn>
      </div>
      <div className="flex items-center gap-1.5">
        <IconBtn
          title={t(locale, 'exportPng')}
          onClick={() => {
            exportBoardPng()
            toast(locale === 'zh' ? '已导出 PNG' : 'PNG exported', 'success')
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </IconBtn>
        <IconBtn
          title={t(locale, 'exportSvg')}
          onClick={() => {
            exportBoardSvg()
            toast(locale === 'zh' ? '已导出 SVG' : 'SVG exported', 'success')
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
        </IconBtn>
        <IconBtn
          title={t(locale, 'saveMvz')}
          onClick={() => {
            saveMvzFile(doc)
            toast(locale === 'zh' ? '已保存 MVZ' : 'MVZ saved', 'success')
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
        </IconBtn>
        <IconBtn
          title={t(locale, 'share')}
          onClick={async () => {
            try {
              const url = shareMvzUrl(doc)
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url)
                toast(locale === 'zh' ? '链接已复制' : 'Link copied', 'success')
              } else {
                toast(locale === 'zh' ? '无法复制，请手动分享' : 'Copy unavailable', 'error')
              }
            } catch {
              toast(locale === 'zh' ? '复制失败' : 'Copy failed', 'error')
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.49l-6.82 3.98"/></svg>
        </IconBtn>
        <IconBtn
          title={t(locale, 'loadMvz')}
          onClick={async () => {
            try {
              const text = await loadMvzFile()
              loadFromCode(text)
              toast(locale === 'zh' ? '已加载文件' : 'File loaded', 'success')
            } catch { /* cancelled */ }
          }}
        >          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </IconBtn>
      </div>
    </div>
  )
}
