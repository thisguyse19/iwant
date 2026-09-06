import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import * as db from '../db'
import { CURRENCIES, type AccentStyle, type BudgetHeroView, type FixedExpenseCounting } from '../types'
import { ScreenChrome } from '../components/ScreenChrome'
import { triggerHaptic } from '../haptics'
import './SettingsScreen.css'

const ACCENT_OPTIONS: Array<{ id: AccentStyle; label: string; swatch?: string; pride?: boolean }> = [
  { id: 'slate', label: 'Slate', swatch: '#3d5a6e' },
  { id: 'terracotta', label: 'Terracotta', swatch: '#b85c38' },
  { id: 'forest', label: 'Forest', swatch: '#4a6b52' },
  { id: 'pride', label: 'Pride', pride: true },
]

const HERO_VIEW_OPTIONS: Array<{ id: BudgetHeroView; label: string }> = [
  { id: 'actual', label: 'Actual left' },
  { id: 'projected', label: 'Projected left' },
  { id: 'spent', label: 'Spent' },
  { id: 'budget', label: 'Budget cap' },
]

export function SettingsScreen() {
  const { exportData, importData, settings, updateSettings } = useApp()
  const [storage, setStorage] = useState('—')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    db.getStorageEstimate().then(setStorage)
  }, [])

  const handleExport = async () => {
    const json = await exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iwant-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const replace = window.confirm('Replace all data? Cancel to merge instead.')
    try {
      const count = await importData(text, replace ? 'replace' : 'merge')
      alert(`Imported ${count} item${count !== 1 ? 's' : ''}.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed.')
    }
    e.target.value = ''
  }

  const counting = settings.fixedExpenseCounting ?? 'lump'
  const heroView = settings.budgetHeroView ?? 'actual'

  return (
    <ScreenChrome title="Settings">
      <h2 className="settings-section-title">Budget</h2>
      <div className="settings-group">
        <div className="settings-row settings-row-stack">
          <span>Fixed expense counting</span>
          <p className="settings-row-hint">
            Used for the actual left number on the budget card.
          </p>
          <div className="settings-segmented" role="radiogroup" aria-label="Fixed expense counting">
            <button
              type="button"
              role="radio"
              aria-checked={counting === 'lump'}
              className={`settings-segmented-btn ${counting === 'lump' ? 'active' : ''}`}
              onClick={() => updateSettings({ fixedExpenseCounting: 'lump' as FixedExpenseCounting })}
            >
              Full month
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={counting === 'accrue'}
              className={`settings-segmented-btn ${counting === 'accrue' ? 'active' : ''}`}
              onClick={() => updateSettings({ fixedExpenseCounting: 'accrue' as FixedExpenseCounting })}
            >
              Daily spread
            </button>
          </div>
        </div>

        <div className="settings-row settings-row-stack">
          <span>Default budget card view</span>
          <div className="settings-chip-grid">
            {HERO_VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`settings-chip ${heroView === opt.id ? 'active' : ''}`}
                onClick={() => updateSettings({ budgetHeroView: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="settings-section-title">Appearance</h2>
      <div className="settings-group">
        <div className="settings-row settings-row-stack">
          <span>Accent colour</span>
          <div className="settings-accent-grid">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`settings-accent-btn ${(settings.accentStyle ?? 'slate') === opt.id ? 'active' : ''}`}
                onClick={() => updateSettings({ accentStyle: opt.id })}
              >
                {opt.pride ? (
                  <span className="settings-accent-swatch settings-accent-swatch-pride" />
                ) : (
                  <span className="settings-accent-swatch" style={{ background: opt.swatch }} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="settings-row settings-toggle-row">
          <span>Show wishlist thumbnails</span>
          <input
            type="checkbox"
            className="settings-toggle"
            checked={settings.showWishlistImages !== false}
            onChange={(e) => updateSettings({ showWishlistImages: e.target.checked })}
          />
        </label>
      </div>

      <h2 className="settings-section-title">Feedback</h2>
      <div className="settings-group">
        <label className="settings-row settings-toggle-row">
          <span>Haptic feedback</span>
          <input
            type="checkbox"
            className="settings-toggle"
            checked={settings.hapticFeedback !== false}
            onChange={(e) => {
              const enabled = e.target.checked
              updateSettings({ hapticFeedback: enabled })
              if (enabled) triggerHaptic('light')
            }}
          />
        </label>
      </div>

      <h2 className="settings-section-title">Data</h2>
      <div className="settings-group">
        <div className="settings-row" style={{ cursor: 'default' }}>
          <span>Currency</span>
          <select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
            className="settings-row-value"
            style={{ border: 'none', background: 'transparent' }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="settings-row" style={{ cursor: 'default' }}>
          <span>Storage used</span>
          <span className="settings-row-value">{storage}</span>
        </div>
        <button type="button" className="settings-row" onClick={handleExport}>
          Export data
        </button>
        <button type="button" className="settings-row" onClick={() => fileRef.current?.click()}>
          Import data
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>

      <p className="settings-note">
        Everything stays on this device. No account, no sync. Works offline once installed.
      </p>
    </ScreenChrome>
  )
}
