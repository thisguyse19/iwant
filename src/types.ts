export type ItemStatus = 'queued' | 'ready' | 'bought' | 'dropped'
export type Priority = 'high' | 'medium' | 'low'

export type CategoryId =
  | 'tech'
  | 'essentials'
  | 'clothing'
  | 'home'
  | 'health'
  | 'food'
  | 'other'

export interface CategoryDef {
  id: CategoryId
  label: string
  color: string
  bg: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'tech', label: 'Tech', color: '#3d5a80', bg: 'rgba(61, 90, 128, 0.12)' },
  { id: 'essentials', label: 'Essentials', color: '#5c6b73', bg: 'rgba(92, 107, 115, 0.12)' },
  { id: 'clothing', label: 'Clothing', color: '#8b6f6f', bg: 'rgba(139, 111, 111, 0.12)' },
  { id: 'home', label: 'Home', color: '#a67c52', bg: 'rgba(166, 124, 82, 0.12)' },
  { id: 'health', label: 'Health', color: '#5a7a5e', bg: 'rgba(90, 122, 94, 0.12)' },
  { id: 'food', label: 'Food', color: '#9a6b4a', bg: 'rgba(154, 107, 74, 0.12)' },
  { id: 'other', label: 'Other', color: '#7a7570', bg: 'rgba(122, 117, 112, 0.12)' },
]

export function getCategory(id?: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export interface Basket {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  sortOrder: number
}

export interface WishlistItem {
  id: string
  title: string
  price?: number
  currency: string
  priority: Priority
  category?: CategoryId
  tag?: string
  notes?: string
  link?: string
  imageUrl?: string
  basketId?: string
  status: ItemStatus
  sortOrder: number
  createdAt: number
  updatedAt: number
  boughtAt?: number
}

export interface SearchSuggestion {
  title: string
  description?: string
  imageUrl?: string
  link?: string
  source?: 'local' | 'web'
}

export type FixedExpenseInterval = 'day' | 'week' | 'month' | 'year'

export interface FixedExpense {
  id: string
  name: string
  amount: number
  /** How often this amount recurs */
  interval?: FixedExpenseInterval
  /** Day of month the expense is due (1–28), for month/year intervals */
  dayOfMonth: number
  sortOrder: number
  createdAt: number
}

export type FixedExpenseCounting = 'accrue' | 'lump'
export type BudgetHeroView = 'actual' | 'projected' | 'spent' | 'budget'
export type AccentStyle = 'slate' | 'terracotta' | 'forest'

export interface AppSettings {
  monthlyBudget?: number
  /** Per-period overrides keyed by YYYY-MM */
  monthBudgets?: Record<string, number>
  fixedExpenses?: FixedExpense[]
  /** Spread monthly fixed costs daily, or deduct full amount at period start */
  fixedExpenseCounting?: FixedExpenseCounting
  /** Default view on the budget hero card */
  budgetHeroView?: BudgetHeroView
  currency: string
  budgetResetDay: number
  accentStyle?: AccentStyle
  showWishlistImages?: boolean
  hapticFeedback?: boolean
}

export type CategoryFilter = CategoryId | 'all'

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const PRIORITY_PILL = {
  high: { label: 'High', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.12)' },
  medium: { label: '', color: '', bg: '' },
  low: { label: '', color: '', bg: '' },
} as const

export const CURRENCIES = ['GBP', 'USD', 'EUR', 'SGD', 'AUD', 'CAD', 'JPY'] as const

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'GBP',
  budgetResetDay: 1,
}
