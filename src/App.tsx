import { useState, useEffect, useRef } from 'react'
import { TabBar } from './components/TabBar'
import { AppProvider, useApp } from './store'
import { ExitAnimationProvider } from './exitAnimation'
import { WishlistScreen } from './screens/WishlistScreen'
import { BasketsScreen } from './screens/BasketsScreen'
import { BudgetScreen } from './screens/BudgetScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { AddSheet } from './screens/AddSheet'
import { ItemOverviewSheet } from './screens/ItemOverviewSheet'
import { ItemEditSheet } from './screens/ItemEditSheet'
import { BoughtDateSheet } from './screens/BoughtDateSheet'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { installGlobalHaptics, refreshHapticOverlays } from './haptics'
import { setHapticEnabled } from './utils'
import './styles/global.css'

export type Tab = 'wishlist' | 'baskets' | 'budget' | 'settings'

function AppMain() {
  const [tab, setTab] = useState<Tab>('wishlist')
  const { setAddOpen, loading, setViewingBasket, setBasketCreatePending, clearSelection, settings } = useApp()
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.accent = settings.accentStyle ?? 'slate'
    setHapticEnabled(settings.hapticFeedback !== false)
    const shell = shellRef.current
    if (shell) refreshHapticOverlays(shell)
  }, [settings.accentStyle, settings.hapticFeedback])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || loading) return
    return installGlobalHaptics(shell)
  }, [loading])

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="screen">
          <div className="empty-state">Loading…</div>
        </div>
      </div>
    )
  }

  const handleTabChange = (next: Tab) => {
    clearSelection()
    if (next !== 'baskets') setViewingBasket(null)
    setTab(next)
  }

  return (
    <div
      ref={shellRef}
      className="app-shell"
      onContextMenu={(e) => {
        const target = e.target as HTMLElement
        if (
          target.closest('input, textarea, select, [contenteditable="true"]')
        ) {
          return
        }
        e.preventDefault()
      }}
    >
      {tab === 'wishlist' && <WishlistScreen />}
      {tab === 'baskets' && <BasketsScreen />}
      {tab === 'budget' && <BudgetScreen />}
      {tab === 'settings' && <SettingsScreen />}

      <TabBar
        active={tab}
        onChange={handleTabChange}
        onAddItem={() => setAddOpen(true)}
        onNewBasket={() => {
          setViewingBasket(null)
          setTab('baskets')
          setBasketCreatePending(true)
        }}
      />

      <AddSheet />
      <ItemOverviewSheet />
      <ItemEditSheet />
      <BoughtDateSheet />

      {needRefresh && (
        <div className="update-banner">
          <span>Update available</span>
          <button type="button" className="text-btn" onClick={() => updateServiceWorker(true)}>
            Reload
          </button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ExitAnimationProvider>
        <AppMain />
      </ExitAnimationProvider>
    </AppProvider>
  )
}
