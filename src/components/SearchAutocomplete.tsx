import { useEffect, useRef, useState } from 'react'
import { searchSuggestions } from '../search'
import { useApp } from '../store'
import type { SearchSuggestion } from '../types'

interface SearchAutocompleteProps {
  query: string
  onSelect: (suggestion: SearchSuggestion) => void
  visible: boolean
}

export function SearchAutocomplete({ query, onSelect, visible }: SearchAutocompleteProps) {
  const { items } = useApp()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
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
    }, 280)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, visible, items])

  if (!visible || query.trim().length < 2) return null
  if (!loading && searched && suggestions.length === 0) return null

  return (
    <ul className="search-suggestions" role="listbox">
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
    </ul>
  )
}
