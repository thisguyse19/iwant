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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchSuggestions(query, items)
      setSuggestions(results)
      setLoading(false)
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, visible, items])

  if (!visible || query.trim().length < 2) return null
  if (!loading && suggestions.length === 0) return null

  return (
    <ul className="search-suggestions" role="listbox">
      {loading && suggestions.length === 0 && (
        <li className="search-suggestion search-suggestion-loading">Searching…</li>
      )}
      {suggestions.map((s) => (
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
