import type { SearchSuggestion, WishlistItem } from './types'

const DDG_AC = 'https://duckduckgo.com/ac/'
const DDG_IA = 'https://api.duckduckgo.com/'

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
    if (results.length >= 2) break
  }

  return results
}

async function ddgPhrases(query: string): Promise<string[]> {
  const res = await fetch(`${DDG_AC}?q=${encodeURIComponent(query)}&type=list`)
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data) || !Array.isArray(data[1])) return []
  return data[1] as string[]
}

function extractOfficialUrl(infobox: { content?: { label: string; value: unknown }[] }): string | undefined {
  const entry = infobox?.content?.find((c) => c.label === 'Official Website')
  if (entry && typeof entry.value === 'string') return entry.value
  return undefined
}

async function enrichPhrase(phrase: string): Promise<Partial<SearchSuggestion>> {
  try {
    const res = await fetch(
      `${DDG_IA}?q=${encodeURIComponent(phrase)}&format=json&no_html=1&skip_disambig=1`,
    )
    if (!res.ok) return {}
    const data = await res.json()

    const link =
      extractOfficialUrl(data.Infobox) ||
      (data.AbstractURL && !data.AbstractURL.includes('wikipedia.org') ? data.AbstractURL : undefined)

    let imageUrl: string | undefined
    if (data.Image) {
      imageUrl = data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`
    } else if (link) {
      imageUrl = faviconFromUrl(link)
    }

    return { link, imageUrl }
  } catch {
    return {}
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

  let web: SearchSuggestion[] = []
  try {
    const phrases = (await ddgPhrases(q))
      .filter((p) => {
        const lower = p.toLowerCase()
        return lower !== q.toLowerCase() && !seen.has(lower)
      })
      .slice(0, 5 - local.length)

    if (phrases.length > 0) {
      const enriched = await enrichPhrase(phrases[0])
      seen.add(phrases[0].toLowerCase())

      web = phrases.map((phrase, i) => {
        if (i === 0) {
          return {
            title: phrase,
            source: 'web' as const,
            imageUrl: enriched.imageUrl ?? faviconFromBrand(phrase),
            link: enriched.link ?? `https://duckduckgo.com/?q=${encodeURIComponent(phrase)}`,
          }
        }
        return {
          title: phrase,
          source: 'web' as const,
          imageUrl: faviconFromBrand(phrase),
          link: `https://duckduckgo.com/?q=${encodeURIComponent(phrase)}`,
        }
      })
    }
  } catch {
    // offline — local suggestions still work
  }

  return [...local, ...web].slice(0, 5)
}
