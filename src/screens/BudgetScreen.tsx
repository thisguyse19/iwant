import { useMemo, useState } from 'react'
import { compareMonths, getCurrentMonth, getRecentMonths, shiftMonth } from '../budget'
import { budgetNoBudgetCopy, withinReachEmptyLine, withinReachLine } from '../copy'
import {
  FIXED_INTERVAL_LABELS,
  FIXED_INTERVALS,
  fixedIntervalAccent,
  formatFixedExpenseMeta,
  formatFixedRate,
  getFixedExpensePeriodTotal,
  normalizeFixedExpense,
} from '../fixedExpenses'
import { useExitAnimation, useBudgetPulse } from '../exitAnimation'
import { useApp, useBudgetPeriod } from '../store'
import { ItemRow } from '../components/ItemRow'
import { BudgetChart } from '../components/BudgetChart'
import { Sheet } from '../components/Sheet'
import { ScreenChrome } from '../components/ScreenChrome'
import type { BudgetHeroView, FixedExpense, FixedExpenseInterval } from '../types'
import { formatPrice, vibrateTap } from '../utils'
import '../components/ItemRow.css'
import './BudgetScreen.css'

type BudgetScope = 'month' | 'default'

interface FixedExpenseDraft {
  id?: string
  name: string
  amount: string
  interval: FixedExpenseInterval
  dayOfMonth: string
}

const HERO_VIEWS: Array<{ id: BudgetHeroView; label: string; short: string }> = [
  { id: 'actual', label: 'Actual left', short: 'Actual' },
  { id: 'projected', label: 'Projected left', short: 'Projected' },
  { id: 'spent', label: 'Spent', short: 'Spent' },
  { id: 'budget', label: 'Budget cap', short: 'Budget' },
]

function heroViewData(
  view: BudgetHeroView,
  summary: ReturnType<typeof useBudgetPeriod>,
): { amount: number; label: string; over: boolean } {
  const { currency, hasBudget, period } = summary

  if (!hasBudget) {
    if (view === 'spent' || !period.isCurrent) {
      return { amount: summary.spent, label: `${summary.spentCount} purchases`, over: false }
    }
    return { amount: summary.spent, label: 'Set a budget to track spending', over: false }
  }

  if (!period.isCurrent) {
    if (view === 'spent') {
      return { amount: summary.spent, label: `${summary.spentCount} purchases`, over: false }
    }
    if (view === 'budget') {
      return { amount: summary.budget, label: 'Budget for period', over: false }
    }
    const diff = summary.budget - summary.spent - summary.fixed
    return {
      amount: Math.abs(diff),
      label: diff >= 0
        ? `${formatPrice(diff, currency)} under budget`
        : `${formatPrice(Math.abs(diff), currency)} over`,
      over: diff < 0,
    }
  }

  switch (view) {
    case 'actual':
      return {
        amount: Math.abs(summary.actualRemaining),
        label: summary.overBudgetActual
          ? `${formatPrice(Math.abs(summary.actualRemaining), currency)} over`
          : `${formatPrice(summary.actualRemaining, currency)} left`,
        over: summary.overBudgetActual,
      }
    case 'projected':
      return {
        amount: Math.abs(summary.projectedRemaining),
        label: summary.overBudget
          ? `${formatPrice(Math.abs(summary.projectedRemaining), currency)} over`
          : `${formatPrice(summary.projectedRemaining, currency)} left`,
        over: summary.overBudget,
      }
    case 'spent':
      return {
        amount: summary.spent,
        label: `${summary.spentCount} bought · ${formatPrice(summary.fixedActual, currency)} fixed so far`,
        over: false,
      }
    case 'budget':
      return {
        amount: summary.budget,
        label: `${formatPrice(summary.spent + summary.fixedActual, currency)} committed so far`,
        over: false,
      }
  }
}

export function BudgetScreen() {
  const { settings, updateSettings, setViewingItem, requestMarkBought, removeItem } = useApp()
  const { augmentItems, getExitKind, completeExit, stageExit } = useExitAnimation()
  const budgetPulse = useBudgetPulse()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const summary = useBudgetPeriod(selectedMonth)
  const heroView = settings.budgetHeroView ?? 'actual'
  const [editOpen, setEditOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('month')
  const [resetDayInput, setResetDayInput] = useState('1')
  const [heldChartDay, setHeldChartDay] = useState<number | null>(null)
  const [fixedSheetOpen, setFixedSheetOpen] = useState(false)
  const [fixedDraft, setFixedDraft] = useState<FixedExpenseDraft | null>(null)

  const fixedTemplates = useMemo(
    () =>
      [...(settings.fixedExpenses ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
      ),
    [settings.fixedExpenses],
  )

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

  const openFixedAdd = () => {
    setFixedDraft({ name: '', amount: '', interval: 'month', dayOfMonth: '1' })
    setFixedSheetOpen(true)
  }

  const openFixedEdit = (expense: FixedExpense) => {
    const e = normalizeFixedExpense(expense)
    setFixedDraft({
      id: e.id,
      name: e.name,
      amount: String(e.amount),
      interval: e.interval,
      dayOfMonth: String(e.dayOfMonth),
    })
    setFixedSheetOpen(true)
  }

  const closeFixedSheet = () => {
    setFixedSheetOpen(false)
    setFixedDraft(null)
  }

  const saveFixedExpense = async () => {
    if (!fixedDraft) return
    const name = fixedDraft.name.trim()
    const amount = parseFloat(fixedDraft.amount)
    const dayOfMonth = Math.min(28, Math.max(1, parseInt(fixedDraft.dayOfMonth, 10) || 1))
    if (!name || isNaN(amount) || amount < 0) return

    const existing = settings.fixedExpenses ?? []
    if (fixedDraft.id) {
      const next = existing.map((e) =>
        e.id === fixedDraft.id
          ? { ...e, name, amount, interval: fixedDraft.interval, dayOfMonth }
          : e,
      )
      await updateSettings({ fixedExpenses: next })
    } else {
      const expense: FixedExpense = {
        id: crypto.randomUUID(),
        name,
        amount,
        interval: fixedDraft.interval,
        dayOfMonth,
        sortOrder: existing.length,
        createdAt: Date.now(),
      }
      await updateSettings({ fixedExpenses: [...existing, expense] })
    }
    closeFixedSheet()
  }

  const removeFixedExpense = async () => {
    if (!fixedDraft?.id) return
    const next = (settings.fixedExpenses ?? []).filter((e) => e.id !== fixedDraft.id)
    await updateSettings({ fixedExpenses: next })
    closeFixedSheet()
  }

  const fixedForProgress = heroView === 'actual' ? summary.fixedActual : summary.fixed

  const spentPercent = summary.hasBudget
    ? Math.min(100, (summary.spent / summary.budget) * 100)
    : 0
  const fixedPercent = summary.hasBudget
    ? Math.min(100 - spentPercent, (fixedForProgress / summary.budget) * 100)
    : 0
  const plannedPercent = summary.hasBudget && summary.period.isCurrent && heroView === 'projected'
    ? Math.min(100 - spentPercent - fixedPercent, (summary.planned / summary.budget) * 100)
    : 0

  const ringCircumference = 2 * Math.PI * 15.5
  const committedPercent = spentPercent + fixedPercent
  const spentDash = (committedPercent / 100) * ringCircumference
  const plannedDash = (plannedPercent / 100) * ringCircumference

  const hero = heroViewData(heroView, summary)

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

  const msPerDay = 86400000
  const visibleBoughtItems = heldChartDay != null
    ? summary.boughtItems.filter((item) => {
        if (item.boughtAt == null) return false
        const day = Math.min(
          summary.period.daysInPeriod,
          Math.floor((item.boughtAt - summary.period.startMs) / msPerDay) + 1,
        )
        return day === heldChartDay
      })
    : summary.boughtItems

  const affordableDisplay = useMemo(
    () => augmentItems(summary.affordable),
    [augmentItems, summary.affordable],
  )
  const reachLine = withinReachLine(summary.affordable.length)
  const reachEmptyLine = withinReachEmptyLine(
    summary.hasBudget,
    summary.affordable.length,
    summary.projectedRemaining,
  )

  const showDueDay =
    fixedDraft?.interval === 'month' || fixedDraft?.interval === 'year'

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
        <section className={`budget-hero-card ${budgetPulse ? 'budget-hero-pulse' : ''}`} aria-label="Budget summary">
          <div className="budget-hero-top">
            <div className="budget-hero-main">
              <p className="budget-hero-period">{summary.period.label}</p>

              <div className="budget-hero-view-tabs" role="tablist" aria-label="Budget view">
                {HERO_VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={heroView === v.id}
                    className={`budget-hero-view-tab ${heroView === v.id ? 'active' : ''}`}
                    onClick={() => {
                      vibrateTap()
                      void updateSettings({ budgetHeroView: v.id })
                    }}
                  >
                    {v.short}
                  </button>
                ))}
              </div>

              <p
                className="budget-hero-amount"
                style={{ color: hero.over ? 'var(--destructive)' : undefined }}
              >
                {summary.hasBudget || summary.spent > 0 || heroView === 'budget'
                  ? formatPrice(hero.amount, summary.currency)
                  : '—'}
              </p>
              <p className="budget-hero-label">{hero.label}</p>
              {summary.period.isCurrent && heroView === 'actual' && settings.fixedExpenseCounting === 'accrue' && summary.fixed > summary.fixedActual && (
                <p className="budget-hero-reach muted">
                  {formatPrice(summary.fixed - summary.fixedActual, summary.currency)} fixed costs still to accrue
                </p>
              )}
              {summary.period.isCurrent && reachLine && heroView === 'projected' && (
                <p className="budget-hero-reach">{reachLine}</p>
              )}
              {summary.period.isCurrent && reachEmptyLine && heroView === 'projected' && (
                <p className="budget-hero-reach muted">{reachEmptyLine}</p>
              )}
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
                <span className="budget-ring-label">{Math.round(committedPercent + plannedPercent)}%</span>
              </div>
            )}
          </div>

          {summary.hasBudget && (
            <div className="budget-progress" aria-hidden="true">
              <div className="budget-progress-spent" style={{ width: `${spentPercent}%` }} />
              <div
                className="budget-progress-fixed"
                style={{ width: `${fixedPercent}%`, left: `${spentPercent}%` }}
              />
              {summary.period.isCurrent && heroView === 'projected' && (
                <div
                  className="budget-progress-planned"
                  style={{
                    width: `${plannedPercent}%`,
                    left: `${spentPercent + fixedPercent}%`,
                  }}
                />
              )}
            </div>
          )}

          <div className="budget-stat-grid">
            <div className="budget-stat-cell budget-stat-budget">
              <span className="budget-stat-label">Budget</span>
              <span className="budget-stat-value">
                {summary.hasBudget ? formatPrice(summary.budget, summary.currency) : '—'}
              </span>
              {hasMonthOverride && (
                <span className="budget-stat-note">This month only</span>
              )}
            </div>
            <div className="budget-stat-cell budget-stat-spent">
              <span className="budget-stat-label">Spent</span>
              <span className="budget-stat-value">{formatPrice(summary.spent, summary.currency)}</span>
              <span className="budget-stat-note">{summary.spentCount} bought</span>
            </div>
            {(summary.fixed > 0 || fixedTemplates.length > 0) && (
              <div className="budget-stat-cell budget-stat-fixed">
                <span className="budget-stat-label">Fixed</span>
                <span className="budget-stat-value">{formatPrice(summary.fixed, summary.currency)}</span>
                <span className="budget-stat-note">
                  {summary.period.isCurrent && settings.fixedExpenseCounting === 'accrue'
                    ? `${formatPrice(summary.fixedActual, summary.currency)} accrued`
                    : `${summary.fixedCount || fixedTemplates.length} in period`}
                </span>
              </div>
            )}
            {summary.period.isCurrent && (
              <>
                <div className="budget-stat-cell budget-stat-planned">
                  <span className="budget-stat-label">On list</span>
                  <span className="budget-stat-value">{formatPrice(summary.planned, summary.currency)}</span>
                  <span className="budget-stat-note">{summary.plannedCount} planned</span>
                </div>
                <div className="budget-stat-cell budget-stat-days">
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
          periodStartMs={summary.period.startMs}
          currentDay={summary.period.dayIndex}
          isCurrentPeriod={summary.period.isCurrent}
          onDayHold={setHeldChartDay}
        />

        <section className="budget-section">
          <div className="budget-fixed-header">
            <h2 className="section-label section-label-accent">Fixed expenses</h2>
            <button type="button" className="budget-fixed-add" onClick={openFixedAdd}>
              Add
            </button>
          </div>
          {fixedTemplates.length === 0 ? (
            <p className="budget-fixed-empty">
              Rent, subscriptions, daily coffee — anything recurring, at any interval.
            </p>
          ) : (
            <div className="budget-fixed-list">
              {fixedTemplates.map((expense) => {
                const e = normalizeFixedExpense(expense)
                const periodTotal = getFixedExpensePeriodTotal(e, summary.period)
                return (
                  <button
                    key={expense.id}
                    type="button"
                    className="budget-fixed-row"
                    onClick={() => openFixedEdit(expense)}
                  >
                    <span
                      className="budget-fixed-interval"
                      style={{ background: fixedIntervalAccent(e.interval) }}
                      aria-hidden="true"
                    />
                    <div className="budget-fixed-body">
                      <div className="budget-fixed-name">{e.name}</div>
                      <div className="budget-fixed-meta">
                        {formatFixedExpenseMeta(e, periodTotal, summary.currency)}
                      </div>
                    </div>
                    <div className="budget-fixed-amount-col">
                      <span className="budget-fixed-amount">
                        {formatPrice(periodTotal, summary.currency)}
                      </span>
                      <span className="budget-fixed-rate">{formatFixedRate(e, summary.currency)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {summary.fixed > 0 && (
            <p className="budget-fixed-period-note">
              {formatPrice(summary.fixed, summary.currency)} total fixed costs this period.
            </p>
          )}
        </section>

        {visibleBoughtItems.length > 0 && (
          <section className="budget-section">
            <h2 className="section-label">
              {heldChartDay != null ? 'Purchases that day' : 'Spent this period'}
            </h2>
            <div className="item-list budget-spent-list">
              {visibleBoughtItems.slice(0, 12).map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onTap={() => setViewingItem(item)}
                  showBoughtDate
                />
              ))}
            </div>
            {visibleBoughtItems.length > 12 && (
              <p className="budget-more-note">
                +{visibleBoughtItems.length - 12} more purchase{visibleBoughtItems.length - 12 > 1 ? 's' : ''}
              </p>
            )}
          </section>
        )}

        {affordableDisplay.length > 0 && (
          <section className="budget-section">
            <h2 className="section-label">Within reach</h2>
            <div className="item-list">
              {affordableDisplay.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onTap={() => setViewingItem(item)}
                  onMarkBought={() => {
                    vibrateTap()
                    requestMarkBought(item)
                  }}
                  onRemove={() => stageExit(item, 'removed', () => removeItem(item.id))}
                  exiting={getExitKind(item.id)}
                  onExitComplete={() => completeExit(item.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!summary.hasBudget && (
          <div className="budget-empty-cta">
            <p>{budgetNoBudgetCopy()}</p>
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

      <Sheet
        open={fixedSheetOpen}
        onClose={closeFixedSheet}
        title={fixedDraft?.id ? 'Edit fixed expense' : 'Add fixed expense'}
      >
        {fixedDraft && (
          <>
            <div className="field">
              <label htmlFor="fixed-name">Name</label>
              <input
                id="fixed-name"
                type="text"
                placeholder="Rent, phone bill, coffee…"
                value={fixedDraft.name}
                onChange={(e) => setFixedDraft({ ...fixedDraft, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="fixed-amount">Amount ({settings.currency})</label>
              <input
                id="fixed-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={fixedDraft.amount}
                onChange={(e) => setFixedDraft({ ...fixedDraft, amount: e.target.value })}
              />
            </div>

            <div className="field">
              <span className="field-label">Repeats</span>
              <div className="budget-interval-grid">
                {FIXED_INTERVALS.map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    className={`budget-interval-btn ${fixedDraft.interval === interval ? 'active' : ''}`}
                    onClick={() => setFixedDraft({ ...fixedDraft, interval })}
                  >
                    {FIXED_INTERVAL_LABELS[interval]}
                  </button>
                ))}
              </div>
            </div>

            {showDueDay && (
              <div className="field">
                <label htmlFor="fixed-day">Due on day</label>
                <input
                  id="fixed-day"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="28"
                  value={fixedDraft.dayOfMonth}
                  onChange={(e) => setFixedDraft({ ...fixedDraft, dayOfMonth: e.target.value })}
                />
                <p className="budget-field-hint">
                  {fixedDraft.interval === 'year'
                    ? 'Annual charge on this day each year.'
                    : 'Counts once per calendar month when that day falls in your budget period.'}
                </p>
              </div>
            )}

            <button type="button" className="primary-btn" onClick={saveFixedExpense}>
              Save
            </button>

            {fixedDraft.id && (
              <button type="button" className="secondary-btn budget-destructive-btn" onClick={removeFixedExpense}>
                Remove
              </button>
            )}
          </>
        )}
      </Sheet>
    </>
  )
}
