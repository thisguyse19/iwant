import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import type { Priority, WishlistItem } from '../types'
import { daysSince, formatPriceOptional, vibrate } from '../utils'

export function ItemDetailSheet() {
  const { editingItem, setEditingItem, updateItem, removeItem } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [tag, setTag] = useState('')
  const [notes, setNotes] = useState('')
  const [link, setLink] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  useEffect(() => {
    if (!editingItem) return
    setTitle(editingItem.title)
    setPrice(editingItem.price?.toString() ?? '')
    setTag(editingItem.tag ?? '')
    setNotes(editingItem.notes ?? '')
    setLink(editingItem.link ?? '')
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
      priority,
    })
    close()
  }

  const setStatus = async (status: WishlistItem['status']) => {
    if (!editingItem) return
    vibrate()
    await updateItem(editingItem.id, { status })
    close()
  }

  const handleDelete = async () => {
    if (!editingItem) return
    vibrate(20)
    await removeItem(editingItem.id)
    close()
  }

  if (!editingItem) return null

  const days = daysSince(editingItem.createdAt)

  return (
    <Sheet open={!!editingItem} onClose={close} title={editingItem.title}>
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

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-btn"
          style={{ display: 'inline-block', marginBottom: 12 }}
        >
          Open link
        </a>
      )}

      <div className="detail-meta-block">
        <div className="detail-meta-row">
          <span>On list</span>
          <span>{days === 0 ? 'Today' : `${days} day${days > 1 ? 's' : ''}`}</span>
        </div>
        <div className="detail-meta-row">
          <span>Current price</span>
          <span>{formatPriceOptional(editingItem.price, editingItem.currency)}</span>
        </div>
        <div className="detail-meta-row">
          <span>Status</span>
          <span style={{ textTransform: 'capitalize' }}>{editingItem.status}</span>
        </div>
      </div>

      {(editingItem.status === 'queued' || editingItem.status === 'ready') && (
        <div className="detail-actions">
          {editingItem.status === 'queued' && (
            <button type="button" className="secondary-btn" onClick={() => setStatus('ready')}>
              Ready
            </button>
          )}
          <button type="button" className="primary-btn" onClick={() => setStatus('bought')}>
            Bought
          </button>
        </div>
      )}

      <button type="button" className="secondary-btn" onClick={save}>
        Save changes
      </button>

      {editingItem.status !== 'dropped' && editingItem.status !== 'bought' && (
        <button type="button" className="secondary-btn" onClick={() => setStatus('dropped')}>
          Drop
        </button>
      )}

      <button type="button" className="secondary-btn destructive-btn" onClick={handleDelete}>
        Delete
      </button>
    </Sheet>
  )
}
