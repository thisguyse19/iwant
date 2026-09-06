import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import type { WishlistItem } from '../types'
import { daysSince, formatPriceOptional, vibrate } from '../utils'

export function ItemOverviewSheet() {
  const { viewingItem, setViewingItem, openEdit, updateItem, removeItem } = useApp()

  const close = () => setViewingItem(null)

  const setStatus = async (status: WishlistItem['status']) => {
    if (!viewingItem) return
    vibrate()
    await updateItem(viewingItem.id, { status })
    if (status === 'bought' || status === 'dropped') close()
  }

  const handleDelete = async () => {
    if (!viewingItem) return
    vibrate(20)
    await removeItem(viewingItem.id)
  }

  if (!viewingItem) return null

  const days = daysSince(viewingItem.createdAt)

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

      <div className="detail-meta-block">
        {viewingItem.tag && (
          <div className="detail-meta-row">
            <span>Tag</span>
            <span>{viewingItem.tag}</span>
          </div>
        )}
        <div className="detail-meta-row">
          <span>Status</span>
          <span style={{ textTransform: 'capitalize' }}>{viewingItem.status}</span>
        </div>
        <div className="detail-meta-row">
          <span>Priority</span>
          <span style={{ textTransform: 'capitalize' }}>{viewingItem.priority}</span>
        </div>
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
        <div className="detail-actions">
          {viewingItem.status === 'queued' && (
            <button type="button" className="secondary-btn" onClick={() => setStatus('ready')}>
              Ready
            </button>
          )}
          <button type="button" className="primary-btn" onClick={() => setStatus('bought')}>
            Bought
          </button>
        </div>
      )}

      {viewingItem.status !== 'dropped' && viewingItem.status !== 'bought' && (
        <button type="button" className="secondary-btn" onClick={() => setStatus('dropped')}>
          Drop
        </button>
      )}

      <button type="button" className="secondary-btn destructive-btn" onClick={handleDelete}>
        Delete
      </button>
    </Sheet>
  )
}
