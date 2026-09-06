const CURRENCY_LOCALES: Record<string, string> = {
  GBP: 'en-GB',
  USD: 'en-US',
  EUR: 'en-IE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
  JPY: 'ja-JP',
}

function currencyLocale(currency: string): string {
  return CURRENCY_LOCALES[currency] ?? 'en-US'
}

function fractionDigits(amount: number, currency: string): { min: number; max: number } {
  if (currency === 'JPY') return { min: 0, max: 0 }
  const hasCents = Math.abs(amount % 1) > 0.001
  return { min: hasCents ? 2 : 0, max: 2 }
}

export function formatPrice(amount: number, currency: string): string {
  const { min, max } = fractionDigits(amount, currency)
  return new Intl.NumberFormat(currencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount)
}

export function formatPriceOptional(amount?: number, currency?: string): string {
  if (amount == null) return '—'
  return formatPrice(amount, currency ?? 'GBP')
}

export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat(currencyLocale(currency), {
    style: 'currency',
    currency,
  }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? currency
}

export function sanitizeAmountInput(raw: string, currency: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '')
  if (currency === 'JPY') return cleaned.replace(/\D/g, '')
  const dot = cleaned.indexOf('.')
  if (dot !== -1) {
    cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
    const [, frac = ''] = cleaned.split('.')
    if (frac.length > 2) cleaned = `${cleaned.split('.')[0]}.${frac.slice(0, 2)}`
  }
  return cleaned
}

export function formatAmountValue(amount: number, currency: string): string {
  if (currency === 'JPY') return String(Math.round(amount))
  if (Math.abs(amount % 1) < 0.001) return String(Math.round(amount))
  return amount.toFixed(2).replace(/\.?0+$/, '')
}

export function parseAmountValue(value: string, allowEmpty = false): number {
  if (value === '') return allowEmpty ? 0 : 0
  const n = parseFloat(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
}

export function startOfDayMs(timestamp: number): number {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDayMs(timestamp: number): number {
  const d = new Date(timestamp)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

export function dateInputValue(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatBoughtDate(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const todayStart = startOfDayMs(now.getTime())
  const dateStart = startOfDayMs(timestamp)

  if (dateStart === todayStart) return 'Bought today'
  if (dateStart === todayStart - 86400000) return 'Bought yesterday'

  const sameYear = date.getFullYear() === now.getFullYear()
  return `Bought ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })}`
}

export function formatChartDayLabel(periodStartMs: number, day: number): string {
  const d = new Date(periodStartMs + (day - 1) * 86400000)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatListAge(timestamp: number): string {
  const days = daysSince(timestamp)
  if (days === 0) return 'Added today'
  if (days === 1) return '1 day on list'
  return `${days} days on list`
}

export function formatFixedDueDay(day: number): string {
  return `Due day ${day}`
}

export function detectClipboardContent(text: string): {
  title?: string
  link?: string
} {
  const trimmed = text.trim()
  if (!trimmed) return {}
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { link: trimmed, title: '' }
    }
  } catch {
    // not a URL
  }
  return { title: trimmed }
}

let hapticEnabled = true

export function setHapticEnabled(enabled: boolean) {
  hapticEnabled = enabled
}

export function vibrate(ms = 10) {
  if (!hapticEnabled) return
  if (navigator.vibrate) navigator.vibrate(ms)
}

export function vibrateTap() {
  if (!hapticEnabled) return
  vibrate(8)
}

/** Short knock — delete, remove */
export function vibrateRemove() {
  if (!hapticEnabled) return
  if (navigator.vibrate) navigator.vibrate(16)
}

/** Softer double tap — marked bought */
export function vibrateBought() {
  if (!hapticEnabled) return
  if (navigator.vibrate) navigator.vibrate([10, 36, 14])
}
