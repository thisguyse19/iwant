import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { getCategory } from '../types'
import { daysSince, formatPriceOptional, vibrate } from '../utils'

export function ItemOverviewSheet() {
  const { viewingItem, setViewingItem, openEdit, updateItem, removeItem, baskets } = useApp()

  const close = () => setViewingItem(null)

  const handleBought = async () => {
    if (!viewingItem) return
    vibrate()
    await updateItem(viewingItem.id, { status: 'bought' })
    close()
  }

  const handleDelete = async () => {
    if (!viewingItem) return
    vibrate(20)
    await removeItem(viewingItem.id)
  }

  if (!viewingItem) return null

  const days = daysSince(viewingItem.createdAt)
  const basket = baskets.find((b) => b.id === viewingItem.basketId)
  const category = getCategory(viewingItem.category)

  return (
    <Sheet
      open={!!viewingItem}
      onClose={close}
      title={viewingItem.title}
      headerAction={
        <button type="button" className="sheet-header-btn" onClick={() => openEdit(viewingItem)}>
          Edit
        </button>
      }
    >
      {viewingItem.imageUrl && (
        <div className="overview-hero-image">
          <img src={viewingItem.imageUrl} alt="" />
        </div>
      )}

      <div className="overview-price">
        {formatPriceOptional(viewingItem.price, viewingItem.currency)}
      </div>

      {(category || viewingItem.priority === 'high') && (
        <div className="item-pills" style={{ marginBottom: 16 }}>
          {category && (
            <span
              className="item-pill"
              style={{ color: category.color, background: category.bg }}
            >
              {category.label}
            </span>
          )}
          {viewingItem.priority === 'high' && (
            <span
              className="item-pill"
              style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.12)' }}
            >
              High
            </span>
          )}
        </div>
      )}

      <div className="detail-meta-block">
        {basket && (
          <div className="detail-meta-row">
            <span>Basket</span>
            <span>{basket.name}</span>
          </div>
        )}
        <div className="detail-meta-row">
          <span>On list</span>
          <span>{days === 0 ? 'Today' : `${days} day${days > 1 ? 's' : ''}`}</span>
        </div>
      </div>

      {viewingItem.notes && (
        <div className="overview-section">
          <h3 className="overview-section-label">Notes</h3>
          <p className="detail-notes">{viewingItem.notes}</p>
        </div>
      )}

      {viewingItem.link && (
        <a
          href={viewingItem.link}
          target="_blank"
          rel="noopener noreferrer"
          className="overview-link"
        >
          Open link
        </a>
      )}

      {(viewingItem.status === 'queued' || viewingItem.status === 'ready') && (
        <button type="button" className="primary-btn" onClick={handleBought}>
          Mark bought
        </button>
      )}

      <button type="button" className="secondary-btn destructive-btn" onClick={handleDelete}>
        Delete
      </button>
    </Sheet>
  )
}
