import { useMemo, useState } from 'react'
import { compareMonths, getCurrentMonth, getRecentMonths, shiftMonth } from '../budget'
import { budgetNoBudgetCopy, withinReachEmptyLine, withinReachLine } from '../copy'
import {
  FIXED_INTERVAL_LABELS,
  FIXED_INTERVALS,
  RECURRING_KIND_LABELS,
  formatFixedExpenseMeta,
  formatFixedRate,
  getFixedExpensePeriodTotal,
  getRecurringActualsInPeriod,
  normalizeFixedExpense,
  sumRecurringActuals,
} from '../fixedExpenses'
import { useExitAnimation, useBudgetPulse } from '../exitAnimation'
import { useApp, useBudgetPeriod } from '../store'
import { ItemRow } from '../components/ItemRow'
import { BudgetChart } from '../components/BudgetChart'
import { Sheet } from '../components/Sheet'
import { ScreenChrome } from '../components/ScreenChrome'
import type {
  AdHocExpense,
  BudgetHeroView,
  FixedExpense,
  FixedExpenseInterval,
  RecurringExpenseActual,
  RecurringExpenseKind,
} from '../types'
import { AmountInput } from '../components/AmountInput'
import { dateInputValue, formatPrice, vibrateTap } from '../utils'
import '../components/ItemRow.css'
import './BudgetScreen.css'

type BudgetScope = 'month' | 'default'

interface FixedExpenseDraft {
  id?: string
  name: string
  amount: string
  interval: FixedExpenseInterval
  kind: RecurringExpenseKind
  dayOfMonth: string
}

interface AdHocDraft {
  id?: string
  name: string
  amount: string
  spentAt: string
}

interface ActualDraft {
  expenseId: string
  amount: string
  spentAt: string
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
    const diff = summary.budget - summary.spent - summary.recurringCommitted
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
        amount: summary.spent + summary.recurringCommittedActual,
        label: [
          `${summary.spentCount} from list`,
          summary.adhocExpenses.length > 0 ? `${summary.adhocExpenses.length} ad hoc` : null,
        ].filter(Boolean).join(', '),
        over: false,
      }
    case 'budget':
      return {
        amount: summary.budget,
        label: `${formatPrice(summary.spent + summary.recurringCommittedActual, currency)} used`,
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
  const [adhocSheetOpen, setAdhocSheetOpen] = useState(false)
  const [adhocDraft, setAdhocDraft] = useState<AdHocDraft | null>(null)
  const [actualDraft, setActualDraft] = useState<ActualDraft | null>(null)

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
    setFixedDraft({ name: '', amount: '', interval: 'month', kind: 'fixed', dayOfMonth: '1' })
    setActualDraft(null)
    setFixedSheetOpen(true)
  }

  const openFixedEdit = (expense: FixedExpense) => {
    const e = normalizeFixedExpense(expense)
    setFixedDraft({
      id: e.id,
      name: e.name,
      amount: String(e.amount),
      interval: e.interval,
      kind: e.kind,
      dayOfMonth: String(e.dayOfMonth),
    })
    setActualDraft(
      e.kind === 'budgeted'
        ? { expenseId: e.id, amount: '', spentAt: dateInputValue(Date.now()) }
        : null,
    )
    setFixedSheetOpen(true)
  }

  const closeFixedSheet = () => {
    setFixedSheetOpen(false)
    setFixedDraft(null)
    setActualDraft(null)
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
          ? { ...e, name, amount, interval: fixedDraft.interval, kind: fixedDraft.kind, dayOfMonth }
          : e,
      )
      await updateSettings({ fixedExpenses: next })
    } else {
      const expense: FixedExpense = {
        id: crypto.randomUUID(),
        name,
        amount,
        interval: fixedDraft.interval,
        kind: fixedDraft.kind,
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
    const actuals = (settings.recurringActuals ?? []).filter((a) => a.expenseId !== fixedDraft.id)
    await updateSettings({ fixedExpenses: next, recurringActuals: actuals })
    closeFixedSheet()
  }

  const openAdhocAdd = () => {
    setAdhocDraft({ name: '', amount: '', spentAt: dateInputValue(Date.now()) })
    setAdhocSheetOpen(true)
  }

  const openAdhocEdit = (expense: AdHocExpense) => {
    setAdhocDraft({
      id: expense.id,
      name: expense.name,
      amount: String(expense.amount),
      spentAt: dateInputValue(expense.spentAt),
    })
    setAdhocSheetOpen(true)
  }

  const closeAdhocSheet = () => {
    setAdhocSheetOpen(false)
    setAdhocDraft(null)
  }

  const saveAdhocExpense = async () => {
    if (!adhocDraft) return
    const name = adhocDraft.name.trim()
    const amount = parseFloat(adhocDraft.amount)
    const spentAt = new Date(adhocDraft.spentAt).getTime()
    if (!name || isNaN(amount) || amount < 0 || isNaN(spentAt)) return

    const existing = settings.adHocExpenses ?? []
    if (adhocDraft.id) {
      const next = existing.map((e) =>
        e.id === adhocDraft.id ? { ...e, name, amount, spentAt } : e,
      )
      await updateSettings({ adHocExpenses: next })
    } else {
      const expense: AdHocExpense = {
        id: crypto.randomUUID(),
        name,
        amount,
        spentAt,
        createdAt: Date.now(),
      }
      await updateSettings({ adHocExpenses: [...existing, expense] })
    }
    closeAdhocSheet()
  }

  const removeAdhocExpense = async () => {
    if (!adhocDraft?.id) return
    const next = (settings.adHocExpenses ?? []).filter((e) => e.id !== adhocDraft.id)
    await updateSettings({ adHocExpenses: next })
    closeAdhocSheet()
  }

  const logRecurringActual = async () => {
    if (!actualDraft || !fixedDraft?.id) return
    const amount = parseFloat(actualDraft.amount)
    const spentAt = new Date(actualDraft.spentAt).getTime()
    if (isNaN(amount) || amount < 0 || isNaN(spentAt)) return

    const entry: RecurringExpenseActual = {
      id: crypto.randomUUID(),
      expenseId: fixedDraft.id,
      amount,
      spentAt,
      createdAt: Date.now(),
    }
    await updateSettings({ recurringActuals: [...(settings.recurringActuals ?? []), entry] })
    setActualDraft({ expenseId: fixedDraft.id, amount: '', spentAt: dateInputValue(Date.now()) })
  }

  const removeRecurringActual = async (id: string) => {
    const next = (settings.recurringActuals ?? []).filter((a) => a.id !== id)
    await updateSettings({ recurringActuals: next })
  }

  const recurringForProgress =
    heroView === 'actual' ? summary.recurringCommittedActual : summary.recurringCommitted

  const spentPercent = summary.hasBudget
    ? Math.min(100, ((summary.spent + recurringForProgress) / summary.budget) * 100)
    : 0
  const wishlistAdhocPercent = summary.hasBudget
    ? Math.min(spentPercent, (summary.spent / summary.budget) * 100)
    : 0
  const recurringPercent = summary.hasBudget
    ? Math.min(spentPercent - wishlistAdhocPercent, (recurringForProgress / summary.budget) * 100)
    : 0
  const plannedPercent = summary.hasBudget && summary.period.isCurrent && heroView === 'projected'
    ? Math.min(100 - spentPercent, (summary.planned / summary.budget) * 100)
    : 0

  const ringCircumference = 2 * Math.PI * 15.5
  const committedPercent = spentPercent
  const spentDash = (wishlistAdhocPercent / 100) * ringCircumference
  const recurringDash = (recurringPercent / 100) * ringCircumference
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

  const fixedSheetActuals =
    fixedDraft?.id && fixedDraft.kind === 'budgeted'
      ? getRecurringActualsInPeriod(settings.recurringActuals ?? [], summary.period, fixedDraft.id)
      : []

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
                  {formatPrice(summary.fixed - summary.fixedActual, summary.currency)} more in fixed bills this period
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
                      strokeDasharray: `${recurringDash} ${ringCircumference - recurringDash}`,
                      strokeDashoffset: -spentDash,
                    }}
                  />
                  {summary.period.isCurrent && heroView === 'projected' && (
                    <circle
                      className="budget-ring-planned budget-ring-list"
                      cx="18"
                      cy="18"
                      r="15.5"
                      style={{
                        strokeDasharray: `${plannedDash} ${ringCircumference - plannedDash}`,
                        strokeDashoffset: -(spentDash + recurringDash),
                      }}
                    />
                  )}
                </svg>
                <span className="budget-ring-label">{Math.round(committedPercent + plannedPercent)}%</span>
              </div>
            )}
          </div>

          {summary.hasBudget && (
            <div className="budget-progress" aria-hidden="true">
              <div className="budget-progress-spent" style={{ width: `${wishlistAdhocPercent}%` }} />
              <div
                className="budget-progress-fixed"
                style={{ width: `${recurringPercent}%`, left: `${wishlistAdhocPercent}%` }}
              />
              {summary.period.isCurrent && heroView === 'projected' && (
                <div
                  className="budget-progress-planned"
                  style={{
                    width: `${plannedPercent}%`,
                    left: `${wishlistAdhocPercent + recurringPercent}%`,
                  }}
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
              <span className="budget-stat-label">Out of pocket</span>
              <span className="budget-stat-value">{formatPrice(summary.spent, summary.currency)}</span>
              <span className="budget-stat-note">
                {summary.spentCount} from list
                {summary.adhocExpenses.length > 0 ? `, ${summary.adhocExpenses.length} ad hoc` : ''}
              </span>
            </div>
            {(summary.fixed > 0 || fixedTemplates.some((e) => normalizeFixedExpense(e).kind === 'fixed')) && (
              <div className="budget-stat-cell">
                <span className="budget-stat-label">Fixed bills</span>
                <span className="budget-stat-value">{formatPrice(summary.fixed, summary.currency)}</span>
                <span className="budget-stat-note">
                  {summary.period.isCurrent && settings.fixedExpenseCounting === 'accrue'
                    ? `${formatPrice(summary.fixedActual, summary.currency)} so far`
                    : `${summary.fixedCount} due`}
                </span>
              </div>
            )}
            {(summary.budgeted > 0 || fixedTemplates.some((e) => normalizeFixedExpense(e).kind === 'budgeted')) && (
              <div className="budget-stat-cell">
                <span className="budget-stat-label">Budgeted</span>
                <span className="budget-stat-value">{formatPrice(summary.budgetedActual, summary.currency)}</span>
                <span className="budget-stat-note">of {formatPrice(summary.budgeted, summary.currency)}</span>
              </div>
            )}
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
          periodStartMs={summary.period.startMs}
          currentDay={summary.period.dayIndex}
          isCurrentPeriod={summary.period.isCurrent}
          onDayHold={setHeldChartDay}
        />

        <section className="budget-section">
          <div className="budget-fixed-header">
            <h2 className="section-label">Ad-hoc</h2>
            <button type="button" className="budget-fixed-add" onClick={openAdhocAdd}>
              Add
            </button>
          </div>
          {summary.adhocExpenses.length === 0 ? (
            <p className="budget-fixed-empty">
              One-off spends that are not on your list. Parking, cash, extras.
            </p>
          ) : (
            <div className="budget-fixed-list">
              {summary.adhocExpenses.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  className="budget-fixed-row"
                  onClick={() => openAdhocEdit(expense)}
                >
                  <div className="budget-fixed-body">
                    <div className="budget-fixed-name">{expense.name}</div>
                    <div className="budget-fixed-meta">
                      {new Date(expense.spentAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <span className="budget-fixed-amount">
                    {formatPrice(expense.amount, summary.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="budget-section">
          <div className="budget-fixed-header">
            <h2 className="section-label">Recurring</h2>
            <button type="button" className="budget-fixed-add" onClick={openFixedAdd}>
              Add
            </button>
          </div>
          {fixedTemplates.length === 0 ? (
            <p className="budget-fixed-empty">
              Fixed bills like Netflix, or budgeted allowances like food. Log actuals for budgeted items.
            </p>
          ) : (
            <div className="budget-fixed-list">
              {fixedTemplates.map((expense) => {
                const e = normalizeFixedExpense(expense)
                const periodTotal = getFixedExpensePeriodTotal(e, summary.period)
                const actualSpent = sumRecurringActuals(
                  getRecurringActualsInPeriod(summary.recurringActuals, summary.period, e.id),
                )
                const displayAmount = e.kind === 'budgeted' ? actualSpent : periodTotal
                return (
                  <button
                    key={expense.id}
                    type="button"
                    className="budget-fixed-row"
                    onClick={() => openFixedEdit(expense)}
                  >
                    <div className="budget-fixed-body">
                      <div className="budget-fixed-name-row">
                        <span className="budget-fixed-name">{e.name}</span>
                        <span className={`budget-kind-pill budget-kind-${e.kind}`}>
                          {RECURRING_KIND_LABELS[e.kind]}
                        </span>
                      </div>
                      <div className="budget-fixed-meta">
                        {formatFixedExpenseMeta(e, periodTotal, summary.currency, actualSpent)}
                      </div>
                    </div>
                    <div className="budget-fixed-amount-col">
                      <span className="budget-fixed-amount">
                        {formatPrice(displayAmount, summary.currency)}
                      </span>
                      <span className="budget-fixed-rate">{formatFixedRate(e, summary.currency)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {summary.recurringCommitted > 0 && (
            <p className="budget-fixed-period-note">
              {formatPrice(summary.recurringCommitted, summary.currency)} recurring this period
              {summary.budgetedActual > 0
                ? `, ${formatPrice(summary.budgetedActual, summary.currency)} logged against budgets`
                : ''}
              .
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
        <AmountInput
          id="budget-amount"
          label={`Amount (${settings.currency})`}
          value={budgetInput}
          onChange={setBudgetInput}
          currency={settings.currency}
        />

        <p className="budget-sheet-period">{summary.period.label}</p>

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
        title={fixedDraft?.id ? 'Edit recurring' : 'Add recurring'}
      >
        {fixedDraft && (
          <>
            <AmountInput
              id="fixed-amount"
              label={`Amount (${settings.currency})`}
              value={fixedDraft.amount}
              onChange={(amount) => setFixedDraft({ ...fixedDraft, amount })}
              currency={settings.currency}
            />

            <div className="field">
              <label htmlFor="fixed-name">Name</label>
              <input
                id="fixed-name"
                type="text"
                placeholder="Netflix, food, rent…"
                value={fixedDraft.name}
                onChange={(e) => setFixedDraft({ ...fixedDraft, name: e.target.value })}
              />
            </div>

            <div className="field">
              <span className="field-label">Type</span>
              <div className="budget-interval-grid">
                {(['fixed', 'budgeted'] as RecurringExpenseKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`budget-interval-btn ${fixedDraft.kind === kind ? 'active' : ''}`}
                    onClick={() => {
                      const next = { ...fixedDraft, kind }
                      setFixedDraft(next)
                      if (kind === 'budgeted' && fixedDraft.id) {
                        setActualDraft({
                          expenseId: fixedDraft.id,
                          amount: '',
                          spentAt: dateInputValue(Date.now()),
                        })
                      } else if (kind === 'fixed') {
                        setActualDraft(null)
                      }
                    }}
                  >
                    {RECURRING_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
              <p className="budget-field-hint">
                {fixedDraft.kind === 'fixed'
                  ? 'A set bill, like a subscription.'
                  : 'An allowance you log actual spending against.'}
              </p>
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
                    ? 'Once a year on this day.'
                    : 'Once a month on this day.'}
                </p>
              </div>
            )}

            {fixedDraft.kind === 'budgeted' && fixedDraft.id && actualDraft && (
              <div className="budget-actual-log">
                <p className="budget-actual-log-title">Log actual spend</p>
                {fixedSheetActuals.length > 0 && (
                  <ul className="budget-actual-list">
                    {fixedSheetActuals.map((entry) => (
                      <li key={entry.id} className="budget-actual-row">
                        <span>
                          {new Date(entry.spentAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="budget-actual-amount">
                          {formatPrice(entry.amount, settings.currency)}
                        </span>
                        <button
                          type="button"
                          className="budget-actual-remove"
                          onClick={() => void removeRecurringActual(entry.id)}
                          aria-label="Remove entry"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <AmountInput
                  id="actual-amount"
                  label="Amount"
                  value={actualDraft.amount}
                  onChange={(amount) => setActualDraft({ ...actualDraft, amount })}
                  currency={settings.currency}
                  compact
                />
                <div className="field">
                  <label htmlFor="actual-date">Date</label>
                  <input
                    id="actual-date"
                    type="date"
                    value={actualDraft.spentAt}
                    onChange={(e) => setActualDraft({ ...actualDraft, spentAt: e.target.value })}
                  />
                </div>
                <button type="button" className="secondary-btn" onClick={() => void logRecurringActual()}>
                  Log spend
                </button>
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

      <Sheet
        open={adhocSheetOpen}
        onClose={closeAdhocSheet}
        title={adhocDraft?.id ? 'Edit ad-hoc expense' : 'Add ad-hoc expense'}
      >
        {adhocDraft && (
          <>
            <AmountInput
              id="adhoc-amount"
              label={`Amount (${settings.currency})`}
              value={adhocDraft.amount}
              onChange={(amount) => setAdhocDraft({ ...adhocDraft, amount })}
              currency={settings.currency}
            />

            <div className="field">
              <label htmlFor="adhoc-name">Name</label>
              <input
                id="adhoc-name"
                type="text"
                placeholder="Parking, tip, repair…"
                value={adhocDraft.name}
                onChange={(e) => setAdhocDraft({ ...adhocDraft, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="adhoc-date">Date</label>
              <input
                id="adhoc-date"
                type="date"
                value={adhocDraft.spentAt}
                onChange={(e) => setAdhocDraft({ ...adhocDraft, spentAt: e.target.value })}
              />
            </div>

            <button type="button" className="primary-btn" onClick={saveAdhocExpense}>
              Save
            </button>

            {adhocDraft.id && (
              <button type="button" className="secondary-btn budget-destructive-btn" onClick={removeAdhocExpense}>
                Remove
              </button>
            )}
          </>
        )}
      </Sheet>
    </>
  )
}
