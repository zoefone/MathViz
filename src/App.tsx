import { useEffect, useLayoutEffect, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { MathCanvas } from './components/MathCanvas'
import { DarkModeToggle } from './components/DarkModeToggle'
import { CodePanel } from './components/CodePanel'
import { AIPanel } from './components/AIPanel'
import { PresetGallery } from './components/PresetGallery'
import { CustomPanel } from './components/CustomPanel'
import { LatexPanel } from './components/LatexPanel'
import { AlgebraPanel } from './components/AlgebraPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { SideNav } from './components/MobileBar'
import { Toast } from './components/Toast'
import { useAppStore } from './stores/appStore'
import { useSettingsStore } from './stores/settingsStore'
import { loadMvzFromHash } from './utils/export'
import { presets } from './presets'

function PanelContent() {
  const activePanel = useAppStore((s) => s.activePanel)

  switch (activePanel) {
    case 'code':
      return <CodePanel />
    case 'ai':
      return <AIPanel />
    case 'settings':
      return <SettingsPanel />
    case 'custom':
      return <CustomPanel />
    case 'latex':
      return <LatexPanel />
    case 'algebra':
      return <AlgebraPanel />
    case 'presets':
    default:
      return <PresetGallery />
  }
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return mobile
}

export default function App() {
  const setDoc = useAppStore((s) => s.setDoc)
  const parseError = useAppStore((s) => s.parseError)
  const computeError = useAppStore((s) => s.computeError)
  const darkMode = useSettingsStore((s) => s.ui.darkMode)
  const locale = useSettingsStore((s) => s.ui.locale)
  const isMobile = useIsMobile()
  const [panelOpen, setPanelOpen] = useState(true)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const fromHash = loadMvzFromHash()
    if (fromHash) {
      setDoc(fromHash)
    } else {
      const defaultPreset = presets.find((p) => p.id === 'triangle-altitudes')
      if (defaultPreset) setDoc(structuredClone(defaultPreset.doc))
    }
  }, [setDoc])

  // On mobile, default to canvas-first after first paint on small screens
  useEffect(() => {
    if (isMobile) setPanelOpen(false)
    else setPanelOpen(true)
  }, [isMobile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      const state = useAppStore.getState()
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        state.redo()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          e.preventDefault()
          state.removeElement(state.selectedId)
          state.setSelectedId(null)
        }
        return
      }
      if (state.activePanel !== 'custom' && !['v', 'p', 's', 'l'].includes(e.key.toLowerCase())) return
      const k = e.key.toLowerCase()
      if (k === 'v') state.setDrawTool('select')
      if (k === 'p') {
        state.setActivePanel('custom')
        state.setDrawTool('point')
      }
      if (k === 's') {
        state.setActivePanel('custom')
        state.setDrawTool('segment')
      }
      if (k === 'l') {
        state.setActivePanel('custom')
        state.setDrawTool('line')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showPanel = !isMobile || panelOpen

  return (
    <div
      className="h-dvh flex flex-col md:flex-row overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {showPanel && (
        <aside
          className="flex flex-col w-full md:w-72 lg:w-80 shrink-0 border-b md:border-b-0 md:border-r md:max-h-none"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--sidebar-bg)',
            maxHeight: isMobile ? 'min(48vh, 420px)' : undefined,
          }}
        >
          <div className="flex items-center gap-1 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex-1 min-w-0">
              <SideNav />
            </div>
            {isMobile && (
              <button
                type="button"
                className="mr-2 px-2.5 py-1.5 rounded-lg text-xs shrink-0"
                style={{ background: 'var(--btn-bg)', color: 'var(--text)' }}
                onClick={() => setPanelOpen(false)}
              >
                {locale === 'zh' ? '收起' : 'Hide'}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PanelContent />
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0 relative flex flex-col min-h-0">
        <Toolbar
          mobilePanelClosed={isMobile && !panelOpen}
          onOpenPanel={() => setPanelOpen(true)}
        />
        <div className="flex-1 min-h-0 relative">
          <DarkModeToggle />
          <MathCanvas />
          {!parseError && !computeError && (
            <div
              className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded-lg pointer-events-none safe-area-hint"
              style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}
            >
              {locale === 'zh'
                ? isMobile
                  ? '拖点更新 · 双指缩放 · 拖动画布'
                  : '拖拽点更新 · 滚轮缩放 · 拖动画布平移'
                : isMobile
                  ? 'Drag points · Pinch zoom · Pan'
                  : 'Drag points · Wheel zoom · Pan canvas'}
            </div>
          )}
          {(parseError || computeError) && (
            <div
              className="absolute top-3 left-3 right-14 text-xs px-3 py-2 rounded-lg z-10"
              style={{ background: '#FF453A', color: '#fff' }}
            >
              {parseError || computeError}
            </div>
          )}
        </div>
      </main>
      <Toast />
    </div>
  )
}
