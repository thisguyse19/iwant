import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { SearchAutocomplete } from '../components/SearchAutocomplete'
import { CategoryPicker } from '../components/CategoryPicker'
import type { CategoryId, Priority, SearchSuggestion } from '../types'
import { detectClipboardContent, vibrate } from '../utils'
import { faviconFromUrl } from '../search'

export function AddSheet() {
  const { addOpen, addBasketId, setAddOpen, addItem, items, baskets } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<CategoryId | undefined>()
  const [link, setLink] = useState('')
  const [imageUrl, setImageUrl] = useState<string>()
  const [basketId, setBasketId] = useState<string>('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (addOpen && addBasketId) setBasketId(addBasketId)
  }, [addOpen, addBasketId])

  const reset = () => {
    setTitle('')
    setPrice('')
    setCategory(undefined)
    setLink('')
    setImageUrl(undefined)
    setBasketId('')
    setPriority('medium')
    setShowMore(false)
    setSaving(false)
    setSearchFocused(false)
  }

  const handleClose = () => {
    setAddOpen(false)
    reset()
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const detected = detectClipboardContent(text)
      if (detected.title) setTitle(detected.title)
      if (detected.link) {
        setLink(detected.link)
        setImageUrl(faviconFromUrl(detected.link))
      }
    } catch {
      // clipboard unavailable
    }
  }

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    setTitle(s.title)
    if (s.link) setLink(s.link)
    if (s.imageUrl) setImageUrl(s.imageUrl)
    if (s.source === 'local' && s.description === 'From your list') {
      const match = items.find((i) => i.title === s.title)
      if (match?.category) setCategory(match.category)
      if (match?.price != null) setPrice(match.price.toString())
    }
    setSearchFocused(false)
  }

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    vibrate()
    const parsedPrice = price ? parseFloat(price) : undefined
    await addItem({
      title: title.trim(),
      price: parsedPrice != null && !isNaN(parsedPrice) ? parsedPrice : undefined,
      category,
      link: link.trim() || undefined,
      imageUrl,
      basketId: basketId || undefined,
      priority,
    })
    handleClose()
  }

  const pageUrl = link.trim()
    || (title.trim() ? `https://www.google.com/search?q=${encodeURIComponent(title.trim())}` : '')

  return (
    <Sheet open={addOpen} onClose={handleClose} title="Add to list" autoFocus>
      <div
        ref={searchAreaRef}
        className="field field-search"
        onFocus={() => setSearchFocused(true)}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null
          if (next && searchAreaRef.current?.contains(next)) return
          setSearchFocused(false)
        }}
      >
        <label htmlFor="add-title">What is it?</label>
        <div className="field-with-action">
          <input
            id="add-title"
            type="text"
            placeholder="Running shoes, gym pass…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoComplete="off"
          />
          <button type="button" className="paste-btn" onClick={handlePaste}>
            Paste
          </button>
        </div>
        <SearchAutocomplete
          query={title}
          visible={addOpen}
          focused={searchFocused}
          onSelect={handleSelectSuggestion}
        />
      </div>

      {imageUrl && (
        <div className="item-preview-image">
          <img src={imageUrl} alt="" />
        </div>
      )}

      <div className="field">
        <label>Category</label>
        <CategoryPicker value={category} onChange={setCategory} />
      </div>

      <div className="field-price-row">
        <div className="field">
          <label htmlFor="add-price">Price</label>
          <input
            id="add-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="Optional"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        {pageUrl && (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="open-page-link"
          >
            Open page ↗
          </a>
        )}
      </div>

      {baskets.length > 0 && (
        <div className="field">
          <label htmlFor="add-basket">Basket</label>
          <select
            id="add-basket"
            value={basketId}
            onChange={(e) => setBasketId(e.target.value)}
          >
            <option value="">None</option>
            {baskets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {!showMore && (
        <button type="button" className="text-btn" onClick={() => setShowMore(true)}>
          More options
        </button>
      )}

      {showMore && (
        <div className="field">
          <label htmlFor="add-priority">Priority</label>
          <select
            id="add-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      )}

      <button
        type="button"
        className="primary-btn"
        disabled={!title.trim() || saving}
        onClick={handleSave}
      >
        Save
      </button>
    </Sheet>
  )
}
