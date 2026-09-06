/** Suppress accidental taps after the finger moved during a scroll gesture. */
const MOVE_THRESHOLD_PX = 12

let touchStart: { x: number; y: number } | null = null
let touchMoved = false

export function installScrollTapGuard(root: HTMLElement): () => void {
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    touchStart = { x: t.clientX, y: t.clientY }
    touchMoved = false
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!touchStart || e.touches.length !== 1) return
    const t = e.touches[0]
    const dist = Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y)
    if (dist > MOVE_THRESHOLD_PX) {
      touchMoved = true
    }
  }

  const onTouchEnd = () => {
    touchStart = null
  }

  const onClick = (e: MouseEvent) => {
    if (!touchMoved) return
    const target = e.target as Element
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    e.preventDefault()
    e.stopPropagation()
    touchMoved = false
  }

  const opts = { capture: true, passive: true } as const
  root.addEventListener('touchstart', onTouchStart, opts)
  root.addEventListener('touchmove', onTouchMove, opts)
  root.addEventListener('touchend', onTouchEnd, opts)
  root.addEventListener('touchcancel', onTouchEnd, opts)
  root.addEventListener('click', onClick, { capture: true })

  return () => {
    root.removeEventListener('touchstart', onTouchStart, opts)
    root.removeEventListener('touchmove', onTouchMove, opts)
    root.removeEventListener('touchend', onTouchEnd, opts)
    root.removeEventListener('touchcancel', onTouchEnd, opts)
    root.removeEventListener('click', onClick, { capture: true })
  }
}
