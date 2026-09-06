import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { dateInputValue, endOfDayMs, vibrate } from '../utils'
import './BoughtDateSheet.css'

export function BoughtDateSheet() {
  const { boughtPrompt, confirmMarkBought, cancelMarkBought } = useApp()
  const [customDate, setCustomDate] = useState('')

  const today = useMemo(() => dateInputValue(Date.now()), [])

  useEffect(() => {
    if (boughtPrompt) setCustomDate(today)
  }, [boughtPrompt, today])

  if (!boughtPrompt) return null

  const confirm = (boughtAt: number) => {
    vibrate()
    void confirmMarkBought(boughtAt)
  }

  return (
    <Sheet open title="When did you get it?" onClose={cancelMarkBought}>
      <p className="bought-date-item">{boughtPrompt.label}</p>

      <div className="bought-date-quick">
        <button type="button" className="bought-date-chip" onClick={() => confirm(endOfDayMs(Date.now()))}>
          Today
        </button>
        <button
          type="button"
          className="bought-date-chip"
          onClick={() => confirm(endOfDayMs(Date.now() - 86400000))}
        >
          Yesterday
        </button>
      </div>

      <div className="field">
        <label htmlFor="bought-date">Or pick a date</label>
        <input
          id="bought-date"
          type="date"
          max={today}
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="primary-btn"
        disabled={!customDate}
        onClick={() => {
          const picked = new Date(`${customDate}T12:00:00`)
          if (Number.isNaN(picked.getTime())) return
          confirm(endOfDayMs(picked.getTime()))
        }}
      >
        Mark bought
      </button>
    </Sheet>
  )
}
