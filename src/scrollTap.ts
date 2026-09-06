/** Suppress accidental taps after the finger moved during a scroll gesture. */
const MOVE_THRESHOLD_PX = 8
const SUPPRESS_MS = 450

type Gesture = { x: number; y: number; moved: boolean }

let activeGesture: Gesture | null = null
let suppressClickUntil = 0

function markScrollGesture() {
  activeGesture = activeGesture ? { ...activeGesture, moved: true } : null
  suppressClickUntil = performance.now() + SUPPRESS_MS
}

function distanceFromStart(x: number, y: number): number {
  if (!activeGesture) return 0
  return Math.hypot(x - activeGesture.x, y - activeGesture.y)
}

export function installScrollTapGuard(root: HTMLElement): () => void {
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    activeGesture = { x: t.clientX, y: t.clientY, moved: false }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!activeGesture || e.touches.length !== 1) return
    if (distanceFromStart(e.touches[0].clientX, e.touches[0].clientY) > MOVE_THRESHOLD_PX) {
      markScrollGesture()
    }
  }

  const onTouchEnd = () => {
    activeGesture = null
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    activeGesture = { x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !activeGesture) return
    if (distanceFromStart(e.clientX, e.clientY) > MOVE_THRESHOLD_PX) {
      markScrollGesture()
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') activeGesture = null
  }

  const shouldSuppressClick = (target: Element) => {
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return false
    return performance.now() < suppressClickUntil
  }

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element
    if (!shouldSuppressClick(target)) return
    e.preventDefault()
    e.stopPropagation()
    activeGesture = null
  }

  const touchOpts = { capture: true, passive: true } as const
  root.addEventListener('touchstart', onTouchStart, touchOpts)
  root.addEventListener('touchmove', onTouchMove, touchOpts)
  root.addEventListener('touchend', onTouchEnd, touchOpts)
  root.addEventListener('touchcancel', onTouchEnd, touchOpts)
  root.addEventListener('pointerdown', onPointerDown, touchOpts)
  root.addEventListener('pointermove', onPointerMove, touchOpts)
  root.addEventListener('pointerup', onPointerUp, touchOpts)
  root.addEventListener('pointercancel', onPointerUp, touchOpts)
  root.addEventListener('click', onClick, { capture: true })

  return () => {
    root.removeEventListener('touchstart', onTouchStart, touchOpts)
    root.removeEventListener('touchmove', onTouchMove, touchOpts)
    root.removeEventListener('touchend', onTouchEnd, touchOpts)
    root.removeEventListener('touchcancel', onTouchEnd, touchOpts)
    root.removeEventListener('pointerdown', onPointerDown, touchOpts)
    root.removeEventListener('pointermove', onPointerMove, touchOpts)
    root.removeEventListener('pointerup', onPointerUp, touchOpts)
    root.removeEventListener('pointercancel', onPointerUp, touchOpts)
    root.removeEventListener('click', onClick, { capture: true })
  }
}
