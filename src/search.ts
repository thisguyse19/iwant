import type { SearchSuggestion, WishlistItem } from './types'
import { getCategory } from './types'

export function faviconFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch {
    return ''
  }
}

export function toProductTitle(text: string): string {
  const minor = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'of', 'with'])
  const words = text.trim().split(/\s+/)
  return words
    .map((word, index) => {
      if (/[A-Z]/.test(word.slice(1))) return word
      const lower = word.toLowerCase()
      if (index > 0 && minor.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function getLocalSuggestions(query: string, items: WishlistItem[]): SearchSuggestion[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const seen = new Set<string>()
  const results: SearchSuggestion[] = []

  for (const item of items) {
    const category = getCategory(item.category)
    const titleMatch = item.title.toLowerCase().includes(q)
    const tagMatch = item.tag?.toLowerCase().includes(q)
    const categoryMatch = category?.label.toLowerCase().includes(q)
    if (!titleMatch && !tagMatch && !categoryMatch) continue

    const key = item.title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    results.push({
      title: item.title,
      description: 'From your list',
      imageUrl: item.imageUrl ?? (item.link ? faviconFromUrl(item.link) : undefined),
      link: item.link,
      source: 'local',
    })
    if (results.length >= 4) break
  }

  return results
}

function jsonpFetch<T>(url: string, timeoutMs = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `iwant_cb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const script = document.createElement('script')
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('timeout'))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>)[cb]
      script.remove()
    }

    ;(window as unknown as Record<string, unknown>)[cb] = (data: T) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(data)
    }

    const separator = url.includes('?') ? '&' : '?'
    script.src = `${url}${separator}callback=${cb}`
    script.async = true
    script.onerror = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('jsonp failed'))
    }
    document.head.appendChild(script)
  })
}

function parseGoogleSuggest(data: unknown): string[] {
  if (!Array.isArray(data) || !Array.isArray(data[1])) return []
  return data[1].filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
}

export async function fetchWebSuggestions(
  query: string,
  existing: SearchSuggestion[],
): Promise<SearchSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const seen = new Set(existing.map((s) => s.title.toLowerCase()))
  seen.add(q.toLowerCase())

  const encoded = encodeURIComponent(q)
  const endpoints = [
    `https://clients1.google.com/complete/search?client=firefox&q=${encoded}`,
    `https://suggestqueries.google.com/complete/search?client=firefox&q=${encoded}`,
  ]

  for (const url of endpoints) {
    try {
      const data = await jsonpFetch<unknown>(url)
      const phrases = parseGoogleSuggest(data)
        .filter((p) => !seen.has(p.toLowerCase()))
        .slice(0, 6 - existing.length)

      if (phrases.length > 0) {
        return phrases.map((phrase) => {
          seen.add(phrase.toLowerCase())
          const title = toProductTitle(phrase)
          return {
            title,
            source: 'web' as const,
            link: `https://www.google.com/search?q=${encodeURIComponent(phrase)}`,
          }
        })
      }
    } catch {
      // try next endpoint
    }
  }

  return []
}

function fallbackSuggestion(query: string): SearchSuggestion {
  const title = toProductTitle(query)
  return {
    title,
    source: 'web',
    link: `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`,
  }
}

export async function searchSuggestions(
  query: string,
  items: WishlistItem[],
): Promise<SearchSuggestion[]> {
  const q = query.trim()
  if (q.length < 1) return []

  const local = getLocalSuggestions(q, items)
  let results = [...local]

  if (q.length >= 2) {
    const web = await fetchWebSuggestions(q, local)
    results = [...local, ...web]
  }

  if (results.length === 0) {
    results = [fallbackSuggestion(q)]
  }

  return results.slice(0, 6)
}
