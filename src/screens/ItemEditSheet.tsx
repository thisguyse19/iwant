import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import type { Priority } from '../types'

export function ItemEditSheet() {
  const { editingItem, setEditingItem, updateItem, baskets } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('')
  const [notes, setNotes] = useState('')
  const [link, setLink] = useState('')
  const [basketId, setBasketId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  useEffect(() => {
    if (!editingItem) return
    setTitle(editingItem.title)
    setPrice(editingItem.price?.toString() ?? '')
    setTag(editingItem.tag ?? '')
    setNotes(editingItem.notes ?? '')
    setLink(editingItem.link ?? '')
    setBasketId(editingItem.basketId ?? '')
    setPriority(editingItem.priority)
  }, [editingItem])

  const close = () => setEditingItem(null)

  const save = async () => {
    if (!editingItem || !title.trim()) return
    const parsedPrice = price ? parseFloat(price) : undefined
    await updateItem(editingItem.id, {
      title: title.trim(),
      price: parsedPrice != null && !isNaN(parsedPrice) ? parsedPrice : undefined,
      tag: tag.trim() || undefined,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
      basketId: basketId || undefined,
      priority,
    })
    close()
  }

  if (!editingItem) return null

  return (
    <Sheet open={!!editingItem} onClose={close} title={editingItem.title} autoFocus>
      <div className="field">
        <label htmlFor="edit-title">Title</label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="edit-price">Price</label>
          <input
            id="edit-price"
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-priority">Priority</label>
          <select
            id="edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="edit-tag">Tag</label>
        <input id="edit-tag" type="text" value={tag} onChange={(e) => setTag(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="edit-notes">Notes</label>
        <textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="edit-link">Link</label>
        <input id="edit-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>

      {baskets.length > 0 && (
        <div className="field">
          <label htmlFor="edit-basket">Basket</label>
          <select id="edit-basket" value={basketId} onChange={(e) => setBasketId(e.target.value)}>
            <option value="">None</option>
            {baskets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <button type="button" className="primary-btn" onClick={save}>
        Save changes
      </button>

      <button type="button" className="secondary-btn" onClick={close}>
        Cancel
      </button>
    </Sheet>
  )
}
