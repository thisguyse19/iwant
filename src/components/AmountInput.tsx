import { useEffect, useRef, useState } from 'react'
import {
  currencySymbol,
  formatAmountValue,
  formatPrice,
  parseAmountValue,
  sanitizeAmountInput,
  vibrateTap,
} from '../utils'
import './AmountInput.css'

interface AmountInputProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  currency: string
  allowEmpty?: boolean
  placeholder?: string
  compact?: boolean
}

export function AmountInput({
  id,
  label,
  value,
  onChange,
  currency,
  allowEmpty = false,
  placeholder = '0',
  compact = false,
}: AmountInputProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const step = currency === 'JPY' ? 1 : 1
  const amount = parseAmountValue(value, allowEmpty)

  const setAmount = (next: number) => {
    if (allowEmpty && next <= 0) {
      onChange('')
      return
    }
    onChange(formatAmountValue(Math.max(0, next), currency))
  }

  const adjust = (delta: number) => {
    setAmount(amount + delta)
    vibrateTap()
  }

  const displayValue =
    allowEmpty && value === '' ? placeholder : formatPrice(amount, currency)

  const enterEditing = () => {
    setEditing(true)
  }

  const exitEditing = () => {
    setEditing(false)
    if (value !== '' && !allowEmpty) {
      onChange(formatAmountValue(parseAmountValue(value), currency))
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <div className={`amount-input ${compact ? 'compact' : ''}`}>
        {label && (
          <label className="amount-input-label" htmlFor={id}>
            {label}
          </label>
        )}
        <div className="amount-input-typing">
          <span className="amount-input-symbol" aria-hidden="true">
            {currencySymbol(currency)}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode={currency === 'JPY' ? 'numeric' : 'decimal'}
            className="amount-input-field"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(sanitizeAmountInput(e.target.value, currency))}
            onBlur={exitEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                exitEditing()
              }
            }}
            autoComplete="off"
          />
        </div>
        <p className="amount-input-hint">Type an amount</p>
      </div>
    )
  }

  return (
    <div className={`amount-input ${compact ? 'compact' : ''}`}>
      {label && <span className="amount-input-label">{label}</span>}
      <div className="amount-input-stepper">
        <button
          type="button"
          className="amount-input-step"
          onClick={() => adjust(-step)}
          aria-label="Decrease amount"
        >
          −
        </button>
        <button
          type="button"
          className="amount-input-display"
          onClick={enterEditing}
          aria-label={label ?? 'Amount'}
        >
          {displayValue}
        </button>
        <button
          type="button"
          className="amount-input-step"
          onClick={() => adjust(step)}
          aria-label="Increase amount"
        >
          +
        </button>
      </div>
      {currency !== 'JPY' && (
        <div className="amount-input-quick">
          {[5, 10, 25].map((n) => (
            <button
              key={n}
              type="button"
              className="amount-input-quick-btn"
              onClick={() => adjust(n)}
            >
              +{n}
            </button>
          ))}
        </div>
      )}
      <p className="amount-input-hint">Tap amount to type · Use + and − to adjust</p>
    </div>
  )
}
