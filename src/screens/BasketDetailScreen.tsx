import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useApp, useBasketItems, useListTotal, useSelectedTotal } from '../store'
import { ItemRow } from '../components/ItemRow'
import { SelectionBar } from '../components/SelectionBar'
import { ScreenChrome } from '../components/ScreenChrome'
import { CATEGORIES, type CategoryFilter } from '../types'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'
import './WishlistScreen.css'
import './BasketDetailScreen.css'

export function BasketDetailScreen() {
  const {
    viewingBasket,
    setViewingBasket,
    setViewingItem,
    setAddOpen,
    updateItem,
    markBasketBought,
    removeBasket,
    removeItem,
    items,
    selectionMode,
    selectedIds,
    setSelectionMode,
    toggleSelected,
    selectAll,
    clearSelection,
  } = useApp()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  useEffect(() => {
    setCategoryFilter('all')
    clearSelection()
  }, [viewingBasket?.id, clearSelection])

  const basketItems = useBasketItems(viewingBasket?.id ?? '')
  const activeItems = useMemo(
    () => basketItems.filter((i) => i.status === 'queued' || i.status === 'ready'),
    [basketItems],
  )
  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return activeItems
    return activeItems.filter((item) => item.category === categoryFilter)
  }, [activeItems, categoryFilter])
  const listTotal = useListTotal(filtered)
  const selectionTotal = useSelectedTotal(selectedIds)
  const unassigned = items.filter(
    (i) => !i.basketId && (i.status === 'queued' || i.status === 'ready'),
  )

  if (!viewingBasket) return null

  const handleMarkBought = async (id: string) => {
    vibrate()
    await updateItem(id, { status: 'bought' })
  }

  const handleMarkAllBought = async () => {
    vibrate()
    await markBasketBought(viewingBasket.id)
    setViewingBasket(null)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${viewingBasket.name}"? Items will be kept.`)) return
    vibrate(20)
    await removeBasket(viewingBasket.id)
  }

  const addExisting = async (itemId: string) => {
    vibrate()
    await updateItem(itemId, { basketId: viewingBasket.id })
  }

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection()
    } else {
      setSelectionMode(true)
    }
  }

  const categoryToolbar = (
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
  )

  const selectAction = filtered.length > 0 ? (
    <button
      type="button"
      className={`select-toggle ${selectionMode ? 'active' : ''}`}
      onClick={toggleSelectionMode}
    >
      {selectionMode ? 'Done' : 'Select'}
    </button>
  ) : null

  return (
    <ScreenChrome
      className="basket-detail-screen"
      title={viewingBasket.name}
      subtitle={activeItems.length > 0 ? `${activeItems.length} in this basket` : undefined}
      back={{ label: 'Baskets', onClick: () => setViewingBasket(null) }}
      trailing={selectAction}
      toolbar={categoryToolbar}
    >
      {filtered.length > 0 && !selectionMode && (
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
            <p>{categoryFilter === 'all' ? 'No items in this basket yet.' : 'Nothing in this category.'}</p>
            <button type="button" className="text-btn" onClick={() => setAddOpen(true, viewingBasket.id)}>
              Add something
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selectable={selectionMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelected(item.id)}
              onTap={() => !selectionMode && setViewingItem(item)}
              onMarkBought={() => handleMarkBought(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </div>

      {unassigned.length > 0 && (
        <section className="basket-add-section">
          <h2 className="section-label">Add from your list</h2>
          <div className="basket-add-existing">
            {unassigned.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className="basket-add-existing-btn"
                onClick={() => addExisting(item.id)}
              >
                + {item.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeItems.length > 0 && (
        <button type="button" className="primary-btn" onClick={handleMarkAllBought}>
          Mark basket bought
        </button>
      )}

      <button type="button" className="secondary-btn destructive-btn" onClick={handleDelete}>
        Delete basket
      </button>

      {selectionMode && (
        <SelectionBar
          count={selectionTotal.count}
          total={selectionTotal.total}
          pricedCount={selectionTotal.pricedCount}
          unpriced={selectionTotal.unpriced}
          currency={selectionTotal.currency}
          onClear={clearSelection}
          onSelectAll={() => selectAll(filtered.map((i) => i.id))}
        />
      )}
    </ScreenChrome>
  )
}
