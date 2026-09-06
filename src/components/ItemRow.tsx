import { useCallback, useRef, useState, type TransitionEvent } from 'react'
import { getCategory, PRIORITY_PILL, type WishlistItem } from '../types'
import { formatPriceOptional, formatBoughtDate } from '../utils'
import './CategoryPicker.css'

interface ItemRowProps {
  item: WishlistItem
  onTap: () => void
  onMarkBought?: () => void
  onRemove?: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  showBoughtDate?: boolean
}

const ACTION_WIDTH = 68
const AXIS_LOCK_PX = 10
const OPEN_RATIO = 0.45

export function ItemRow({
  item,
  onTap,
  onMarkBought,
  onRemove,
  selectable = false,
  selected = false,
  onToggleSelect,
  showBoughtDate = false,
}: ItemRowProps) {
  const category = getCategory(item.category)
  const priorityPill = item.priority === 'high' ? PRIORITY_PILL.high : null
  const isActive = item.status === 'queued' || item.status === 'ready'
  const hasSwipe = isActive && (onMarkBought || onRemove) && !selectable

  const [open, setOpen] = useState(false)
  const offsetRef = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startOffset: 0,
    axis: null as 'x' | 'y' | null,
    tracking: false,
  })

  const actionCount = (onMarkBought ? 1 : 0) + (onRemove ? 1 : 0)
  const maxOffset = actionCount * ACTION_WIDTH

  const paintOffset = useCallback((value: number, animate: boolean) => {
    const clamped = Math.max(0, Math.min(maxOffset, value))
    offsetRef.current = clamped
    const el = contentRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.22s var(--spring)' : 'none'
    el.style.transform = clamped > 0 ? `translateX(-${clamped}px)` : ''
    setOpen(clamped >= maxOffset * 0.5)
  }, [maxOffset])

  const snap = useCallback(() => {
    const target = offsetRef.current >= maxOffset * OPEN_RATIO ? maxOffset : 0
    paintOffset(target, true)
  }, [maxOffset, paintOffset])

  const closeSwipe = useCallback(() => {
    paintOffset(0, true)
  }, [paintOffset])

  const resetDrag = useCallback(() => {
    dragRef.current.tracking = false
    dragRef.current.axis = null
  }, [])

  const endGesture = useCallback(() => {
    if (dragRef.current.axis === 'x') {
      snap()
    }
    resetDrag()
  }, [snap, resetDrag])

  const bindDocumentEnd = useCallback(() => {
    const onEnd = () => endGesture()
    document.addEventListener('touchend', onEnd, { once: true, passive: true })
    document.addEventListener('touchcancel', onEnd, { once: true, passive: true })
    document.addEventListener('pointerup', onEnd, { once: true })
    document.addEventListener('pointercancel', onEnd, { once: true })
  }, [endGesture])

  const onGestureStart = (clientX: number, clientY: number) => {
    if (!hasSwipe) return
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startOffset: offsetRef.current,
      axis: null,
      tracking: true,
    }
  }

  const onGestureMove = (clientX: number, clientY: number, preventDefault?: () => void) => {
    const drag = dragRef.current
    if (!hasSwipe || !drag.tracking) return

    const dx = drag.startX - clientX
    const dy = drag.startY - clientY

    if (drag.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (drag.axis === 'y') {
        resetDrag()
        return
      }
      bindDocumentEnd()
    }

    if (drag.axis !== 'x') return

    preventDefault?.()
    paintOffset(drag.startOffset + dx, false)
  }

  const handleTap = () => {
    if (selectable) {
      onToggleSelect?.()
      return
    }
    if (offsetRef.current > 0) {
      closeSwipe()
      return
    }
    onTap()
  }

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return
    const target = offsetRef.current >= maxOffset * OPEN_RATIO ? maxOffset : 0
    if (Math.abs(offsetRef.current - target) > 0.5) {
      paintOffset(target, false)
    }
  }

  return (
    <div className={`item-row-swipe ${open ? 'open' : ''} ${selected ? 'selected' : ''}`}>
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
        onTransitionEnd={onTransitionEnd}
        onTouchStart={(e) => onGestureStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => {
          onGestureMove(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault())
        }}
        onTouchEnd={endGesture}
        onTouchCancel={endGesture}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') return
          onGestureStart(e.clientX, e.clientY)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return
          onGestureMove(e.clientX, e.clientY)
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <button type="button" className="item-row-main" onClick={handleTap}>
          {selectable && (
            <span
              className={`item-select-check ${selected ? 'checked' : ''}`}
              aria-hidden="true"
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          )}
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="item-thumb" />
          ) : (
            <span className="item-thumb item-thumb-placeholder" aria-hidden="true" />
          )}
          <div className="item-content">
            <div className="item-title">{item.title}</div>
            {showBoughtDate && item.status === 'bought' && item.boughtAt != null && (
              <div className="item-bought-date">{formatBoughtDate(item.boughtAt)}</div>
            )}
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
