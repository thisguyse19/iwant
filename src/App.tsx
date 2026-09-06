import { useRef, useState, useEffect, type RefObject } from 'react'
import { TabBar } from './components/TabBar'
import { AppProvider } from './store'
import { LiquidGlassProvider, useLiquidGlass } from './liquidGlass/LiquidGlassProvider'
import { WishlistScreen } from './screens/WishlistScreen'
import { BasketsScreen } from './screens/BasketsScreen'
import { BudgetScreen } from './screens/BudgetScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { AddSheet } from './screens/AddSheet'
import { ItemOverviewSheet } from './screens/ItemOverviewSheet'
import { ItemEditSheet } from './screens/ItemEditSheet'
import { useApp } from './store'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './styles/global.css'

export type Tab = 'wishlist' | 'baskets' | 'budget' | 'settings'

function AppMain({ shellRef }: { shellRef: RefObject<HTMLDivElement | null> }) {
  const [tab, setTab] = useState<Tab>('wishlist')
  const { refresh } = useLiquidGlass()
  const { setAddOpen, loading, setViewingBasket, setBasketCreatePending, clearSelection } = useApp()

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    void refresh()
  }, [tab, loading, refresh])

  if (loading) {
    return (
      <div className="app-shell" ref={shellRef}>
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
    <div className="app-shell" ref={shellRef}>
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

function AppContent() {
  const shellRef = useRef<HTMLDivElement>(null)

  return (
    <LiquidGlassProvider shellRef={shellRef}>
      <AppMain shellRef={shellRef} />
    </LiquidGlassProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
