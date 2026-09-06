import type { SearchSuggestion } from './types'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'

export async function searchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  try {
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: q,
      srlimit: '5',
      format: 'json',
      origin: '*',
    })

    const searchRes = await fetch(`${WIKI_API}?${searchParams}`)
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const results = searchData.query?.search ?? []
    if (results.length === 0) return []

    const pageIds = results.map((r: { pageid: number }) => r.pageid).join('|')

    const imageParams = new URLSearchParams({
      action: 'query',
      pageids: pageIds,
      prop: 'pageimages|info',
      piprop: 'thumbnail',
      pithumbsize: '80',
      inprop: 'url',
      format: 'json',
      origin: '*',
    })

    const imageRes = await fetch(`${WIKI_API}?${imageParams}`)
    const imageData = imageRes.ok ? await imageRes.json() : { query: { pages: {} } }
    const pages = imageData.query?.pages ?? {}

    return results.map((r: { pageid: number; title: string; snippet: string }) => {
      const page = pages[r.pageid]
      const snippet = r.snippet?.replace(/<[^>]+>/g, '') ?? ''
      return {
        title: r.title,
        description: snippet,
        imageUrl: page?.thumbnail?.source,
        link: page?.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
      }
    })
  } catch {
    return []
  }
}

export function faviconFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch {
    return ''
  }
}
