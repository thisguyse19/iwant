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
  { id: 'tech', label: 'Tech', color: '#0071e3', bg: 'rgba(0, 113, 227, 0.14)' },
  { id: 'essentials', label: 'Essentials', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.14)' },
  { id: 'clothing', label: 'Clothing', color: '#af52de', bg: 'rgba(175, 82, 222, 0.14)' },
  { id: 'home', label: 'Home', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.14)' },
  { id: 'health', label: 'Health', color: '#34c759', bg: 'rgba(52, 199, 89, 0.14)' },
  { id: 'food', label: 'Food', color: '#ff2d55', bg: 'rgba(255, 45, 85, 0.14)' },
  { id: 'other', label: 'Other', color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.14)' },
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

export interface AppSettings {
  monthlyBudget?: number
  /** Per-period overrides keyed by YYYY-MM */
  monthBudgets?: Record<string, number>
  currency: string
  budgetResetDay: number
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
