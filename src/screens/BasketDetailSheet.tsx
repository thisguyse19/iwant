import { useApp, useBasketItems, useListTotal } from '../store'
import { ItemRow } from '../components/ItemRow'
import { Sheet } from '../components/Sheet'
import { formatPrice } from '../utils'
import { vibrate } from '../utils'
import '../components/ItemRow.css'

export function BasketDetailSheet() {
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
    <Sheet
      open={!!viewingBasket}
      onClose={close}
      title={viewingBasket.name}
      headerAction={
        <button type="button" className="sheet-header-btn" onClick={() => setAddOpen(true, viewingBasket.id)}>
          Add
        </button>
      }
    >
      <div className="basket-detail-total">
        <span className="basket-detail-total-label">Basket total</span>
        <span className="basket-detail-total-amount">
          {total.pricedCount > 0 ? formatPrice(total.total, total.currency) : '—'}
        </span>
      </div>

      {activeItems.length === 0 ? (
        <p className="empty-state" style={{ padding: '24px 0' }}>No items in this basket.</p>
      ) : (
        <div className="item-list">
          {activeItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onTap={() => setViewingItem(item)}
              onMarkReady={
                item.status === 'queued' ? () => updateItem(item.id, { status: 'ready' }) : undefined
              }
              onMarkBought={
                item.status === 'ready' ? () => updateItem(item.id, { status: 'bought' }) : undefined
              }
            />
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3 className="section-label">Add existing items</h3>
          <div className="basket-add-existing">
            {unassigned.slice(0, 5).map((item) => (
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
        <button type="button" className="primary-btn" style={{ marginTop: 20 }} onClick={handleMarkAllBought}>
          Mark basket bought
        </button>
      )}

      <button type="button" className="secondary-btn destructive-btn" onClick={handleDelete}>
        Delete basket
      </button>
    </Sheet>
  )
}
