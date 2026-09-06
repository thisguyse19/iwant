import { useEffect, useState } from 'react'
import { useApp, useBasketItems, useListTotal } from '../store'
import { ItemRow } from '../components/ItemRow'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'
import '../screens/WishlistScreen.css'
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
  } = useApp()
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setClosing(false)
  }, [viewingBasket?.id])

  if (!viewingBasket) return null

  const basketItems = useBasketItems(viewingBasket.id)
  const activeItems = basketItems.filter((i) => i.status === 'queued' || i.status === 'ready')
  const total = useListTotal(activeItems)
  const unassigned = items.filter(
    (i) => !i.basketId && (i.status === 'queued' || i.status === 'ready'),
  )

  const close = () => {
    setClosing(true)
    window.setTimeout(() => setViewingBasket(null), 240)
  }

  const addExisting = async (itemId: string) => {
    vibrate()
    await updateItem(itemId, { basketId: viewingBasket.id })
  }

  const handleMarkAllBought = async () => {
    vibrate()
    await markBasketBought(viewingBasket.id)
    close()
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${viewingBasket.name}"? Items will be kept.`)) return
    vibrate(20)
    await removeBasket(viewingBasket.id)
  }

  const subtitle =
    activeItems.length === 0
      ? 'Empty basket'
      : total.pricedCount > 0
        ? `${activeItems.length} item${activeItems.length !== 1 ? 's' : ''} · ${formatPrice(total.total, total.currency)}`
        : `${activeItems.length} item${activeItems.length !== 1 ? 's' : ''}`

  return (
    <div className={`basket-overlay ${closing ? 'basket-overlay-closing' : ''}`}>
      <div className="screen basket-screen">
        <button type="button" className="screen-back" onClick={close}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
            <path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Baskets
        </button>

        <header className="screen-header screen-header-row">
          <div>
            <h1 className="screen-title">{viewingBasket.name}</h1>
            <p className="header-subtitle">{subtitle}</p>
          </div>
          <button type="button" className="text-btn" onClick={() => setAddOpen(true, viewingBasket.id)}>
            Add
          </button>
        </header>

        {activeItems.length === 0 ? (
          <div className="empty-state">
            <p>No items in this basket yet.</p>
            <button type="button" className="text-btn" onClick={() => setAddOpen(true, viewingBasket.id)}>
              Add something
            </button>
          </div>
        ) : (
          <div className="item-list">
            {activeItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onTap={() => setViewingItem(item)}
                onMarkBought={() => updateItem(item.id, { status: 'bought' })}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}

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
      </div>
    </div>
  )
}
