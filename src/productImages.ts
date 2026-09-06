/** Build an image search query from a product title — prefer the product, not the brand. */
export function productImageQuery(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return title.trim()

  const first = words[0]
  const second = words[1]
  // "Nike Running Shoes" → drop leading brand when the next word is also capitalised
  if (/^[A-Z][a-zA-Z0-9&'.-]+$/.test(first) && /^[A-Z0-9]/.test(second)) {
    return words.slice(1).join(' ')
  }
  return title.trim()
}

export interface ProductImagePage {
  images: string[]
  hasMore: boolean
}

interface WikimediaPage {
  index?: number
  imageinfo?: Array<{ thumburl?: string; url?: string }>
}

interface WikimediaResponse {
  query?: { pages?: Record<string, WikimediaPage> }
  continue?: { gsroffset?: number }
}

export async function fetchProductImages(
  title: string,
  page: number,
): Promise<ProductImagePage> {
  const query = productImageQuery(title)
  if (query.length < 2) return { images: [], hasMore: false }

  const offset = page * 4
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrlimit', '4')
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url')
  url.searchParams.set('iiurlwidth', '320')
  if (offset > 0) url.searchParams.set('gsroffset', String(offset))

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return { images: [], hasMore: false }
    const data = (await res.json()) as WikimediaResponse
    const pages = data.query?.pages ?? {}
    const images = Object.values(pages)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((p) => p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url)
      .filter((u): u is string => Boolean(u))
      .slice(0, 4)

    return {
      images,
      hasMore: data.continue?.gsroffset != null || images.length === 4,
    }
  } catch {
    return { images: [], hasMore: false }
  }
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_EDGE = 480

export async function readImageFromDevice(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image too large')
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })

  return resizeDataUrl(dataUrl, MAX_EDGE)
}

function resizeDataUrl(dataUrl: string, maxEdge: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = dataUrl
  })
}
