import { useCallback, useRef, useState } from 'react'
import { getCategory, PRIORITY_PILL, type WishlistItem } from '../types'
import { formatPriceOptional } from '../utils'
import './CategoryPicker.css'

interface ItemRowProps {
  item: WishlistItem
  onTap: () => void
  onMarkBought?: () => void
  onRemove?: () => void
}

const ACTION_WIDTH = 68
const SNAP_THRESHOLD = 36

export function ItemRow({ item, onTap, onMarkBought, onRemove }: ItemRowProps) {
  const category = getCategory(item.category)
  const priorityPill = item.priority === 'high' ? PRIORITY_PILL.high : null
  const isActive = item.status === 'queued' || item.status === 'ready'
  const hasSwipe = isActive && (onMarkBought || onRemove)

  const [offset, setOffset] = useState(0)
  const offsetRef = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startOffset: 0, dragging: false })
  const rafRef = useRef<number | null>(null)

  const actionCount = (onMarkBought ? 1 : 0) + (onRemove ? 1 : 0)
  const maxOffset = actionCount * ACTION_WIDTH

  const applyOffset = useCallback((value: number, animate: boolean) => {
    const clamped = Math.max(0, Math.min(maxOffset, value))
    offsetRef.current = clamped
    const el = contentRef.current
    if (el) el.style.transition = animate ? 'transform 0.22s var(--spring)' : 'none'
    setOffset(clamped)
  }, [maxOffset])

  const closeSwipe = useCallback(() => applyOffset(0, true), [applyOffset])

  const onDragStart = (clientX: number) => {
    if (!hasSwipe) return
    dragRef.current = { startX: clientX, startOffset: offsetRef.current, dragging: true }
  }

  const onDragMove = (clientX: number) => {
    if (!dragRef.current.dragging || !hasSwipe) return
    const delta = dragRef.current.startX - clientX
    const next = dragRef.current.startOffset + delta
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => applyOffset(next, false))
  }

  const onDragEnd = () => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    applyOffset(offsetRef.current > SNAP_THRESHOLD ? maxOffset : 0, true)
  }

  const handleTap = () => {
    if (offsetRef.current > 0) {
      closeSwipe()
      return
    }
    onTap()
  }

  return (
    <div className={`item-row-swipe ${offset > 0 ? 'open' : ''}`}>
      {hasSwipe && (
        <div className="item-row-actions" style={{ width: maxOffset }}>
          {onMarkBought && (
            <button
              type="button"
              className="swipe-action swipe-action-bought"
              onClick={(e) => {
                e.stopPropagation()
                closeSwipe()
                onMarkBought()
              }}
            >
              Got it
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className="swipe-action swipe-action-remove"
              onClick={(e) => {
                e.stopPropagation()
                closeSwipe()
                onRemove()
              }}
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div
        ref={contentRef}
        className="item-row"
        style={{ transform: offset > 0 ? `translateX(-${offset}px)` : undefined }}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (!dragRef.current.dragging) return
          onDragMove(e.touches[0].clientX)
        }}
        onTouchEnd={onDragEnd}
        onTouchCancel={onDragEnd}
      >
        <button type="button" className="item-row-main" onClick={handleTap}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="item-thumb" />
          ) : (
            <span className="item-thumb item-thumb-placeholder" aria-hidden="true" />
          )}
          <div className="item-content">
            <div className="item-title">{item.title}</div>
            {(category || priorityPill) && (
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
            )}
          </div>
          <div className={`item-price ${item.price == null ? 'muted' : ''}`}>
            {formatPriceOptional(item.price, item.currency)}
          </div>
        </button>
      </div>
    </div>
  )
}
