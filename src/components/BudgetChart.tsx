import { formatPrice } from '../utils'
import type { DailySpend } from '../budget'
import './BudgetChart.css'

interface BudgetChartProps {
  data: DailySpend[]
  maxAmount: number
  budget: number
  currency: string
  currentDay?: number
  isCurrentPeriod: boolean
}

export function BudgetChart({
  data,
  maxAmount,
  budget,
  currency,
  currentDay,
  isCurrentPeriod,
}: BudgetChartProps) {
  const chartMax = Math.max(maxAmount, budget > 0 ? budget / data.length : 0, 1)
  const hasSpend = data.some((d) => d.amount > 0)
  const avgDaily = budget > 0 && data.length > 0 ? budget / data.length : 0
  const avgHeight = (avgDaily / chartMax) * 100

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

        <div className="budget-chart-bars">
          {data.map((point) => {
            const height = point.amount > 0 ? (point.amount / chartMax) * 100 : 0
            const isToday = isCurrentPeriod && currentDay === point.day
            const isFuture = isCurrentPeriod && currentDay != null && point.day > currentDay

            return (
              <div key={point.day} className="budget-chart-bar-col">
                <div className="budget-chart-bar-track">
                  <div
                    className={`budget-chart-bar ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                    style={{ height: `${Math.max(height, point.amount > 0 ? 4 : 0)}%` }}
                    title={`${point.label}: ${formatPrice(point.amount, currency)}`}
                  />
                </div>
                {(point.day === 1 || point.day % 7 === 0 || point.day === data.length) && (
                  <span className="budget-chart-axis">{point.day}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!hasSpend && (
        <p className="budget-chart-empty">No spending recorded this period yet.</p>
      )}
    </div>
  )
}
