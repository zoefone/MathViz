import { useEffect, useLayoutEffect } from 'react'
import { Toolbar } from './components/Toolbar'
import { MathCanvas } from './components/MathCanvas'
import { DarkModeToggle } from './components/DarkModeToggle'
import { CodePanel } from './components/CodePanel'
import { AIPanel } from './components/AIPanel'
import { PresetGallery } from './components/PresetGallery'
import { CustomPanel } from './components/CustomPanel'
import { LatexPanel } from './components/LatexPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { SideNav } from './components/MobileBar'
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
    case 'presets':
    default:
      return <PresetGallery />
  }
}

export default function App() {
  const setDoc = useAppStore((s) => s.setDoc)
  const parseError = useAppStore((s) => s.parseError)
  const computeError = useAppStore((s) => s.computeError)
  const darkMode = useSettingsStore((s) => s.ui.darkMode)
  const locale = useSettingsStore((s) => s.ui.locale)

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

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Left: nav + panel */}
      <aside
        className="flex flex-col w-full md:w-72 lg:w-80 shrink-0 border-b md:border-b-0 md:border-r max-h-[42vh] md:max-h-none"
        style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}
      >
        <SideNav />
        <div className="flex-1 min-h-0 overflow-hidden">
          <PanelContent />
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 min-w-0 relative flex flex-col">
        <Toolbar />
        <div className="flex-1 min-h-0 relative">
        <DarkModeToggle />
        <MathCanvas />
        {!parseError && !computeError && (
          <div
            className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded-lg pointer-events-none"
            style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}
          >
            {locale === 'zh' ? '拖拽点更新 · 滚轮缩放 · 拖动画布平移' : 'Drag points · Wheel zoom · Pan canvas'}
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
