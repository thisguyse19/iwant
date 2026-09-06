import type { CSSProperties } from 'react'
import { useEffect, useMemo } from 'react'
import {
  useFilteredItems,
  useApp,
  useListTotal,
  useActiveItems,
  useSelectedTotal,
} from '../store'
import { ItemRow } from '../components/ItemRow'
import { SelectionBar } from '../components/SelectionBar'
import { ScreenChrome } from '../components/ScreenChrome'
import { CATEGORIES, type CategoryFilter, type WishlistItem } from '../types'
import { wishlistEmptyCopy } from '../copy'
import { useExitAnimation } from '../exitAnimation'
import { formatPrice, vibrateTap } from '../utils'
import '../components/ItemRow.css'
import './WishlistScreen.css'

export function WishlistScreen() {
  const {
    categoryFilter,
    setCategoryFilter,
    setAddOpen,
    setViewingItem,
    requestMarkBought,
    removeItem,
    selectionMode,
    selectedIds,
    setSelectionMode,
    toggleSelected,
    selectAll,
    clearSelection,
  } = useApp()
  const { augmentItems, getExitKind, completeExit, stageExit } = useExitAnimation()
  const filtered = useFilteredItems()
  const activeItems = useActiveItems()
  const listTotal = useListTotal(filtered)
  const selectionTotal = useSelectedTotal(selectedIds)
  const displayItems = useMemo(() => augmentItems(filtered), [augmentItems, filtered])
  const emptyCopy = useMemo(() => wishlistEmptyCopy(categoryFilter), [categoryFilter])

  useEffect(() => {
    return () => clearSelection()
  }, [clearSelection])

  const handleMarkBought = (item: WishlistItem) => {
    vibrateTap()
    requestMarkBought(item)
  }

  const handleRemove = (item: WishlistItem) => {
    stageExit(item, 'removed', () => removeItem(item.id))
  }

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection()
    } else {
      setSelectionMode(true)
    }
  }

  const handleRowTap = (item: WishlistItem) => {
    if (selectionMode) return
    setViewingItem(item)
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
      title="Want"
      subtitle={activeItems.length > 0 ? `${activeItems.length} on your list` : undefined}
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
        {filtered.length === 0 && displayItems.length === 0 ? (
          <div className="empty-state item-list-empty">
            <p>{emptyCopy.primary}</p>
            {emptyCopy.secondary && (
              <p className="empty-state-secondary">{emptyCopy.secondary}</p>
            )}
            <button type="button" className="text-btn" onClick={() => setAddOpen(true)}>
              Add something
            </button>
          </div>
        ) : (
          displayItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selectable={selectionMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelected(item.id)}
              onTap={() => handleRowTap(item)}
              onMarkBought={() => handleMarkBought(item)}
              onRemove={() => handleRemove(item)}
              exiting={getExitKind(item.id)}
              onExitComplete={() => completeExit(item.id)}
            />
          ))
        )}
      </div>

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
