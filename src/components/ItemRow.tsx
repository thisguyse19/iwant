import type { WishlistItem } from '../types'
import { formatPriceOptional } from '../utils'

interface ItemRowProps {
  item: WishlistItem
  onTap: () => void
  onMarkReady?: () => void
  onMarkBought?: () => void
}

export function ItemRow({ item, onTap, onMarkReady, onMarkBought }: ItemRowProps) {
  const metaParts: string[] = []
  if (item.tag) metaParts.push(item.tag)
  if (item.status === 'bought') metaParts.push('Bought')
  if (item.status === 'dropped') metaParts.push('Dropped')

  return (
    <div className={`item-row ${item.status === 'ready' ? 'ready' : ''}`}>
      <button type="button" className="item-row-main" onClick={onTap}>
        <span className={`priority-dot ${item.priority}`} aria-hidden="true" />
        <div className="item-content">
          <div className="item-title">{item.title}</div>
          {metaParts.length > 0 && <div className="item-meta">{metaParts.join(' · ')}</div>}
        </div>
        <div className={`item-price ${item.price == null ? 'muted' : ''}`}>
          {formatPriceOptional(item.price, item.currency)}
        </div>
      </button>
      {item.status === 'queued' && onMarkReady && (
        <button
          type="button"
          className="item-quick-action"
          onClick={(e) => {
            e.stopPropagation()
            onMarkReady()
          }}
          aria-label="Mark ready"
        >
          Ready
        </button>
      )}
      {item.status === 'ready' && onMarkBought && (
        <button
          type="button"
          className="item-quick-action bought"
          onClick={(e) => {
            e.stopPropagation()
            onMarkBought()
          }}
          aria-label="Mark bought"
        >
          Got it
        </button>
      )}
    </div>
  )
}
