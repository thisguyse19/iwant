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
  status: ItemStatus
  sortOrder: number
  createdAt: number
  updatedAt: number
  boughtAt?: number
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

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'GBP',
  budgetResetDay: 1,
}
