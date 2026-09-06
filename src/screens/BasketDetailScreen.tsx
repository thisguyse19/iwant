import { useApp, useBasketItems, useListTotal } from '../store'
import { ItemRow } from '../components/ItemRow'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'
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
    items,
  } = useApp()

  if (!viewingBasket) return null

  const basketItems = useBasketItems(viewingBasket.id)
  const activeItems = basketItems.filter((i) => i.status === 'queued' || i.status === 'ready')
  const total = useListTotal(activeItems)
  const unassigned = items.filter(
    (i) => !i.basketId && (i.status === 'queued' || i.status === 'ready'),
  )

  const close = () => setViewingBasket(null)

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

  return (
    <div className="fullscreen">
      <header className="fullscreen-header">
        <button type="button" className="back-btn" onClick={close} aria-label="Back">
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
            <path d="M10 2L2 10l8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Baskets
        </button>
        <button type="button" className="sheet-header-btn" onClick={() => setAddOpen(true, viewingBasket.id)}>
          Add
        </button>
      </header>

      <div className="fullscreen-body">
        <h1 className="screen-title">{viewingBasket.name}</h1>

        <div className="basket-detail-total">
          <span className="basket-detail-total-label">Basket total</span>
          <span className="basket-detail-total-amount">
            {total.pricedCount > 0 ? formatPrice(total.total, total.currency) : '—'}
          </span>
        </div>

        {activeItems.length === 0 ? (
          <p className="empty-state">No items in this basket yet.</p>
        ) : (
          <div className="item-list">
            {activeItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onTap={() => setViewingItem(item)}
                onMarkBought={() => updateItem(item.id, { status: 'bought' })}
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
