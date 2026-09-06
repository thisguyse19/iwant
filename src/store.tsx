import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as db from './db'
import type { AppSettings, ListFilter, Priority, WishlistItem } from './types'
import { PRIORITY_ORDER } from './types'

interface AppState {
  items: WishlistItem[]
  settings: AppSettings
  loading: boolean
  filter: ListFilter
  addOpen: boolean
  editingItem: WishlistItem | null
  setFilter: (filter: ListFilter) => void
  setAddOpen: (open: boolean) => void
  setEditingItem: (item: WishlistItem | null) => void
  addItem: (data: {
    title: string
    price?: number
    tag?: string
    priority?: Priority
    link?: string
    notes?: string
  }) => Promise<void>
  updateItem: (id: string, patch: Partial<WishlistItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  refresh: () => Promise<void>
  exportData: () => Promise<string>
  importData: (json: string, mode: 'merge' | 'replace') => Promise<number>
}

const AppContext = createContext<AppState | null>(null)

function sortItems(items: WishlistItem[]): WishlistItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.sortOrder - b.sortOrder || b.createdAt - a.createdAt
  })
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [settings, setSettings] = useState<AppSettings>({ currency: 'GBP', budgetResetDay: 1 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ListFilter>('active')
  const [addOpen, setAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)

  const refresh = useCallback(async () => {
    const [loadedItems, loadedSettings] = await Promise.all([db.getAllItems(), db.getSettings()])
    setItems(sortItems(loadedItems))
    setSettings(loadedSettings)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addItem = useCallback(
    async (data: {
      title: string
      price?: number
      tag?: string
      priority?: Priority
      link?: string
      notes?: string
    }) => {
      const now = Date.now()
      const item: WishlistItem = {
        id: crypto.randomUUID(),
        title: data.title.trim(),
        price: data.price,
        currency: settings.currency,
        priority: data.priority ?? 'medium',
        tag: data.tag?.trim() || undefined,
        link: data.link?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        status: 'queued',
        sortOrder: now,
        createdAt: now,
        updatedAt: now,
      }
      await db.saveItem(item)
      await refresh()
    },
    [refresh, settings.currency],
  )

  const updateItem = useCallback(
    async (id: string, patch: Partial<WishlistItem>) => {
      const existing = items.find((i) => i.id === id)
      if (!existing) return
      const updated: WishlistItem = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
        boughtAt: patch.status === 'bought' ? Date.now() : existing.boughtAt,
      }
      await db.saveItem(updated)
      await refresh()
    },
    [items, refresh],
  )

  const removeItem = useCallback(
    async (id: string) => {
      await db.deleteItem(id)
      await refresh()
    },
    [refresh],
  )

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch }
      await db.saveSettings(next)
      setSettings(next)
    },
    [settings],
  )

  const exportData = useCallback(() => db.exportData(), [])

  const importData = useCallback(
    async (json: string, mode: 'merge' | 'replace') => {
      const { imported } = await db.importData(json, mode)
      await refresh()
      return imported
    },
    [refresh],
  )

  const value = useMemo(
    () => ({
      items,
      settings,
      loading,
      filter,
      addOpen,
      editingItem,
      setFilter,
      setAddOpen,
      setEditingItem,
      addItem,
      updateItem,
      removeItem,
      updateSettings,
      refresh,
      exportData,
      importData,
    }),
    [
      items,
      settings,
      loading,
      filter,
      addOpen,
      editingItem,
      addItem,
      updateItem,
      removeItem,
      updateSettings,
      refresh,
      exportData,
      importData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useFilteredItems() {
  const { items, filter } = useApp()
  return useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter === 'active') return item.status === 'queued' || item.status === 'ready'
      if (filter === 'ready') return item.status === 'ready'
      return item.status === 'bought' || item.status === 'dropped'
    })
    return filtered
  }, [items, filter])
}

export function useBudgetSummary() {
  const { items, settings } = useApp()
  return useMemo(() => {
    const ready = items.filter((i) => i.status === 'ready')
    const queued = items.filter((i) => i.status === 'queued')
    const readyTotal = ready.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const queuedTotal = queued.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const budget = settings.monthlyBudget ?? 0
    const remainder = budget - readyTotal
    const unpricedReady = ready.filter((i) => i.price == null).length
    const unpricedQueued = queued.filter((i) => i.price == null).length
    const affordable = ready
      .filter((i) => i.price != null)
      .filter((i) => {
        if (!budget) return false
        return (i.price ?? 0) <= remainder
      })
    return {
      budget,
      readyTotal,
      queuedTotal,
      remainder,
      ready,
      queued,
      affordable,
      unpricedReady,
      unpricedQueued,
      hasBudget: budget > 0,
    }
  }, [items, settings.monthlyBudget])
}
