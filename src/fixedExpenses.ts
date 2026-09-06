import type {
  AdHocExpense,
  FixedExpense,
  FixedExpenseCounting,
  FixedExpenseInterval,
  RecurringExpenseActual,
  RecurringExpenseKind,
} from './types'
import { formatPrice, startOfDayMs } from './utils'

export interface FixedExpensePeriodContext {
  startMs: number
  endMs: number
  daysInPeriod: number
  dayIndex: number
  isCurrent: boolean
}

export const FIXED_INTERVALS: FixedExpenseInterval[] = ['day', 'week', 'month', 'year']

export const RECURRING_KIND_LABELS: Record<RecurringExpenseKind, string> = {
  fixed: 'Fixed',
  budgeted: 'Budgeted',
}

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

export function normalizeFixedExpense(
  expense: FixedExpense,
): FixedExpense & { interval: FixedExpenseInterval; kind: RecurringExpenseKind } {
  return {
    ...expense,
    interval: expense.interval ?? 'month',
    kind: expense.kind ?? 'fixed',
    dayOfMonth: expense.dayOfMonth ?? 1,
  }
}

export function inExpensePeriod(ts: number, period: FixedExpensePeriodContext): boolean {
  return ts >= period.startMs && ts < period.endMs
}

export function getAdHocInPeriod(
  expenses: AdHocExpense[],
  period: FixedExpensePeriodContext,
): AdHocExpense[] {
  return expenses
    .filter((e) => inExpensePeriod(e.spentAt, period))
    .sort((a, b) => b.spentAt - a.spentAt)
}

export function getRecurringActualsInPeriod(
  actuals: RecurringExpenseActual[],
  period: FixedExpensePeriodContext,
  expenseId?: string,
): RecurringExpenseActual[] {
  return actuals
    .filter((a) => inExpensePeriod(a.spentAt, period) && (expenseId == null || a.expenseId === expenseId))
    .sort((a, b) => b.spentAt - a.spentAt)
}

export function sumRecurringActuals(actuals: RecurringExpenseActual[]): number {
  return actuals.reduce((sum, a) => sum + a.amount, 0)
}

export interface BudgetSpendUnit {
  key: string
  label: string
  startMs: number
  defaultAmount: number
  amount: number
  isOverride: boolean
  overrideId?: string
}

const MS_PER_DAY = 86400000

function elapsedDaysInPeriod(period: FixedExpensePeriodContext, now = Date.now()): number {
  if (now < period.startMs) return 0
  if (now >= period.endMs) return period.daysInPeriod
  return Math.max(0, period.dayIndex)
}

export function recurringActualUnitKey(
  expense: FixedExpense,
  unitStartMs: number,
  periodStartMs: number,
): string {
  const e = normalizeFixedExpense(expense)
  switch (e.interval) {
    case 'day':
      return `day:${startOfDayMs(unitStartMs)}`
    case 'week': {
      const dayOffset = Math.floor((startOfDayMs(unitStartMs) - periodStartMs) / MS_PER_DAY)
      const weekIndex = Math.floor(dayOffset / 7)
      return `week:${periodStartMs}:${weekIndex}`
    }
    case 'month':
      return `month:${startOfDayMs(unitStartMs)}`
    case 'year':
      return `year:${new Date(unitStartMs).getFullYear()}`
    default:
      return `unit:${unitStartMs}`
  }
}

function resolveActualUnitKey(
  expense: FixedExpense,
  actual: RecurringExpenseActual,
  periodStartMs: number,
): string {
  if (actual.unitKey) return actual.unitKey
  return recurringActualUnitKey(expense, actual.spentAt, periodStartMs)
}

function overrideMapForExpense(
  expense: FixedExpense,
  actuals: RecurringExpenseActual[],
  periodStartMs: number,
): Map<string, RecurringExpenseActual> {
  const map = new Map<string, RecurringExpenseActual>()
  for (const actual of actuals) {
    if (actual.expenseId !== expense.id) continue
    const key = resolveActualUnitKey(expense, actual, periodStartMs)
    map.set(key, actual)
  }
  return map
}

function formatDayUnitLabel(startMs: number): string {
  return new Date(startMs).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatWeekUnitLabel(periodStartMs: number, weekIndex: number): string {
  const startMs = periodStartMs + weekIndex * 7 * MS_PER_DAY
  const endMs = startMs + 6 * MS_PER_DAY
  const start = new Date(startMs).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const end = new Date(endMs).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `Week ${weekIndex + 1} (${start}–${end})`
}

function monthOccurrencesInPeriod(expense: FixedExpense, period: FixedExpensePeriodContext): number[] {
  const e = normalizeFixedExpense(expense)
  const start = new Date(period.startMs)
  const end = new Date(period.endMs)
  let year = start.getFullYear()
  let month = start.getMonth()
  const endYear = end.getFullYear()
  const endMonth = end.getMonth()
  const dueTimes: number[] = []

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const day = Math.min(e.dayOfMonth, lastDay)
    const dueAt = new Date(year, month, day, 12, 0, 0, 0).getTime()
    if (dueAt >= period.startMs && dueAt < period.endMs) dueTimes.push(dueAt)
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return dueTimes
}

function yearOccurrencesInPeriod(expense: FixedExpense, period: FixedExpensePeriodContext): number[] {
  const e = normalizeFixedExpense(expense)
  const anchor = new Date(e.createdAt)
  const anchorMonth = anchor.getMonth()
  const startYear = new Date(period.startMs).getFullYear()
  const endYear = new Date(period.endMs - 1).getFullYear()
  const dueTimes: number[] = []

  for (let year = startYear; year <= endYear; year++) {
    const lastDay = new Date(year, anchorMonth + 1, 0).getDate()
    const day = Math.min(e.dayOfMonth, lastDay)
    const dueAt = new Date(year, anchorMonth, day, 12, 0, 0, 0).getTime()
    if (dueAt >= period.startMs && dueAt < period.endMs) dueTimes.push(dueAt)
  }
  return dueTimes
}

function buildSpendUnit(
  overrides: Map<string, RecurringExpenseActual>,
  key: string,
  label: string,
  startMs: number,
  defaultAmount: number,
): BudgetSpendUnit {
  const override = overrides.get(key)
  return {
    key,
    label,
    startMs,
    defaultAmount,
    amount: override?.amount ?? defaultAmount,
    isOverride: override != null,
    overrideId: override?.id,
  }
}

export function getBudgetSpendUnits(
  expense: FixedExpense,
  period: FixedExpensePeriodContext,
  actuals: RecurringExpenseActual[],
  now = Date.now(),
): BudgetSpendUnit[] {
  const e = normalizeFixedExpense(expense)
  if (e.kind !== 'budgeted') return []

  const overrides = overrideMapForExpense(e, actuals, period.startMs)
  const elapsedDays = elapsedDaysInPeriod(period, now)
  const units: BudgetSpendUnit[] = []

  switch (e.interval) {
    case 'day':
      for (let d = 0; d < elapsedDays; d++) {
        const startMs = period.startMs + d * MS_PER_DAY
        const key = recurringActualUnitKey(e, startMs, period.startMs)
        units.push(
          buildSpendUnit(overrides, key, formatDayUnitLabel(startMs), startMs, e.amount),
        )
      }
      break
    case 'week': {
      const elapsedWeeks = now >= period.endMs
        ? Math.floor(elapsedDays / 7)
        : period.dayIndex > 0
          ? Math.floor((period.dayIndex - 1) / 7) + 1
          : 0
      for (let w = 0; w < elapsedWeeks; w++) {
        const startMs = period.startMs + w * 7 * MS_PER_DAY
        const key = recurringActualUnitKey(e, startMs, period.startMs)
        units.push(
          buildSpendUnit(
            overrides,
            key,
            formatWeekUnitLabel(period.startMs, w),
            startMs,
            e.amount,
          ),
        )
      }
      break
    }
    case 'month':
      for (const dueAt of monthOccurrencesInPeriod(e, period)) {
        if (now >= period.startMs && now < period.endMs) {
          const nowDate = new Date(now)
          const dueDate = new Date(dueAt)
          if (
            dueDate.getFullYear() > nowDate.getFullYear()
            || (dueDate.getFullYear() === nowDate.getFullYear() && dueDate.getMonth() > nowDate.getMonth())
          ) {
            continue
          }
        } else if (dueAt >= now) {
          continue
        }
        const key = recurringActualUnitKey(e, dueAt, period.startMs)
        const label = new Date(dueAt).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        })
        units.push(buildSpendUnit(overrides, key, label, dueAt, e.amount))
      }
      break
    case 'year':
      for (const dueAt of yearOccurrencesInPeriod(e, period)) {
        if (now >= period.startMs && now < period.endMs) {
          if (new Date(dueAt).getFullYear() > new Date(now).getFullYear()) continue
        } else if (dueAt >= now) {
          continue
        }
        const key = recurringActualUnitKey(e, dueAt, period.startMs)
        const label = new Date(dueAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        units.push(buildSpendUnit(overrides, key, label, dueAt, e.amount))
      }
      break
    default:
      break
  }

  return units
}

export function getBudgetedExpenseSpent(
  expense: FixedExpense,
  period: FixedExpensePeriodContext,
  actuals: RecurringExpenseActual[],
  now = Date.now(),
): number {
  return getBudgetSpendUnits(expense, period, actuals, now).reduce((sum, unit) => sum + unit.amount, 0)
}

export function getBudgetedExpenseDefaultSpent(
  expense: FixedExpense,
  period: FixedExpensePeriodContext,
  now = Date.now(),
): number {
  return getBudgetSpendUnits(expense, period, [], now).reduce((sum, unit) => sum + unit.defaultAmount, 0)
}

export function formatBudgetUnitIntervalLabel(
  interval: FixedExpenseInterval,
  capitalize = false,
): string {
  let label: string
  switch (interval) {
    case 'day':
      label = 'day'
      break
    case 'week':
      label = 'week'
      break
    case 'month':
      label = 'month'
      break
    case 'year':
      label = 'year'
      break
    default:
      label = 'period'
  }
  return capitalize ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label
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
  if (e.kind === 'budgeted') return 0

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
  const short = FIXED_INTERVAL_SHORT[e.interval]
  const formatted = formatPrice(e.amount, currency)
  return `${formatted}/${short}`
}

export function formatFixedExpenseMeta(
  expense: FixedExpense,
  periodTotal: number,
  currency: string,
  actualSpent = 0,
): string {
  const e = normalizeFixedExpense(expense)
  const rate = formatFixedRate(e, currency)

  if (e.kind === 'budgeted') {
    return `${rate}. ${formatPrice(actualSpent, currency)} of ${formatPrice(periodTotal, currency)}`
  }

  const total = `${formatPrice(periodTotal, currency)} this period`
  if (e.interval === 'month' || e.interval === 'year') {
    return `${rate}, due day ${e.dayOfMonth}. ${total}`
  }
  return `${rate}. ${total}`
}
