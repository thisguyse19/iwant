export type ItemStatus = 'queued' | 'ready' | 'bought' | 'dropped'
export type Priority = 'high' | 'medium' | 'low'

export interface WishlistItem {
  id: string
  title: string
  price?: number
  currency: string
  priority: Priority
  tag?: string
  notes?: string
  link?: string
  imageUrl?: string
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
  currency: string
  budgetResetDay: number
}

export type ListFilter = 'active' | 'ready' | 'done'

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const CURRENCIES = ['GBP', 'USD', 'EUR', 'SGD', 'AUD', 'CAD', 'JPY'] as const

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'GBP',
  budgetResetDay: 1,
}
