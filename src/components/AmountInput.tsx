import { useCallback, useEffect, useRef, useState } from 'react'
import {
  currencySymbol,
  formatAmountValue,
  formatPrice,
  parseAmountValue,
  sanitizeAmountInput,
  vibrateTap,
} from '../utils'
import './AmountInput.css'

const PIXELS_PER_STEP = 26
const DRAG_CLICK_THRESHOLD = 6

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
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef(0)
  const suppressClickRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const step = currency === 'JPY' ? 1 : 1
  const baseAmount = parseAmountValue(value, allowEmpty)
  const dragSteps = dragY / PIXELS_PER_STEP
  const previewAmount = Math.max(0, baseAmount - dragSteps * step)

  const formatWheel = useCallback(
    (amount: number) => {
      if (allowEmpty && value === '' && amount === 0 && dragY === 0) {
        return placeholder
      }
      return formatPrice(amount, currency)
    },
    [allowEmpty, currency, dragY, placeholder, value],
  )

  const commitDrag = useCallback(() => {
    const steps = Math.round(dragY / PIXELS_PER_STEP)
    if (steps !== 0) {
      const next = Math.max(0, baseAmount - steps * step)
      if (allowEmpty && next === 0) {
        onChange('')
      } else {
        onChange(formatAmountValue(next, currency))
      }
      vibrateTap()
    }
    setDragY(0)
  }, [allowEmpty, baseAmount, currency, dragY, onChange, step])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return
    suppressClickRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const delta = e.clientY - dragStartY.current
    if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) suppressClickRef.current = true
    setDragY(delta)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    commitDrag()
  }

  const enterEditing = () => {
    setEditing(true)
    setDragY(0)
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
      <div
        className="amount-input-wheel haptic-skip"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={() => {
          if (!suppressClickRef.current) enterEditing()
          suppressClickRef.current = false
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuenow={previewAmount}
        aria-valuetext={formatWheel(previewAmount)}
        aria-label={label ?? 'Amount'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            enterEditing()
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            const next = Math.max(0, baseAmount + step)
            onChange(formatAmountValue(next, currency))
            vibrateTap()
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            const next = Math.max(0, baseAmount - step)
            if (allowEmpty && next === 0) onChange('')
            else onChange(formatAmountValue(next, currency))
            vibrateTap()
          }
        }}
      >
        <div
          className="amount-input-track"
          style={{ transform: `translateY(calc(${dragY * 0.4}px))` }}
        >
          <div className="amount-input-slot adjacent">{formatWheel(previewAmount - step)}</div>
          <div className="amount-input-slot current">{formatWheel(previewAmount)}</div>
          <div className="amount-input-slot adjacent">{formatWheel(previewAmount + step)}</div>
        </div>
      </div>
      <p className="amount-input-hint">Swipe to adjust · Tap to type</p>
    </div>
  )
}
