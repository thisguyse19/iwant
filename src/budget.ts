import type { AppSettings, WishlistItem } from './types'

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

export interface BudgetPeriodSummary {
  period: BudgetPeriod
  budget: number
  spent: number
  planned: number
  remaining: number
  overBudget: boolean
  hasBudget: boolean
  spentCount: number
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

export function getDailySpending(
  items: WishlistItem[],
  period: BudgetPeriod,
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

  const boughtInPeriod = items.filter(
    (i) => i.status === 'bought' && inPeriod(i.boughtAt, period) && i.price != null,
  )
  const spent = boughtInPeriod.reduce((sum, i) => sum + (i.price ?? 0), 0)

  const active = items.filter((i) => i.status === 'queued' || i.status === 'ready')
  const planned = period.isCurrent
    ? active.reduce((sum, i) => sum + (i.price ?? 0), 0)
    : 0
  const unpricedActive = period.isCurrent ? active.filter((i) => i.price == null).length : 0

  const remaining = budget - spent - planned
  const dailySpend = getDailySpending(items, period)
  const maxDailySpend = Math.max(...dailySpend.map((d) => d.amount), 1)

  const affordable = period.isCurrent
    ? active
        .filter((i) => i.price != null)
        .filter((i) => budget > 0 && (i.price ?? 0) <= remaining)
    : []

  const boughtItems = [...items]
    .filter((i) => i.status === 'bought' && inPeriod(i.boughtAt, period))
    .sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0))

  return {
    period,
    budget,
    spent,
    planned,
    remaining,
    overBudget: budget > 0 && remaining < 0,
    hasBudget: budget > 0,
    spentCount: boughtInPeriod.length,
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
