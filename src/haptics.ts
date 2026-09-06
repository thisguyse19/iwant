import './haptics.css'

type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const HOST_SELECTOR = [
  'button:not(:disabled):not(.haptic-switch-overlay)',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="menuitem"]',
  '[role="radio"]',
  '[role="tab"]',
].join(',')

const SKIP_SELECTOR = [
  '.haptic-skip',
  '.haptic-switch-overlay',
  'input:not(.haptic-switch-overlay)',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(',')

let hapticEnabled = true
let lastTriggerMs = 0
let iosFallbackSwitch: HTMLInputElement | null = null

function isIOS(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function telegramHaptics():
  | { impactOccurred: (s: string) => void; selectionChanged: () => void; notificationOccurred: (s: string) => void }
  | null {
  const tg = (window as Window & {
    Telegram?: { WebApp?: { HapticFeedback?: {
      impactOccurred: (style: string) => void
      selectionChanged: () => void
      notificationOccurred: (type: string) => void
    } } }
  }).Telegram?.WebApp?.HapticFeedback
  return tg ?? null
}

function shouldSkip(target: Element): boolean {
  return !!target.closest(SKIP_SELECTOR)
}

function ensureIOSFallbackSwitch(): HTMLInputElement {
  if (iosFallbackSwitch) return iosFallbackSwitch
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.className = 'haptic-ios-fallback'
  input.setAttribute('aria-hidden', 'true')
  input.tabIndex = -1
  document.body.appendChild(input)
  iosFallbackSwitch = input
  return input
}

function toggleIOSSwitch(input: HTMLInputElement) {
  input.checked = !input.checked
  window.requestAnimationFrame(() => {
    input.checked = false
  })
}

export function setHapticEnabled(enabled: boolean) {
  hapticEnabled = enabled
  document.querySelectorAll<HTMLElement>('.haptic-switch-overlay').forEach((overlay) => {
    overlay.style.pointerEvents = enabled ? 'auto' : 'none'
  })
}

export function isHapticEnabled() {
  return hapticEnabled
}

export function triggerHaptic(kind: HapticKind = 'selection') {
  if (!hapticEnabled) return

  const now = performance.now()
  if (now - lastTriggerMs < 35) return
  lastTriggerMs = now

  const tg = telegramHaptics()
  if (tg) {
    if (kind === 'selection') tg.selectionChanged()
    else if (kind === 'success' || kind === 'warning' || kind === 'error') tg.notificationOccurred(kind)
    else tg.impactOccurred(kind === 'medium' || kind === 'heavy' ? kind : 'light')
    return
  }

  if (isIOS()) {
    toggleIOSSwitch(ensureIOSFallbackSwitch())
    return
  }

  if (!navigator.vibrate) return

  const patterns: Record<HapticKind, number | number[]> = {
    selection: 8,
    light: 8,
    medium: 16,
    heavy: 24,
    success: [10, 36, 14],
    warning: [12, 40, 12],
    error: 20,
  }
  navigator.vibrate(patterns[kind])
}

function attachIOSSwitchOverlay(host: HTMLElement) {
  if (host.dataset.hapticOverlay === 'true') return
  if (shouldSkip(host)) return

  const style = window.getComputedStyle(host)
  if (style.position === 'absolute' || style.position === 'fixed') return
  if (style.position === 'static') {
    host.style.position = 'relative'
  }

  const overlay = document.createElement('input')
  overlay.type = 'checkbox'
  overlay.setAttribute('switch', '')
  overlay.className = 'haptic-switch-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.tabIndex = -1

  overlay.addEventListener('change', () => {
    window.requestAnimationFrame(() => {
      overlay.checked = false
    })
  })

  let touchStart: { x: number; y: number } | null = null
  let touchScrolled = false

  overlay.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      touchScrolled = false
    },
    { passive: true },
  )

  overlay.addEventListener(
    'touchmove',
    (e) => {
      if (!touchStart || e.touches.length !== 1) return
      const t = e.touches[0]
      if (Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) {
        touchScrolled = true
      }
    },
    { passive: true },
  )

  overlay.addEventListener('touchend', () => {
    touchStart = null
  }, { passive: true })

  overlay.addEventListener('click', (e) => {
    if (touchScrolled) {
      e.preventDefault()
      e.stopPropagation()
      touchScrolled = false
      return
    }
    e.stopPropagation()
    if (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement || host instanceof HTMLSelectElement) {
      return
    }
    host.click()
  })

  host.dataset.hapticOverlay = 'true'
  host.classList.add('haptic-overlay-host')
  host.appendChild(overlay)
}

function scanForOverlays(root: HTMLElement) {
  if (!hapticEnabled || !isIOS() || telegramHaptics()) return
  root.querySelectorAll<HTMLElement>(HOST_SELECTOR).forEach((host) => {
    if (shouldSkip(host)) return
    attachIOSSwitchOverlay(host)
  })
}

function onPointerDown(e: PointerEvent) {
  if (!hapticEnabled) return
  if (e.pointerType === 'mouse' && e.button !== 0) return

  const target = e.target as Element
  if (shouldSkip(target)) return

  const host = target.closest(HOST_SELECTOR) as HTMLElement | null
  if (!host) return

  // iOS: overlay hosts use native switch taps; layout-positioned hosts use fallback.
  if (isIOS() && !telegramHaptics()) {
    if (host.dataset.hapticOverlay !== 'true') {
      triggerHaptic('selection')
    }
    return
  }

  triggerHaptic('selection')
}

export function refreshHapticOverlays(root: HTMLElement) {
  scanForOverlays(root)
}

export function installGlobalHaptics(root: HTMLElement): () => void {
  const runScan = () => scanForOverlays(root)

  runScan()

  const observer = new MutationObserver(() => {
    runScan()
  })
  observer.observe(root, { childList: true, subtree: true })

  root.addEventListener('pointerdown', onPointerDown, { capture: true })

  return () => {
    observer.disconnect()
    root.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }
}
