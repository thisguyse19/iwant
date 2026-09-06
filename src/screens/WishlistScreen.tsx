import type { CSSProperties } from 'react'
import { useFilteredItems, useApp, useListTotal, useActiveItems } from '../store'
import { ItemRow } from '../components/ItemRow'
import { CATEGORIES, type CategoryFilter } from '../types'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'
import './WishlistScreen.css'

export function WishlistScreen() {
  const { categoryFilter, setCategoryFilter, setAddOpen, setViewingItem, updateItem, removeItem } = useApp()
  const filtered = useFilteredItems()
  const activeItems = useActiveItems()
  const listTotal = useListTotal(filtered)

  const handleMarkBought = async (id: string) => {
    vibrate()
    await updateItem(id, { status: 'bought' })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Want</h1>
        {activeItems.length > 0 && (
          <p className="header-subtitle">
            {activeItems.length} on your list
          </p>
        )}
      </header>

      <div className="category-filter-row" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`filter-chip ${categoryFilter === cat.id ? 'active' : ''}`}
            style={{
              '--chip-color': cat.color,
              '--chip-bg': cat.bg,
            } as CSSProperties}
            onClick={() => setCategoryFilter(cat.id as CategoryFilter)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="total-bar">
          <span className="total-bar-label">
            {listTotal.count} item{listTotal.count !== 1 ? 's' : ''}
            {listTotal.unpriced > 0 && ` · ${listTotal.unpriced} unpriced`}
          </span>
          <span className="total-bar-amount">
            {listTotal.pricedCount > 0
              ? formatPrice(listTotal.total, listTotal.currency)
              : '—'}
          </span>
        </div>
      )}

      <div className="item-list">
        {filtered.length === 0 ? (
          <div className="empty-state item-list-empty">
            <p>{categoryFilter === 'all' ? 'Nothing on your list.' : 'Nothing in this category.'}</p>
            <button type="button" className="text-btn" onClick={() => setAddOpen(true)}>
              Add something
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onTap={() => setViewingItem(item)}
              onMarkBought={() => handleMarkBought(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
