import { useMemo, useState } from 'react'
import { compareMonths, getCurrentMonth, getRecentMonths, shiftMonth } from '../budget'
import { useApp, useBudgetPeriod } from '../store'
import { ItemRow } from '../components/ItemRow'
import { BudgetChart } from '../components/BudgetChart'
import { Sheet } from '../components/Sheet'
import { ScreenChrome } from '../components/ScreenChrome'
import { formatPrice } from '../utils'
import '../components/ItemRow.css'
import './BudgetScreen.css'

type BudgetScope = 'month' | 'default'

export function BudgetScreen() {
  const { settings, updateSettings, setViewingItem, updateItem, removeItem } = useApp()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const summary = useBudgetPeriod(selectedMonth)
  const [editOpen, setEditOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('month')
  const [resetDayInput, setResetDayInput] = useState('1')

  const monthOptions = useMemo(() => getRecentMonths(8), [])
  const canGoForward = compareMonths(selectedMonth, getCurrentMonth()) < 0

  const openEdit = () => {
    const monthOverride = settings.monthBudgets?.[summary.period.key]
    const hasOverride = monthOverride != null
    setBudgetInput(
      (hasOverride ? monthOverride : settings.monthlyBudget ?? 0) > 0
        ? String(hasOverride ? monthOverride : settings.monthlyBudget)
        : '',
    )
    setBudgetScope(hasOverride ? 'month' : 'default')
    setResetDayInput(String(settings.budgetResetDay || 1))
    setEditOpen(true)
  }

  const saveBudget = async () => {
    const value = parseFloat(budgetInput)
    if (isNaN(value) || value < 0) return

    const resetDay = Math.min(28, Math.max(1, parseInt(resetDayInput, 10) || 1))
    const patch: Partial<typeof settings> = { budgetResetDay: resetDay }

    if (budgetScope === 'month') {
      patch.monthBudgets = {
        ...settings.monthBudgets,
        [summary.period.key]: value,
      }
    } else {
      patch.monthlyBudget = value
      const nextMonthBudgets = { ...settings.monthBudgets }
      delete nextMonthBudgets[summary.period.key]
      patch.monthBudgets = nextMonthBudgets
    }

    await updateSettings(patch)
    setEditOpen(false)
  }

  const clearMonthOverride = async () => {
    if (!settings.monthBudgets?.[summary.period.key]) return
    const next = { ...settings.monthBudgets }
    delete next[summary.period.key]
    await updateSettings({ monthBudgets: next })
  }

  const spentPercent = summary.hasBudget
    ? Math.min(100, (summary.spent / summary.budget) * 100)
    : 0
  const plannedPercent = summary.hasBudget && summary.period.isCurrent
    ? Math.min(100 - spentPercent, (summary.planned / summary.budget) * 100)
    : 0

  const ringCircumference = 2 * Math.PI * 15.5
  const spentDash = (spentPercent / 100) * ringCircumference
  const plannedDash = (plannedPercent / 100) * ringCircumference

  const heroAmount = summary.hasBudget
    ? summary.period.isCurrent
      ? Math.abs(summary.remaining)
      : summary.spent
    : summary.spent

  const heroLabel = !summary.hasBudget
    ? summary.period.isCurrent ? 'Set a budget to track spending' : `${summary.spentCount} purchases`
    : summary.period.isCurrent
      ? summary.overBudget
        ? `${formatPrice(Math.abs(summary.remaining), summary.currency)} over`
        : `${formatPrice(summary.remaining, summary.currency)} left`
      : summary.spent <= summary.budget
        ? `${formatPrice(summary.budget - summary.spent, summary.currency)} under budget`
        : `${formatPrice(summary.spent - summary.budget, summary.currency)} over`

  const monthToolbar = (
    <div className="budget-month-toolbar">
      <button
        type="button"
        className="budget-month-arrow"
        onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
        aria-label="Previous month"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
          <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="budget-month-chips" role="tablist" aria-label="Budget month">
        {monthOptions.map((month) => {
          const key = `${month.year}-${month.month}`
          const active = month.year === selectedMonth.year && month.month === selectedMonth.month
          const isNow = compareMonths(month, getCurrentMonth()) === 0
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`budget-month-chip ${active ? 'active' : ''}`}
              onClick={() => setSelectedMonth(month)}
            >
              {isNow ? 'Now' : new Date(month.year, month.month - 1).toLocaleString(undefined, { month: 'short' })}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="budget-month-arrow"
        onClick={() => canGoForward && setSelectedMonth((m) => shiftMonth(m, 1))}
        disabled={!canGoForward}
        aria-label="Next month"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
          <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )

  const hasMonthOverride = settings.monthBudgets?.[summary.period.key] != null

  return (
    <>
      <ScreenChrome
        title="Budget"
        subtitle={summary.period.rangeLabel}
        trailing={
          <button type="button" className="budget-edit-link" onClick={openEdit}>
            {summary.hasBudget ? 'Edit' : 'Set'}
          </button>
        }
        toolbar={monthToolbar}
      >
        <section className="budget-hero-card" aria-label="Budget summary">
          <div className="budget-hero-top">
            <div>
              <p className="budget-hero-period">{summary.period.label}</p>
              <p
                className="budget-hero-amount"
                style={{ color: summary.overBudget ? 'var(--destructive)' : undefined }}
              >
                {summary.hasBudget || summary.spent > 0
                  ? formatPrice(heroAmount, summary.currency)
                  : '—'}
              </p>
              <p className="budget-hero-label">{heroLabel}</p>
            </div>
            {summary.period.isCurrent && summary.hasBudget && (
              <div className="budget-hero-ring" aria-hidden="true">
                <svg viewBox="0 0 36 36">
                  <circle className="budget-ring-bg" cx="18" cy="18" r="15.5" />
                  <circle
                    className="budget-ring-spent"
                    cx="18"
                    cy="18"
                    r="15.5"
                    style={{ strokeDasharray: `${spentDash} ${ringCircumference - spentDash}` }}
                  />
                  <circle
                    className="budget-ring-planned"
                    cx="18"
                    cy="18"
                    r="15.5"
                    style={{
                      strokeDasharray: `${plannedDash} ${ringCircumference - plannedDash}`,
                      strokeDashoffset: -spentDash,
                    }}
                  />
                </svg>
                <span className="budget-ring-label">{Math.round(spentPercent + plannedPercent)}%</span>
              </div>
            )}
          </div>

          {summary.hasBudget && (
            <div className="budget-progress" aria-hidden="true">
              <div className="budget-progress-spent" style={{ width: `${spentPercent}%` }} />
              {summary.period.isCurrent && (
                <div
                  className="budget-progress-planned"
                  style={{ width: `${plannedPercent}%`, left: `${spentPercent}%` }}
                />
              )}
            </div>
          )}

          <div className="budget-stat-grid">
            <div className="budget-stat-cell">
              <span className="budget-stat-label">Budget</span>
              <span className="budget-stat-value">
                {summary.hasBudget ? formatPrice(summary.budget, summary.currency) : '—'}
              </span>
              {hasMonthOverride && (
                <span className="budget-stat-note">This month only</span>
              )}
            </div>
            <div className="budget-stat-cell">
              <span className="budget-stat-label">Spent</span>
              <span className="budget-stat-value">{formatPrice(summary.spent, summary.currency)}</span>
              <span className="budget-stat-note">{summary.spentCount} bought</span>
            </div>
            {summary.period.isCurrent && (
              <>
                <div className="budget-stat-cell">
                  <span className="budget-stat-label">On list</span>
                  <span className="budget-stat-value">{formatPrice(summary.planned, summary.currency)}</span>
                  <span className="budget-stat-note">{summary.plannedCount} planned</span>
                </div>
                <div className="budget-stat-cell">
                  <span className="budget-stat-label">Days left</span>
                  <span className="budget-stat-value">{summary.period.daysRemaining}</span>
                  <span className="budget-stat-note">in period</span>
                </div>
              </>
            )}
          </div>

          {summary.unpricedActive > 0 && summary.period.isCurrent && (
            <p className="budget-hero-warning">
              {summary.unpricedActive} item{summary.unpricedActive > 1 ? 's' : ''} on your list without a price
            </p>
          )}
        </section>

        <BudgetChart
          data={summary.dailySpend}
          maxAmount={summary.maxDailySpend}
          budget={summary.budget}
          currency={summary.currency}
          currentDay={summary.period.dayIndex}
          isCurrentPeriod={summary.period.isCurrent}
        />

        {summary.boughtItems.length > 0 && (
          <section className="budget-section">
            <h2 className="section-label">Spent this period</h2>
            <div className="item-list budget-spent-list">
              {summary.boughtItems.slice(0, 12).map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onTap={() => setViewingItem(item)}
                />
              ))}
            </div>
            {summary.boughtItems.length > 12 && (
              <p className="budget-more-note">
                +{summary.boughtItems.length - 12} more purchase{summary.boughtItems.length - 12 > 1 ? 's' : ''}
              </p>
            )}
          </section>
        )}

        {summary.affordable.length > 0 && (
          <section className="budget-section">
            <h2 className="section-label">Affordable now</h2>
            <div className="item-list">
              {summary.affordable.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onTap={() => setViewingItem(item)}
                  onMarkBought={() => updateItem(item.id, { status: 'bought' })}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!summary.hasBudget && (
          <div className="budget-empty-cta">
            <p>Set a monthly budget to track spending, see charts, and know what you can still afford.</p>
            <button type="button" className="primary-btn" onClick={openEdit}>
              Set budget
            </button>
          </div>
        )}
      </ScreenChrome>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Budget options">
        <p className="budget-sheet-period">{summary.period.label}</p>

        <div className="field">
          <label htmlFor="budget-amount">Amount ({settings.currency})</label>
          <input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
        </div>

        <div className="budget-scope-group" role="radiogroup" aria-label="Budget scope">
          <button
            type="button"
            role="radio"
            aria-checked={budgetScope === 'month'}
            className={`budget-scope-option ${budgetScope === 'month' ? 'active' : ''}`}
            onClick={() => setBudgetScope('month')}
          >
            <span className="budget-scope-title">This month only</span>
            <span className="budget-scope-sub">Override for {summary.period.shortLabel} {summary.period.year}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={budgetScope === 'default'}
            className={`budget-scope-option ${budgetScope === 'default' ? 'active' : ''}`}
            onClick={() => setBudgetScope('default')}
          >
            <span className="budget-scope-title">Default budget</span>
            <span className="budget-scope-sub">Applies to all months unless overridden</span>
          </button>
        </div>

        <div className="field">
          <label htmlFor="budget-reset-day">Period starts on day</label>
          <input
            id="budget-reset-day"
            type="number"
            inputMode="numeric"
            min="1"
            max="28"
            value={resetDayInput}
            onChange={(e) => setResetDayInput(e.target.value)}
          />
          <p className="budget-field-hint">1 = calendar month. Other days start a rolling period.</p>
        </div>

        <button type="button" className="primary-btn" onClick={saveBudget}>
          Save
        </button>

        {hasMonthOverride && (
          <button type="button" className="secondary-btn" onClick={clearMonthOverride}>
            Use default budget for this month
          </button>
        )}
      </Sheet>
    </>
  )
}
