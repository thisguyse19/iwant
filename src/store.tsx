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
import type { AppSettings, Basket, ListFilter, Priority, WishlistItem } from './types'
import { PRIORITY_ORDER } from './types'

interface AppState {
  items: WishlistItem[]
  baskets: Basket[]
  settings: AppSettings
  loading: boolean
  filter: ListFilter
  addOpen: boolean
  addBasketId: string | null
  viewingItem: WishlistItem | null
  editingItem: WishlistItem | null
  viewingBasket: Basket | null
  setFilter: (filter: ListFilter) => void
  setAddOpen: (open: boolean, basketId?: string | null) => void
  setViewingItem: (item: WishlistItem | null) => void
  setEditingItem: (item: WishlistItem | null) => void
  setViewingBasket: (basket: Basket | null) => void
  openEdit: (item: WishlistItem) => void
  addItem: (data: {
    title: string
    price?: number
    tag?: string
    priority?: Priority
    link?: string
    notes?: string
    imageUrl?: string
    basketId?: string
  }) => Promise<void>
  updateItem: (id: string, patch: Partial<WishlistItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  addBasket: (name: string) => Promise<Basket>
  updateBasket: (id: string, patch: Partial<Basket>) => Promise<void>
  removeBasket: (id: string) => Promise<void>
  markBasketBought: (basketId: string) => Promise<void>
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

function sortBaskets(baskets: Basket[]): Basket[] {
  return [...baskets].sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt - a.createdAt)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [settings, setSettings] = useState<AppSettings>({ currency: 'GBP', budgetResetDay: 1 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ListFilter>('active')
  const [addOpen, setAddOpenState] = useState(false)
  const [addBasketId, setAddBasketId] = useState<string | null>(null)
  const [viewingItem, setViewingItem] = useState<WishlistItem | null>(null)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [viewingBasket, setViewingBasket] = useState<Basket | null>(null)

  const refresh = useCallback(async () => {
    const [loadedItems, loadedBaskets, loadedSettings] = await Promise.all([
      db.getAllItems(),
      db.getAllBaskets(),
      db.getSettings(),
    ])
    const sorted = sortItems(loadedItems)
    const sortedBaskets = sortBaskets(loadedBaskets)
    setItems(sorted)
    setBaskets(sortedBaskets)
    setSettings(loadedSettings)
    setViewingItem((prev) => (prev ? sorted.find((i) => i.id === prev.id) ?? null : null))
    setEditingItem((prev) => (prev ? sorted.find((i) => i.id === prev.id) ?? null : null))
    setViewingBasket((prev) => (prev ? sortedBaskets.find((b) => b.id === prev.id) ?? null : null))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setAddOpen = useCallback((open: boolean, basketId?: string | null) => {
    setAddOpenState(open)
    setAddBasketId(open ? (basketId ?? null) : null)
  }, [])

  const openEdit = useCallback((item: WishlistItem) => {
    setViewingItem(null)
    setEditingItem(item)
  }, [])

  const addItem = useCallback(
    async (data: {
      title: string
      price?: number
      tag?: string
      priority?: Priority
      link?: string
      notes?: string
      imageUrl?: string
      basketId?: string
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
        imageUrl: data.imageUrl,
        basketId: data.basketId,
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
      setViewingItem(null)
      setEditingItem(null)
      await refresh()
    },
    [refresh],
  )

  const addBasket = useCallback(
    async (name: string) => {
      const now = Date.now()
      const basket: Basket = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        sortOrder: now,
      }
      await db.saveBasket(basket)
      await refresh()
      return basket
    },
    [refresh],
  )

  const updateBasket = useCallback(
    async (id: string, patch: Partial<Basket>) => {
      const existing = baskets.find((b) => b.id === id)
      if (!existing) return
      await db.saveBasket({ ...existing, ...patch, updatedAt: Date.now() })
      await refresh()
    },
    [baskets, refresh],
  )

  const removeBasket = useCallback(
    async (id: string) => {
      const basketItems = items.filter((i) => i.basketId === id)
      for (const item of basketItems) {
        await db.saveItem({ ...item, basketId: undefined, updatedAt: Date.now() })
      }
      await db.deleteBasket(id)
      setViewingBasket(null)
      await refresh()
    },
    [items, refresh],
  )

  const markBasketBought = useCallback(
    async (basketId: string) => {
      const basketItems = items.filter(
        (i) => i.basketId === basketId && (i.status === 'queued' || i.status === 'ready'),
      )
      for (const item of basketItems) {
        await db.saveItem({
          ...item,
          status: 'bought',
          boughtAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
      await refresh()
    },
    [items, refresh],
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
      baskets,
      settings,
      loading,
      filter,
      addOpen,
      addBasketId,
      viewingItem,
      editingItem,
      viewingBasket,
      setFilter,
      setAddOpen,
      setViewingItem,
      setEditingItem,
      setViewingBasket,
      openEdit,
      addItem,
      updateItem,
      removeItem,
      addBasket,
      updateBasket,
      removeBasket,
      markBasketBought,
      updateSettings,
      refresh,
      exportData,
      importData,
    }),
    [
      items,
      baskets,
      settings,
      loading,
      filter,
      addOpen,
      addBasketId,
      viewingItem,
      editingItem,
      viewingBasket,
      setAddOpen,
      openEdit,
      addItem,
      updateItem,
      removeItem,
      addBasket,
      updateBasket,
      removeBasket,
      markBasketBought,
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
    return items.filter((item) => {
      if (filter === 'active') return item.status === 'queued' || item.status === 'ready'
      if (filter === 'ready') return item.status === 'ready'
      return item.status === 'bought' || item.status === 'dropped'
    })
  }, [items, filter])
}

export function useListTotal(items: WishlistItem[]) {
  const { settings } = useApp()
  return useMemo(() => {
    const priced = items.filter((i) => i.price != null)
    const total = priced.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const unpriced = items.length - priced.length
    return { total, count: items.length, pricedCount: priced.length, unpriced, currency: settings.currency }
  }, [items, settings.currency])
}

export function useBasketItems(basketId: string) {
  const { items } = useApp()
  return useMemo(
    () => sortItems(items.filter((i) => i.basketId === basketId)),
    [items, basketId],
  )
}

export function useBasketTotal(basketId: string) {
  const basketItems = useBasketItems(basketId)
  return useListTotal(basketItems)
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
