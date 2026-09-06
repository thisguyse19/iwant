import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  const bodyRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false, fromBody: false })
  const rafRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState(open)

  const applyOffset = useCallback((y: number, animate: boolean) => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) return
    sheet.style.transition = animate ? 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
    sheet.style.transform = `translateX(-50%) translateY(${y}px)`
    if (backdrop) {
      backdrop.style.transition = animate ? 'opacity 0.28s cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
      backdrop.style.opacity = String(Math.max(0, 0.4 - y / 600))
    }
  }, [])

  const dismiss = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      setMounted(true)
      dragRef.current = { startY: 0, currentY: 0, dragging: false, fromBody: false }
      requestAnimationFrame(() => {
        applyOffset(window.innerHeight, false)
        if (backdropRef.current) backdropRef.current.style.opacity = '0'
        requestAnimationFrame(() => applyOffset(0, true))
      })
      return
    }

    if (!mounted) return

    applyOffset(window.innerHeight, true)
    if (backdropRef.current) backdropRef.current.style.opacity = '0'
    const timer = window.setTimeout(() => setMounted(false), 280)
    return () => window.clearTimeout(timer)
  }, [open, mounted, applyOffset])

  useEffect(() => {
    if (!mounted || !autoFocus) return
    const firstInput = sheetRef.current?.querySelector<HTMLElement>('input, textarea')
    requestAnimationFrame(() => firstInput?.focus())
  }, [mounted, autoFocus])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, dismiss])

  const finishDrag = useCallback(
    (delta: number) => {
      dragRef.current.dragging = false
      if (delta > 120) {
        dismiss()
      } else {
        applyOffset(0, true)
      }
    },
    [dismiss, applyOffset],
  )

  const onDragStart = (clientY: number, fromBody = false) => {
    dragRef.current = { startY: clientY, currentY: 0, dragging: true, fromBody }
  }

  const onBodyTouchStart = (e: React.TouchEvent) => {
    const body = bodyRef.current
    if (!body || body.scrollTop > 0) return
    onDragStart(e.touches[0].clientY, true)
  }

  const onBodyTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.dragging || !dragRef.current.fromBody) return
    const delta = e.touches[0].clientY - dragRef.current.startY
    if (delta <= 0) {
      dragRef.current.dragging = false
      return
    }
    e.preventDefault()
    onDragMove(e.touches[0].clientY)
  }

  const onBodyTouchEnd = () => {
    if (dragRef.current.fromBody) onDragEnd()
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

  if (!mounted) return null

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className="sheet-backdrop"
        onClick={dismiss}
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
          className="sheet-drag-zone haptic-skip"
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
        <div
          className="sheet-body"
          ref={bodyRef}
          onTouchStart={onBodyTouchStart}
          onTouchMove={onBodyTouchMove}
          onTouchEnd={onBodyTouchEnd}
          onTouchCancel={onBodyTouchEnd}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
