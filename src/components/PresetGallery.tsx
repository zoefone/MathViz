import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { presets } from '../presets'
import { t } from '../i18n'

export function PresetGallery() {
  const locale = useSettingsStore((s) => s.ui.locale)
  const setDoc = useAppStore((s) => s.setDoc)

  const junior = presets.filter((p) => p.category === 'junior')
  const senior = presets.filter((p) => p.category === 'senior')

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Section title={t(locale, 'junior')} items={junior} locale={locale} onSelect={setDoc} />
      <Section title={t(locale, 'senior')} items={senior} locale={locale} onSelect={setDoc} />
    </div>
  )
}

function Section({
  title,
  items,
  locale,
  onSelect,
}: {
  title: string
  items: typeof presets
  locale: 'zh' | 'en'
  onSelect: (doc: typeof presets[0]['doc']) => void
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      <div className="grid gap-2">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(structuredClone(p.doc))}
            className="text-left p-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
            }}
          >
            <div className="font-medium text-sm">
              {locale === 'zh' ? p.name : p.nameEn}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {locale === 'zh' ? p.description : p.descriptionEn}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
