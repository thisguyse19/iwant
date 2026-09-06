import { useEffect, useRef, useState } from 'react'
import { searchSuggestions } from '../search'
import { useApp } from '../store'
import type { SearchSuggestion } from '../types'

interface SearchAutocompleteProps {
  query: string
  onSelect: (suggestion: SearchSuggestion) => void
  visible: boolean
  focused: boolean
}

export function SearchAutocomplete({ query, onSelect, visible, focused }: SearchAutocompleteProps) {
  const { items } = useApp()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  const show = visible && focused && query.trim().length >= 2

  useEffect(() => {
    if (!show) {
      setSuggestions([])
      setLoading(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++requestId.current
    setLoading(true)

    timerRef.current = setTimeout(async () => {
      const results = await searchSuggestions(query, items)
      if (id !== requestId.current) return
      setSuggestions(results.slice(0, 4))
      setLoading(false)
    }, 350)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, show, items])

  if (!show) return null
  if (!loading && suggestions.length === 0) return null

  return (
    <ul className="search-suggestions search-suggestions-inline" role="listbox">
      {loading && (
        <li className="search-suggestion-inline search-suggestion-loading">Searching…</li>
      )}
      {!loading &&
        suggestions.map((s) => (
          <li key={`${s.source ?? 'web'}-${s.title}`}>
            <button
              type="button"
              className="search-suggestion-inline"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(s)}
            >
              <span className="search-suggestion-inline-title">{s.title}</span>
              {s.source === 'local' && (
                <span className="search-suggestion-inline-tag">Yours</span>
              )}
            </button>
          </li>
        ))}
    </ul>
  )
}
