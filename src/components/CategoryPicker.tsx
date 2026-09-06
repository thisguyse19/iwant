import type { CSSProperties } from 'react'
import type { CategoryId } from '../types'
import { CATEGORIES } from '../types'
import './CategoryPicker.css'

interface CategoryPickerProps {
  value?: CategoryId
  onChange: (category: CategoryId | undefined) => void
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="category-picker" role="group" aria-label="Category">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`category-chip ${value === cat.id ? 'selected' : ''}`}
          style={{
            '--chip-color': cat.color,
            '--chip-bg': cat.bg,
          } as CSSProperties}
          onClick={() => onChange(value === cat.id ? undefined : cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
