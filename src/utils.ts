const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
}

export function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  const formatted = amount % 1 === 0 ? amount.toString() : amount.toFixed(2)
  return `${symbol}${formatted}`
}

export function formatPriceOptional(amount?: number, currency?: string): string {
  if (amount == null) return '—'
  return formatPrice(amount, currency ?? 'GBP')
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
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

export function vibrate(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms)
}
