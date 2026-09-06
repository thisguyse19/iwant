import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { searchSuggestions } from '../search'
import { useApp } from '../store'
import type { SearchSuggestion } from '../types'

interface SearchAutocompleteProps {
  query: string
  onSelect: (suggestion: SearchSuggestion) => void
  visible: boolean
  anchorRef: RefObject<HTMLElement | null>
}

export function SearchAutocomplete({ query, onSelect, visible, anchorRef }: SearchAutocompleteProps) {
  const { items } = useApp()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (!visible || !anchorRef.current) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [visible, anchorRef, query, suggestions.length, loading])

  useEffect(() => {
    if (!visible || query.trim().length < 1) {
      setSuggestions([])
      setLoading(false)
      setSearched(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++requestId.current
    setLoading(true)
    setSearched(false)

    timerRef.current = setTimeout(async () => {
      const results = await searchSuggestions(query, items)
      if (id !== requestId.current) return
      setSuggestions(results)
      setLoading(false)
      setSearched(true)
    }, 200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, visible, items])

  if (!visible || query.trim().length < 1 || !position) return null
  if (!loading && searched && suggestions.length === 0) return null

  return createPortal(
    <ul
      className="search-suggestions search-suggestions-portal"
      role="listbox"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {loading && (
        <li className="search-suggestion search-suggestion-loading">Searching…</li>
      )}
      {!loading &&
        suggestions.map((s) => (
          <li key={`${s.source ?? 'web'}-${s.title}`}>
            <button
              type="button"
              className="search-suggestion"
              role="option"
              onClick={() => onSelect(s)}
            >
              {s.imageUrl ? (
                <img src={s.imageUrl} alt="" className="search-suggestion-img" />
              ) : (
                <span className="search-suggestion-img search-suggestion-img-placeholder" />
              )}
              <span className="search-suggestion-text">
                <span className="search-suggestion-title">{s.title}</span>
                {s.description && (
                  <span className="search-suggestion-desc">{s.description}</span>
                )}
              </span>
            </button>
          </li>
        ))}
    </ul>,
    document.body,
  )
}
