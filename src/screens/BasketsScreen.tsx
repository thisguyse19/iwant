import { useState } from 'react'
import { useApp, useBasketItems, useListTotal } from '../store'
import { formatPrice } from '../utils'
import './BasketsScreen.css'

export function BasketsScreen() {
  const { baskets, items, addBasket, setViewingBasket } = useApp()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const unassigned = items.filter(
    (i) => !i.basketId && (i.status === 'queued' || i.status === 'ready'),
  )
  const unassignedTotal = useListTotal(unassigned)

  const handleCreate = async () => {
    if (!name.trim()) return
    const basket = await addBasket(name.trim())
    setName('')
    setCreating(false)
    setViewingBasket(basket)
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Baskets</h1>
        <p className="header-subtitle">Group items to buy together</p>
      </header>

      {baskets.length === 0 && !creating ? (
        <div className="empty-state">
          <p>No baskets yet.</p>
          <button type="button" className="text-btn" onClick={() => setCreating(true)}>
            Create a basket
          </button>
        </div>
      ) : (
        <div className="basket-list">
          {baskets.map((basket) => (
            <BasketCard key={basket.id} basket={basket} onTap={() => setViewingBasket(basket)} />
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <section className="basket-unassigned">
          <h2 className="section-label">Not in a basket</h2>
          <p className="basket-unassigned-meta">
            {unassigned.length} item{unassigned.length !== 1 ? 's' : ''}
            {unassignedTotal.pricedCount > 0 &&
              ` · ${formatPrice(unassignedTotal.total, unassignedTotal.currency)}`}
          </p>
        </section>
      )}

      {creating ? (
        <div className="basket-create-inline">
          <input
            type="text"
            placeholder="Basket name, e.g. Gym kit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="basket-create-actions">
            <button type="button" className="text-btn" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="primary-btn" disabled={!name.trim()} onClick={handleCreate}>
              Create
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="secondary-btn basket-new-btn" onClick={() => setCreating(true)}>
          New basket
        </button>
      )}
    </div>
  )
}

function BasketCard({
  basket,
  onTap,
}: {
  basket: { id: string; name: string }
  onTap: () => void
}) {
  const basketItems = useBasketItems(basket.id)
  const total = useListTotal(basketItems)
  const activeCount = basketItems.filter(
    (i) => i.status === 'queued' || i.status === 'ready',
  ).length

  return (
    <button type="button" className="basket-card" onClick={onTap}>
      <div className="basket-card-info">
        <span className="basket-card-name">{basket.name}</span>
        <span className="basket-card-meta">
          {activeCount} item{activeCount !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="basket-card-total">
        {total.pricedCount > 0 ? formatPrice(total.total, total.currency) : '—'}
      </span>
    </button>
  )
}
