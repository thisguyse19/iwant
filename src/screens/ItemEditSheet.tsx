import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { CategoryPicker } from '../components/CategoryPicker'
import { ProductImagePicker } from '../components/ProductImagePicker'
import { AmountInput } from '../components/AmountInput'
import type { CategoryId, Priority } from '../types'

export function ItemEditSheet() {
  const { editingItem, setEditingItem, updateItem, baskets, settings } = useApp()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<CategoryId | undefined>()
  const [notes, setNotes] = useState('')
  const [link, setLink] = useState('')
  const [imageUrl, setImageUrl] = useState<string>()
  const [basketId, setBasketId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  useEffect(() => {
    if (!editingItem) return
    setTitle(editingItem.title)
    setPrice(editingItem.price?.toString() ?? '')
    setCategory(editingItem.category)
    setNotes(editingItem.notes ?? '')
    setLink(editingItem.link ?? '')
    setImageUrl(editingItem.imageUrl)
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
      category,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
      imageUrl,
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

      <AmountInput
        id="edit-price"
        label="Price"
        value={price}
        onChange={setPrice}
        currency={settings.currency}
        allowEmpty
        placeholder="Optional"
      />

      <ProductImagePicker title={title} value={imageUrl} onChange={setImageUrl} />

      <div className="field">
        <label>Category</label>
        <CategoryPicker value={category} onChange={setCategory} />
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
