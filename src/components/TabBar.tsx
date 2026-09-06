import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Tab } from '../App'
import './TabBar.css'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
  onAddItem: () => void
  onNewBasket: () => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'wishlist', label: 'Want', icon: 'list' },
  { id: 'baskets', label: 'Baskets', icon: 'basket' },
  { id: 'budget', label: 'Budget', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export function TabBar({ active, onChange, onAddItem, onNewBasket }: TabBarProps) {
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ x: 0, width: 0 })
  const [menuOpen, setMenuOpen] = useState(false)

  const activeIndex = TABS.findIndex((t) => t.id === active)

  useLayoutEffect(() => {
    const nav = navRef.current
    const tab = tabRefs.current[activeIndex]
    if (!nav || !tab || activeIndex < 0) return
    setIndicator({
      x: tab.offsetLeft,
      width: tab.offsetWidth,
    })
  }, [active, activeIndex])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const handleAddItem = () => {
    closeMenu()
    onAddItem()
  }

  const handleNewBasket = () => {
    closeMenu()
    onNewBasket()
  }

  return (
    <>
      <div className="tab-bar-dock" role="presentation">
        <div className="tab-bar-scroll-edge" aria-hidden="true" />
        <nav className="tab-bar-liquid" ref={navRef} aria-label="Main navigation">
          <div className="tab-bar-glass-layers" aria-hidden="true">
            <div className="tab-bar-lens" />
            <div className="tab-bar-tint" />
            <div className="tab-bar-specular" />
            <div className="tab-bar-caustic" />
            <div className="tab-bar-rim" />
            <div className="tab-bar-noise" />
            <div className="tab-bar-edge-line" />
          </div>
          <div
            className="tab-indicator"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.x}px)`,
            }}
            aria-hidden="true"
          >
            <div className="tab-indicator-glass" aria-hidden="true" />
          </div>
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el }}
              type="button"
              className={`tab-liquid-item ${active === tab.id ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              <TabIcon name={tab.icon} active={active === tab.id} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="tab-action-wrap">
          <button
            type="button"
            className={`tab-action-liquid ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Add"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="tab-action-glass-layers" aria-hidden="true">
              <div className="tab-bar-lens" />
              <div className="tab-bar-tint" />
              <div className="tab-bar-specular" />
              <div className="tab-bar-caustic" />
              <div className="tab-bar-rim" />
              <div className="tab-bar-noise" />
              <div className="tab-bar-edge-line" />
            </div>
            <svg
              className="tab-action-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="add-menu" role="menu">
              <div className="tab-bar-glass-layers" aria-hidden="true">
                <div className="tab-bar-lens" />
                <div className="tab-bar-tint" />
                <div className="tab-bar-specular" />
                <div className="tab-bar-rim" />
                <div className="tab-bar-noise" />
              </div>
              <button type="button" className="add-menu-item" role="menuitem" onClick={handleAddItem}>
                <span className="add-menu-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="add-menu-text">
                  <span className="add-menu-title">Add item</span>
                  <span className="add-menu-sub">Something you want</span>
                </span>
              </button>
              <button type="button" className="add-menu-item" role="menuitem" onClick={handleNewBasket}>
                <span className="add-menu-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6h15l-1.5 9h-12L6 6ZM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="add-menu-text">
                  <span className="add-menu-title">New basket</span>
                  <span className="add-menu-sub">Group items together</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {menuOpen &&
        createPortal(
          <button
            type="button"
            className="add-menu-backdrop"
            onClick={closeMenu}
            aria-label="Close menu"
          />,
          document.body,
        )}
    </>
  )
}

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 2.25 : 1.75
  if (name === 'list') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (name === 'basket') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 6h15l-1.5 9h-12L6 6ZM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'chart') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
