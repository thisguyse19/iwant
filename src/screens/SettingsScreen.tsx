import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import * as db from '../db'
import { CURRENCIES } from '../types'

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

  return (
    <div className="screen screen-enter">
      <header className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </header>

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
      </div>

      <div className="settings-group">
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
    </div>
  )
}
