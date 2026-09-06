import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchWebSuggestions, getLocalSuggestions, toProductTitle } from '../search'
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
  const [webSuggestions, setWebSuggestions] = useState<SearchSuggestion[]>([])
  const [loadingWeb, setLoadingWeb] = useState(false)
  const requestId = useRef(0)

  const trimmed = query.trim()
  const localSuggestions = useMemo(
    () => (focused && trimmed.length >= 1 ? getLocalSuggestions(trimmed, items) : []),
    [focused, trimmed, items],
  )

  const suggestions = useMemo(() => {
    if (!focused || trimmed.length < 1) return []

    const merged = [...localSuggestions, ...webSuggestions]
    const seen = new Set<string>()
    const unique: SearchSuggestion[] = []
    for (const s of merged) {
      const key = s.title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(s)
      if (unique.length >= 4) break
    }
    if (unique.length === 0 && !loadingWeb) {
      unique.push({
        title: toProductTitle(trimmed),
        source: 'web',
        link: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`,
      })
    }
    return unique
  }, [focused, localSuggestions, webSuggestions, trimmed, loadingWeb])

  useEffect(() => {
    if (!focused) {
      requestId.current++
      setWebSuggestions([])
      setLoadingWeb(false)
    }
  }, [focused])

  useEffect(() => {
    if (!visible || !focused || trimmed.length < 2) {
      setWebSuggestions([])
      setLoadingWeb(false)
      return
    }

    const id = ++requestId.current
    setLoadingWeb(true)
    const local = getLocalSuggestions(trimmed, items)

    fetchWebSuggestions(trimmed, local)
      .then((web) => {
        if (id !== requestId.current) return
        setWebSuggestions(web)
        setLoadingWeb(false)
      })
      .catch(() => {
        if (id !== requestId.current) return
        setWebSuggestions([])
        setLoadingWeb(false)
      })
  }, [trimmed, visible, focused, items])

  const showPanel = visible && focused && trimmed.length >= 1
  if (!showPanel) return null

  const showLoading = loadingWeb && trimmed.length >= 2 && webSuggestions.length === 0

  return (
    <ul className="search-suggestions search-suggestions-inline" role="listbox">
      {suggestions.map((s) => (
        <li key={`${s.source ?? 'web'}-${s.title}`}>
          <button
            type="button"
            className="search-suggestion-inline"
            role="option"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
          >
            <span className="search-suggestion-inline-title">{s.title}</span>
            {s.source === 'local' && (
              <span className="search-suggestion-inline-tag">Yours</span>
            )}
          </button>
        </li>
      ))}
      {showLoading && (
        <li className="search-suggestion-inline search-suggestion-loading">Searching…</li>
      )}
    </ul>
  )
}
