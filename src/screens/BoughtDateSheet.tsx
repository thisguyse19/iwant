import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { Sheet } from '../components/Sheet'
import { stageBoughtFromPrompt, useExitAnimation } from '../exitAnimation'
import { dateInputValue, endOfDayMs } from '../utils'
import './BoughtDateSheet.css'

export function BoughtDateSheet() {
  const { boughtPrompt, confirmMarkBought, cancelMarkBought, items } = useApp()
  const { stageExit } = useExitAnimation()
  const [customDate, setCustomDate] = useState('')

  const today = useMemo(() => dateInputValue(Date.now()), [])

  useEffect(() => {
    if (boughtPrompt) setCustomDate(today)
  }, [boughtPrompt, today])

  if (!boughtPrompt) return null

  const confirm = (boughtAt: number) => {
    const prompt = boughtPrompt
    cancelMarkBought()
    const staged = stageBoughtFromPrompt(
      stageExit,
      items,
      prompt,
      () => confirmMarkBought(boughtAt, prompt),
    )
    if (!staged) {
      void confirmMarkBought(boughtAt, prompt)
    }
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

      <div className="field bought-date-field">
        <label htmlFor="bought-date">Or pick a date</label>
        <input
          id="bought-date"
          className="bought-date-input"
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
