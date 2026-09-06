import { useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { SearchAutocomplete } from '../components/SearchAutocomplete'
import type { Priority, SearchSuggestion } from '../types'
import { detectClipboardContent, vibrate } from '../utils'

export function AddSheet() {
  const { addOpen, setAddOpen, addItem } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('')
  const [link, setLink] = useState('')
  const [imageUrl, setImageUrl] = useState<string>()
  const [priority, setPriority] = useState<Priority>('medium')
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setPrice('')
    setTag('')
    setLink('')
    setImageUrl(undefined)
    setPriority('medium')
    setShowMore(false)
    setSaving(false)
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
      if (detected.link) setLink(detected.link)
    } catch {
      // clipboard unavailable
    }
  }

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    setTitle(s.title)
    if (s.link) setLink(s.link)
    if (s.imageUrl) setImageUrl(s.imageUrl)
  }

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    vibrate()
    const parsedPrice = price ? parseFloat(price) : undefined
    await addItem({
      title: title.trim(),
      price: parsedPrice != null && !isNaN(parsedPrice) ? parsedPrice : undefined,
      tag: tag.trim() || undefined,
      link: link.trim() || undefined,
      imageUrl,
      priority,
    })
    handleClose()
  }

  return (
    <Sheet open={addOpen} onClose={handleClose} title="Add to list" autoFocus>
      <div className="field">
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
          onSelect={handleSelectSuggestion}
        />
      </div>

      {imageUrl && (
        <div className="item-preview-image">
          <img src={imageUrl} alt="" />
        </div>
      )}

      <div className="field-row">
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
        <div className="field">
          <label htmlFor="add-tag">Tag</label>
          <input
            id="add-tag"
            type="text"
            placeholder="Optional"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

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
