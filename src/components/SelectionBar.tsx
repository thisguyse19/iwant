import { createPortal } from 'react-dom'
import { formatPrice } from '../utils'
import './SelectionBar.css'

interface SelectionBarProps {
  count: number
  total: number
  pricedCount: number
  unpriced: number
  currency: string
  onClear: () => void
  onSelectAll?: () => void
}

export function SelectionBar({
  count,
  total,
  pricedCount,
  unpriced,
  currency,
  onClear,
  onSelectAll,
}: SelectionBarProps) {
  if (count === 0) return null

  return createPortal(
    <div className="selection-bar-dock" role="status" aria-live="polite">
      <div className="selection-bar">
        <button type="button" className="selection-bar-clear" onClick={onClear}>
          Clear
        </button>
        <div className="selection-bar-info">
          <span className="selection-bar-count">
            {count} selected
            {unpriced > 0 && ` · ${unpriced} unpriced`}
          </span>
          <span className="selection-bar-total">
            {pricedCount > 0 ? formatPrice(total, currency) : '—'}
          </span>
        </div>
        {onSelectAll && (
          <button type="button" className="selection-bar-all" onClick={onSelectAll}>
            All
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
