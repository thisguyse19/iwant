import type { FixedExpense, FixedExpenseCounting, FixedExpenseInterval } from './types'
import { formatPrice } from './utils'

export interface FixedExpensePeriodContext {
  startMs: number
  endMs: number
  daysInPeriod: number
  dayIndex: number
  isCurrent: boolean
}

export const FIXED_INTERVALS: FixedExpenseInterval[] = ['day', 'week', 'month', 'year']

export const FIXED_INTERVAL_LABELS: Record<FixedExpenseInterval, string> = {
  day: 'per day',
  week: 'per week',
  month: 'per month',
  year: 'per year',
}

export const FIXED_INTERVAL_SHORT: Record<FixedExpenseInterval, string> = {
  day: 'day',
  week: 'wk',
  month: 'mo',
  year: 'yr',
}

export function normalizeFixedExpense(expense: FixedExpense): FixedExpense & { interval: FixedExpenseInterval } {
  return {
    ...expense,
    interval: expense.interval ?? 'month',
    dayOfMonth: expense.dayOfMonth ?? 1,
  }
}

export function getFixedExpensePeriodTotal(expense: FixedExpense, period: FixedExpensePeriodContext): number {
  const e = normalizeFixedExpense(expense)
  switch (e.interval) {
    case 'day':
      return e.amount * period.daysInPeriod
    case 'week':
      return e.amount * (period.daysInPeriod / 7)
    case 'month':
      return e.amount * countMonthOccurrences(e, period)
    case 'year':
      return e.amount * countYearOccurrences(e, period)
    default:
      return e.amount
  }
}

function countMonthOccurrences(expense: FixedExpense, period: FixedExpensePeriodContext): number {
  const start = new Date(period.startMs)
  const end = new Date(period.endMs)
  let year = start.getFullYear()
  let month = start.getMonth()
  const endYear = end.getFullYear()
  const endMonth = end.getMonth()
  let count = 0

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const day = Math.min(expense.dayOfMonth, lastDay)
    const dueAt = new Date(year, month, day, 12, 0, 0, 0).getTime()
    if (dueAt >= period.startMs && dueAt < period.endMs) count += 1
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return count
}

function countYearOccurrences(expense: FixedExpense, period: FixedExpensePeriodContext): number {
  const anchor = new Date(expense.createdAt)
  const anchorMonth = anchor.getMonth()
  const startYear = new Date(period.startMs).getFullYear()
  const endYear = new Date(period.endMs - 1).getFullYear()
  let count = 0

  for (let year = startYear; year <= endYear; year++) {
    const lastDay = new Date(year, anchorMonth + 1, 0).getDate()
    const day = Math.min(expense.dayOfMonth, lastDay)
    const dueAt = new Date(year, anchorMonth, day, 12, 0, 0, 0).getTime()
    if (dueAt >= period.startMs && dueAt < period.endMs) count += 1
  }
  return count
}

export function getFixedExpenseAccrued(
  expense: FixedExpense,
  period: FixedExpensePeriodContext,
  counting: FixedExpenseCounting,
  now = Date.now(),
): number {
  const e = normalizeFixedExpense(expense)
  const total = getFixedExpensePeriodTotal(e, period)

  if (!period.isCurrent || now >= period.endMs) return total

  const dayIndex = period.dayIndex
  if (dayIndex <= 0) return 0

  switch (e.interval) {
    case 'day':
      return e.amount * dayIndex
    case 'week':
      return counting === 'lump'
        ? e.amount * Math.floor(dayIndex / 7)
        : e.amount * (dayIndex / 7)
    case 'month':
    case 'year':
      if (counting === 'lump') return total
      return total * (dayIndex / period.daysInPeriod)
    default:
      return total
  }
}

export function formatFixedRate(expense: FixedExpense, currency: string): string {
  const e = normalizeFixedExpense(expense)
  const short = FIXED_INTERVAL_SHORT[e.interval as FixedExpenseInterval]
  const formatted = formatPrice(e.amount, currency)
  return `${formatted}/${short}`
}

export function formatFixedExpenseMeta(
  expense: FixedExpense,
  periodTotal: number,
  currency: string,
): string {
  const e = normalizeFixedExpense(expense)
  const rate = formatFixedRate(e, currency)
  const total = `${formatPrice(periodTotal, currency)} this period`

  if (e.interval === 'month' || e.interval === 'year') {
    return `${rate}, due day ${e.dayOfMonth}. ${total}`
  }
  return `${rate}. ${total}`
}
