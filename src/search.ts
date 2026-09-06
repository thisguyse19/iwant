import type { SearchSuggestion, WishlistItem } from './types'

export function faviconFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch {
    return ''
  }
}

function faviconFromBrand(title: string): string | undefined {
  const brand = title.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!brand || brand.length < 2) return undefined
  return `https://www.google.com/s2/favicons?domain=${brand}.com&sz=64`
}

function localSuggestions(query: string, items: WishlistItem[]): SearchSuggestion[] {
  const q = query.toLowerCase()
  const seen = new Set<string>()
  const results: SearchSuggestion[] = []

  for (const item of items) {
    const titleMatch = item.title.toLowerCase().includes(q)
    const tagMatch = item.tag?.toLowerCase().includes(q)
    if (!titleMatch && !tagMatch) continue

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
    if (results.length >= 3) break
  }

  return results
}

function jsonpFetch<T>(url: string, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `iwant_cb_${Date.now()}`
    const script = document.createElement('script')
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>)[cb]
      script.remove()
    }

    ;(window as unknown as Record<string, unknown>)[cb] = (data: T) => {
      cleanup()
      resolve(data)
    }

    const separator = url.includes('?') ? '&' : '?'
    script.src = `${url}${separator}callback=${cb}`
    script.onerror = () => {
      cleanup()
      reject(new Error('jsonp failed'))
    }
    document.head.appendChild(script)
  })
}

async function fetchGooglePhrases(query: string): Promise<string[]> {
  try {
    const data = await jsonpFetch<[string, string[]]>(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
    )
    return Array.isArray(data[1]) ? data[1] : []
  } catch {
    return []
  }
}

export async function searchSuggestions(
  query: string,
  items: WishlistItem[],
): Promise<SearchSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const local = localSuggestions(q, items)
  const seen = new Set(local.map((s) => s.title.toLowerCase()))
  seen.add(q.toLowerCase())

  let web: SearchSuggestion[] = []
  try {
    const phrases = (await fetchGooglePhrases(q))
      .filter((p) => !seen.has(p.toLowerCase()))
      .slice(0, 5 - local.length)

    web = phrases.map((phrase) => {
      seen.add(phrase.toLowerCase())
      return {
        title: phrase,
        source: 'web' as const,
        imageUrl: faviconFromBrand(phrase),
        link: `https://www.google.com/search?q=${encodeURIComponent(phrase)}`,
      }
    })
  } catch {
    // offline
  }

  return [...local, ...web].slice(0, 5)
}
