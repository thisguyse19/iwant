import { getCategory, PRIORITY_PILL, type WishlistItem } from '../types'
import { formatPriceOptional } from '../utils'
import './CategoryPicker.css'

interface ItemRowProps {
  item: WishlistItem
  onTap: () => void
  onMarkBought?: () => void
}

export function ItemRow({ item, onTap, onMarkBought }: ItemRowProps) {
  const category = getCategory(item.category)
  const priorityPill = item.priority === 'high' ? PRIORITY_PILL.high : null
  const isActive = item.status === 'queued' || item.status === 'ready'

  return (
    <div className="item-row">
      <button type="button" className="item-row-main" onClick={onTap}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="item-thumb" />
        ) : (
          <span className="item-thumb item-thumb-placeholder" aria-hidden="true" />
        )}
        <div className="item-content">
          <div className="item-title">{item.title}</div>
          <div className="item-pills">
            {category && (
              <span
                className="item-pill"
                style={{ color: category.color, background: category.bg }}
              >
                {category.label}
              </span>
            )}
            {priorityPill && (
              <span
                className="item-pill"
                style={{ color: priorityPill.color, background: priorityPill.bg }}
              >
                {priorityPill.label}
              </span>
            )}
          </div>
        </div>
        <div className={`item-price ${item.price == null ? 'muted' : ''}`}>
          {formatPriceOptional(item.price, item.currency)}
        </div>
      </button>
      {isActive && onMarkBought && (
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
