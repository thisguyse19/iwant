import { useFilteredItems, useApp, useListTotal } from '../store'
import { ItemRow } from '../components/ItemRow'
import type { ListFilter } from '../types'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'
import './WishlistScreen.css'

const filters: { id: ListFilter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'ready', label: 'Ready' },
  { id: 'done', label: 'Done' },
]

export function WishlistScreen() {
  const { filter, setFilter, setAddOpen, setViewingItem, updateItem, items } = useApp()
  const filtered = useFilteredItems()
  const listTotal = useListTotal(filtered)

  const activeCount = items.filter((i) => i.status === 'queued' || i.status === 'ready').length
  const readyCount = items.filter((i) => i.status === 'ready').length

  const handleMarkReady = async (id: string) => {
    vibrate()
    await updateItem(id, { status: 'ready' })
  }

  const handleMarkBought = async (id: string) => {
    vibrate()
    await updateItem(id, { status: 'bought' })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Want</h1>
        {activeCount > 0 && (
          <p className="header-subtitle">
            {readyCount > 0 ? `${readyCount} ready · ${activeCount} total` : `${activeCount} queued`}
          </p>
        )}
      </header>

      <div className="segmented" role="tablist" aria-label="Filter items">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`segmented-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
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
          <div className="empty-state">
            <p>
              {filter === 'active' && 'Nothing queued.'}
              {filter === 'ready' && 'Nothing marked ready.'}
              {filter === 'done' && 'No completed items yet.'}
            </p>
            {filter === 'active' && (
              <button type="button" className="text-btn" onClick={() => setAddOpen(true)}>
                Add something
              </button>
            )}
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onTap={() => setViewingItem(item)}
              onMarkReady={
                item.status === 'queued' ? () => handleMarkReady(item.id) : undefined
              }
              onMarkBought={
                item.status === 'ready' ? () => handleMarkBought(item.id) : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
