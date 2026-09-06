import { useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import type { Priority } from '../types'
import { detectClipboardContent, vibrate } from '../utils'

export function AddSheet() {
  const { addOpen, setAddOpen, addItem } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setPrice('')
    setTag('')
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
    } catch {
      // clipboard unavailable
    }
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
      priority,
    })
    handleClose()
  }

  return (
    <Sheet open={addOpen} onClose={handleClose} title="Add to list">
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
      </div>

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
