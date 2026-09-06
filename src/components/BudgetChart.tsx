import { useCallback, useRef, useState } from 'react'
import { formatChartDayLabel, formatPrice, vibrate } from '../utils'
import type { DailySpend } from '../budget'
import './BudgetChart.css'

const HOLD_MS = 400

interface BudgetChartProps {
  data: DailySpend[]
  maxAmount: number
  budget: number
  currency: string
  periodStartMs: number
  currentDay?: number
  isCurrentPeriod: boolean
  onDayHold?: (day: number | null) => void
}

export function BudgetChart({
  data,
  maxAmount,
  budget,
  currency,
  periodStartMs,
  currentDay,
  isCurrentPeriod,
  onDayHold,
}: BudgetChartProps) {
  const chartMax = Math.max(maxAmount, budget > 0 ? budget / data.length : 0, 1)
  const hasSpend = data.some((d) => d.amount > 0)
  const avgDaily = budget > 0 && data.length > 0 ? budget / data.length : 0
  const avgHeight = (avgDaily / chartMax) * 100
  const [heldDay, setHeldDay] = useState<number | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heldDayRef = useRef<number | null>(null)

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const releaseHold = useCallback(() => {
    clearHoldTimer()
    if (heldDayRef.current != null) {
      heldDayRef.current = null
      setHeldDay(null)
      onDayHold?.(null)
    }
  }, [clearHoldTimer, onDayHold])

  const startHold = useCallback(
    (day: number) => {
      clearHoldTimer()
      holdTimerRef.current = setTimeout(() => {
        vibrate(10)
        heldDayRef.current = day
        setHeldDay(day)
        onDayHold?.(day)
      }, HOLD_MS)
    },
    [clearHoldTimer, onDayHold],
  )

  const heldPoint = heldDay != null ? data.find((d) => d.day === heldDay) : null

  return (
    <div className="budget-chart" role="img" aria-label="Daily spending chart">
      <div className="budget-chart-header">
        <span className="budget-chart-title">Spending</span>
        {budget > 0 && (
          <span className="budget-chart-legend">
            Daily pace {formatPrice(avgDaily, currency)}
          </span>
        )}
      </div>

      <div className="budget-chart-body">
        {budget > 0 && (
          <div
            className="budget-chart-pace-line"
            style={{ bottom: `${avgHeight}%` }}
            aria-hidden="true"
          />
        )}

        {heldPoint && (
          <div className="budget-chart-callout" role="status" aria-live="polite">
            <p className="budget-chart-callout-date">
              {formatChartDayLabel(periodStartMs, heldPoint.day)}
            </p>
            <p className="budget-chart-callout-amount">
              {formatPrice(heldPoint.amount, currency)}
            </p>
            {heldPoint.itemCount > 0 ? (
              <ul className="budget-chart-callout-items">
                {heldPoint.items.map((item) => (
                  <li key={item.id}>
                    <span className="budget-chart-callout-item-title">{item.title}</span>
                    {item.price != null && (
                      <span className="budget-chart-callout-item-price">
                        {formatPrice(item.price, item.currency || currency)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="budget-chart-callout-empty">No purchases</p>
            )}
          </div>
        )}

        <div className="budget-chart-bars">
          {data.map((point) => {
            const height = point.amount > 0 ? (point.amount / chartMax) * 100 : 0
            const isToday = isCurrentPeriod && currentDay === point.day
            const isFuture = isCurrentPeriod && currentDay != null && point.day > currentDay
            const isHeld = heldDay === point.day

            return (
              <div
                key={point.day}
                className={`budget-chart-bar-col haptic-skip ${isHeld ? 'held' : ''}`}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse' && e.button !== 0) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  startHold(point.day)
                }}
                onPointerUp={releaseHold}
                onPointerCancel={releaseHold}
                onPointerLeave={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) releaseHold()
                }}
              >
                <div className="budget-chart-bar-track">
                  <div
                    className={`budget-chart-bar ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isHeld ? 'held' : ''}`}
                    style={{ height: `${Math.max(height, point.amount > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="budget-chart-axis" aria-hidden={!(point.day === 1 || point.day % 7 === 0 || point.day === data.length)}>
                  {point.day === 1 || point.day % 7 === 0 || point.day === data.length ? point.day : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {!hasSpend && (
        <p className="budget-chart-empty">No spending recorded this period yet.</p>
      )}
      {hasSpend && heldDay == null && (
        <p className="budget-chart-hint">Press and hold a day to see spending</p>
      )}
    </div>
  )
}
