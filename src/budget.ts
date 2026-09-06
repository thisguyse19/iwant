import type { AppSettings, FixedExpense, WishlistItem } from './types'
import {
  getFixedExpenseAccrued,
  getFixedExpensePeriodTotal,
  normalizeFixedExpense,
} from './fixedExpenses'

export interface MonthRef {
  year: number
  month: number
}

export interface BudgetPeriod extends MonthRef {
  key: string
  label: string
  shortLabel: string
  rangeLabel: string
  startMs: number
  endMs: number
  isCurrent: boolean
  daysInPeriod: number
  dayIndex: number
  daysRemaining: number
}

export interface DailySpend {
  day: number
  amount: number
  label: string
  itemCount: number
  items: Array<{ id: string; title: string; price?: number; currency: string }>
}

export interface FixedExpenseEntry {
  expense: FixedExpense
  dueAt: number
}

export interface BudgetPeriodSummary {
  period: BudgetPeriod
  budget: number
  spent: number
  fixed: number
  fixedActual: number
  fixedEntries: FixedExpenseEntry[]
  planned: number
  remaining: number
  actualRemaining: number
  projectedRemaining: number
  overBudget: boolean
  overBudgetActual: boolean
  hasBudget: boolean
  spentCount: number
  fixedCount: number
  plannedCount: number
  unpricedActive: number
  dailySpend: DailySpend[]
  maxDailySpend: number
  boughtItems: WishlistItem[]
  affordable: WishlistItem[]
  active: WishlistItem[]
  currency: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getCurrentMonth(): MonthRef {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function compareMonths(a: MonthRef, b: MonthRef): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month
}

export function getRecentMonths(count = 6, anchor = getCurrentMonth()): MonthRef[] {
  const months: MonthRef[] = []
  for (let i = count - 1; i >= 0; i--) {
    months.push(shiftMonth(anchor, -i))
  }
  return months
}

function periodBounds(year: number, month: number, resetDay: number): { start: Date; end: Date } {
  if (resetDay <= 1) {
    return {
      start: new Date(year, month - 1, 1, 0, 0, 0, 0),
      end: new Date(year, month, 1, 0, 0, 0, 0),
    }
  }
  const start = new Date(year, month - 1, resetDay, 0, 0, 0, 0)
  const end = new Date(year, month, resetDay, 0, 0, 0, 0)
  return { start, end }
}

function formatRangeDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function getBudgetPeriod(month: MonthRef, resetDay: number, now = Date.now()): BudgetPeriod {
  const { start, end } = periodBounds(month.year, month.month, resetDay)
  const startMs = start.getTime()
  const endMs = end.getTime()
  const msPerDay = 86400000
  const daysInPeriod = Math.max(1, Math.round((endMs - startMs) / msPerDay))
  const current = getCurrentMonth()
  const isCurrent = month.year === current.year && month.month === current.month

  let dayIndex = 0
  let daysRemaining = 0
  if (now >= startMs && now < endMs) {
    dayIndex = Math.min(daysInPeriod, Math.floor((now - startMs) / msPerDay) + 1)
    daysRemaining = Math.max(0, daysInPeriod - dayIndex)
  } else if (now >= endMs) {
    dayIndex = daysInPeriod
  }

  const endDisplay = new Date(endMs - 1)

  return {
    ...month,
    key: monthKey(month),
    label: `${MONTH_NAMES[month.month - 1]} ${month.year}`,
    shortLabel: MONTH_SHORT[month.month - 1],
    rangeLabel: `${formatRangeDate(start)} – ${formatRangeDate(endDisplay)}`,
    startMs,
    endMs,
    isCurrent,
    daysInPeriod,
    dayIndex,
    daysRemaining,
  }
}

export function getBudgetForPeriod(settings: AppSettings, periodKey: string): number {
  return settings.monthBudgets?.[periodKey] ?? settings.monthlyBudget ?? 0
}

function inPeriod(ts: number | undefined, period: BudgetPeriod): boolean {
  if (ts == null) return false
  return ts >= period.startMs && ts < period.endMs
}

/** Fixed expenses due within a budget period (month/year intervals). */
export function getFixedExpenseEntries(
  expenses: FixedExpense[],
  period: BudgetPeriod,
): FixedExpenseEntry[] {
  if (!expenses.length) return []

  const start = new Date(period.startMs)
  const end = new Date(period.endMs)
  let year = start.getFullYear()
  let month = start.getMonth()
  const endYear = end.getFullYear()
  const endMonth = end.getMonth()

  const entries: FixedExpenseEntry[] = []

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    for (const expense of expenses) {
      const e = normalizeFixedExpense(expense)
      if (e.interval !== 'month' && e.interval !== 'year') continue

      if (e.interval === 'year') {
        const anchor = new Date(e.createdAt)
        if (month !== anchor.getMonth()) continue
      }

      const day = Math.min(e.dayOfMonth, lastDay)
      const dueAt = new Date(year, month, day, 12, 0, 0, 0).getTime()
      if (dueAt >= period.startMs && dueAt < period.endMs) {
        entries.push({ expense: e, dueAt })
      }
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return entries.sort((a, b) => a.dueAt - b.dueAt)
}

export function getDailySpending(
  items: WishlistItem[],
  period: BudgetPeriod,
  fixedExpenses: FixedExpense[] = [],
): DailySpend[] {
  const { startMs, endMs, daysInPeriod } = period
  const msPerDay = 86400000
  const buckets = Array.from({ length: daysInPeriod }, (_, i) => ({
    day: i + 1,
    amount: 0,
    label: String(i + 1),
    itemCount: 0,
    items: [] as DailySpend['items'],
  }))

  for (const item of items) {
    if (item.status !== 'bought' || item.boughtAt == null || item.price == null) continue
    if (item.boughtAt < startMs || item.boughtAt >= endMs) continue
    const index = Math.min(daysInPeriod - 1, Math.floor((item.boughtAt - startMs) / msPerDay))
    buckets[index].amount += item.price
    buckets[index].itemCount += 1
    buckets[index].items.push({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
    })
  }

  for (const expense of fixedExpenses) {
    const e = normalizeFixedExpense(expense)
    if (e.interval === 'day') {
      for (let i = 0; i < daysInPeriod; i++) {
        buckets[i].amount += e.amount
        buckets[i].itemCount += 1
        buckets[i].items.push({
          id: e.id,
          title: e.name,
          price: e.amount,
          currency: '',
        })
      }
    } else if (e.interval === 'week') {
      for (let i = 0; i < daysInPeriod; i += 7) {
        buckets[i].amount += e.amount
        buckets[i].itemCount += 1
        buckets[i].items.push({
          id: e.id,
          title: e.name,
          price: e.amount,
          currency: '',
        })
      }
    } else {
      const entries = getFixedExpenseEntries([e], period)
      for (const { expense: fixed, dueAt } of entries) {
        const index = Math.min(daysInPeriod - 1, Math.floor((dueAt - startMs) / msPerDay))
        buckets[index].amount += fixed.amount
        buckets[index].itemCount += 1
        buckets[index].items.push({
          id: fixed.id,
          title: fixed.name,
          price: fixed.amount,
          currency: '',
        })
      }
    }
  }

  return buckets
}

export function summarizeBudgetPeriod(
  items: WishlistItem[],
  settings: AppSettings,
  month: MonthRef,
): BudgetPeriodSummary {
  const period = getBudgetPeriod(month, settings.budgetResetDay)
  const budget = getBudgetForPeriod(settings, period.key)
  const currency = settings.currency
  const counting = settings.fixedExpenseCounting ?? 'lump'

  const boughtInPeriod = items.filter(
    (i) => i.status === 'bought' && inPeriod(i.boughtAt, period) && i.price != null,
  )
  const spent = boughtInPeriod.reduce((sum, i) => sum + (i.price ?? 0), 0)

  const fixedExpenses = [...(settings.fixedExpenses ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  )

  let fixed = 0
  let fixedActual = 0
  for (const expense of fixedExpenses) {
    fixed += getFixedExpensePeriodTotal(expense, period)
    fixedActual += getFixedExpenseAccrued(expense, period, counting)
  }

  const fixedEntries = getFixedExpenseEntries(fixedExpenses, period)

  const active = items.filter((i) => i.status === 'queued' || i.status === 'ready')
  const planned = period.isCurrent
    ? active.reduce((sum, i) => sum + (i.price ?? 0), 0)
    : 0
  const unpricedActive = period.isCurrent ? active.filter((i) => i.price == null).length : 0

  const projectedRemaining = budget - spent - fixed - planned
  const actualRemaining = budget - spent - fixedActual
  const remaining = projectedRemaining
  const dailySpend = getDailySpending(items, period, fixedExpenses)
  const maxDailySpend = Math.max(...dailySpend.map((d) => d.amount), 1)

  const affordable = period.isCurrent
    ? active
        .filter((i) => i.price != null)
        .filter((i) => budget > 0 && (i.price ?? 0) <= projectedRemaining)
    : []

  const boughtItems = [...items]
    .filter((i) => i.status === 'bought' && inPeriod(i.boughtAt, period))
    .sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0))

  return {
    period,
    budget,
    spent,
    fixed,
    fixedActual,
    fixedEntries,
    planned,
    remaining,
    actualRemaining,
    projectedRemaining,
    overBudget: budget > 0 && projectedRemaining < 0,
    overBudgetActual: budget > 0 && actualRemaining < 0,
    hasBudget: budget > 0,
    spentCount: boughtInPeriod.length,
    fixedCount: fixedEntries.length,
    plannedCount: period.isCurrent ? active.length : 0,
    unpricedActive,
    dailySpend,
    maxDailySpend,
    boughtItems,
    affordable,
    active,
    currency,
  }
}
