import { useCallback, useEffect, useRef, type ReactNode } from 'react'

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
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false })
  const rafRef = useRef<number | null>(null)

  const applyOffset = useCallback((y: number, animate: boolean) => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) return
    sheet.style.transition = animate ? 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
    sheet.style.transform = `translateX(-50%) translateY(${y}px)`
    if (backdrop) {
      backdrop.style.opacity = String(Math.max(0, 0.4 - y / 600))
    }
  }, [])

  useEffect(() => {
    if (!open) return
    dragRef.current = { startY: 0, currentY: 0, dragging: false }
    requestAnimationFrame(() => applyOffset(0, false))
    if (!autoFocus) return
    const firstInput = sheetRef.current?.querySelector<HTMLElement>('input, textarea')
    requestAnimationFrame(() => firstInput?.focus())
  }, [open, autoFocus, applyOffset])

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
      dragRef.current.dragging = false
      if (delta > 120) {
        applyOffset(window.innerHeight, true)
        setTimeout(onClose, 220)
      } else {
        applyOffset(0, true)
      }
    },
    [onClose, applyOffset],
  )

  const onDragStart = (clientY: number) => {
    dragRef.current = { startY: clientY, currentY: 0, dragging: true }
  }

  const onDragMove = (clientY: number) => {
    if (!dragRef.current.dragging) return
    const delta = Math.max(0, clientY - dragRef.current.startY)
    dragRef.current.currentY = delta
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => applyOffset(delta, false))
  }

  const onDragEnd = () => {
    if (!dragRef.current.dragging) return
    finishDrag(dragRef.current.currentY)
  }

  if (!open) return null

  return (
    <>
      <div
        ref={backdropRef}
        className="sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div
          className="sheet-drag-zone"
          onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => {
            e.preventDefault()
            onDragMove(e.touches[0].clientY)
          }}
          onTouchEnd={onDragEnd}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') return
            e.currentTarget.setPointerCapture(e.pointerId)
            onDragStart(e.clientY)
          }}
          onPointerMove={(e) => {
            if (!dragRef.current.dragging || e.pointerType === 'touch') return
            onDragMove(e.clientY)
          }}
          onPointerUp={onDragEnd}
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
