import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  headerAction?: ReactNode
  autoFocus?: boolean
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  headerAction,
  autoFocus = false,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false })
  const [offsetY, setOffsetY] = useState(0)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!open) {
      setOffsetY(0)
      setClosing(false)
      return
    }
    if (!autoFocus) return
    const firstInput = sheetRef.current?.querySelector<HTMLElement>('input, textarea')
    requestAnimationFrame(() => firstInput?.focus())
  }, [open, autoFocus])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const finishDrag = useCallback(
    (delta: number) => {
      if (delta > 100) {
        setClosing(true)
        setTimeout(onClose, 200)
      } else {
        setOffsetY(0)
      }
      dragRef.current.dragging = false
    },
    [onClose],
  )

  const onTouchStart = (e: React.TouchEvent) => {
    dragRef.current = { startY: e.touches[0].clientY, currentY: 0, dragging: true }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.dragging) return
    const delta = Math.max(0, e.touches[0].clientY - dragRef.current.startY)
    dragRef.current.currentY = delta
    setOffsetY(delta)
  }

  const onTouchEnd = () => {
    if (!dragRef.current.dragging) return
    finishDrag(dragRef.current.currentY)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, currentY: 0, dragging: true }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const delta = Math.max(0, e.clientY - dragRef.current.startY)
    dragRef.current.currentY = delta
    setOffsetY(delta)
  }

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return
    finishDrag(dragRef.current.currentY)
  }

  if (!open) return null

  const backdropOpacity = Math.max(0, 0.4 - offsetY / 600)
  const transform = `translateX(-50%) translateY(${offsetY}px)`

  return (
    <>
      <div
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
        style={{ opacity: backdropOpacity }}
      />
      <div
        className={`sheet ${closing ? 'sheet-closing' : ''}`}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        style={{ transform }}
      >
        <div
          className="sheet-drag-zone"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-header">
            <h2 className="sheet-title" id="sheet-title">{title}</h2>
            {headerAction}
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
