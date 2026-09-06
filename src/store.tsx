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
import type { AppSettings, Basket, CategoryFilter, CategoryId, Priority, WishlistItem } from './types'
import { summarizeBudgetPeriod, type MonthRef } from './budget'
import { PRIORITY_ORDER } from './types'

interface BoughtPrompt {
  mode: 'item' | 'basket'
  itemId?: string
  basketId?: string
  label: string
}

interface AppState {
  items: WishlistItem[]
  baskets: Basket[]
  settings: AppSettings
  loading: boolean
  categoryFilter: CategoryFilter
  addOpen: boolean
  addBasketId: string | null
  viewingItem: WishlistItem | null
  editingItem: WishlistItem | null
  viewingBasket: Basket | null
  selectionMode: boolean
  selectedIds: Set<string>
  basketCreatePending: boolean
  boughtPrompt: BoughtPrompt | null
  setCategoryFilter: (filter: CategoryFilter) => void
  setAddOpen: (open: boolean, basketId?: string | null) => void
  setViewingItem: (item: WishlistItem | null) => void
  setEditingItem: (item: WishlistItem | null) => void
  setViewingBasket: (basket: Basket | null) => void
  setSelectionMode: (on: boolean) => void
  toggleSelected: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setBasketCreatePending: (pending: boolean) => void
  requestMarkBought: (item: WishlistItem) => void
  requestMarkBasketBought: (basketId: string, label: string) => void
  confirmMarkBought: (boughtAt: number) => Promise<void>
  cancelMarkBought: () => void
  openEdit: (item: WishlistItem) => void
  addItem: (data: {
    title: string
    price?: number
    tag?: string
    category?: CategoryId
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
  markBasketBought: (basketId: string, boughtAt?: number) => Promise<void>
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [addOpen, setAddOpenState] = useState(false)
  const [addBasketId, setAddBasketId] = useState<string | null>(null)
  const [viewingItem, setViewingItem] = useState<WishlistItem | null>(null)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [viewingBasket, setViewingBasket] = useState<Basket | null>(null)
  const [selectionMode, setSelectionModeState] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [basketCreatePending, setBasketCreatePendingState] = useState(false)
  const [boughtPrompt, setBoughtPrompt] = useState<BoughtPrompt | null>(null)

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

  const setSelectionMode = useCallback((on: boolean) => {
    setSelectionModeState(on)
    if (!on) setSelectedIds(new Set())
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectionModeState(false)
  }, [])

  const setBasketCreatePending = useCallback((pending: boolean) => {
    setBasketCreatePendingState(pending)
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
      category?: CategoryId
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
        category: data.category,
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
      let boughtAt = existing.boughtAt
      if (patch.status === 'bought') {
        boughtAt = patch.boughtAt ?? Date.now()
      } else if (patch.status !== undefined) {
        boughtAt = undefined
      } else if (patch.boughtAt != null) {
        boughtAt = patch.boughtAt
      }
      const updated: WishlistItem = {
        ...existing,
        ...patch,
        boughtAt,
        updatedAt: Date.now(),
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
    async (basketId: string, boughtAt?: number) => {
      const ts = boughtAt ?? Date.now()
      const basketItems = items.filter(
        (i) => i.basketId === basketId && (i.status === 'queued' || i.status === 'ready'),
      )
      for (const item of basketItems) {
        await db.saveItem({
          ...item,
          status: 'bought',
          boughtAt: ts,
          updatedAt: Date.now(),
        })
      }
      await refresh()
    },
    [items, refresh],
  )

  const requestMarkBought = useCallback((item: WishlistItem) => {
    if (item.status === 'bought') return
    setBoughtPrompt({ mode: 'item', itemId: item.id, label: item.title })
  }, [])

  const requestMarkBasketBought = useCallback((basketId: string, label: string) => {
    setBoughtPrompt({ mode: 'basket', basketId, label })
  }, [])

  const cancelMarkBought = useCallback(() => {
    setBoughtPrompt(null)
  }, [])

  const confirmMarkBought = useCallback(
    async (boughtAt: number) => {
      if (!boughtPrompt) return
      const prompt = boughtPrompt
      setBoughtPrompt(null)
      if (prompt.mode === 'item' && prompt.itemId) {
        await updateItem(prompt.itemId, { status: 'bought', boughtAt })
      } else if (prompt.mode === 'basket' && prompt.basketId) {
        await markBasketBought(prompt.basketId, boughtAt)
      }
    },
    [boughtPrompt, updateItem, markBasketBought],
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
      categoryFilter,
      addOpen,
      addBasketId,
      viewingItem,
      editingItem,
      viewingBasket,
      selectionMode,
      selectedIds,
      basketCreatePending,
      boughtPrompt,
      setCategoryFilter,
      setAddOpen,
      setViewingItem,
      setEditingItem,
      setViewingBasket,
      setSelectionMode,
      toggleSelected,
      selectAll,
      clearSelection,
      setBasketCreatePending,
      requestMarkBought,
      requestMarkBasketBought,
      confirmMarkBought,
      cancelMarkBought,
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
      categoryFilter,
      addOpen,
      addBasketId,
      viewingItem,
      editingItem,
      viewingBasket,
      selectionMode,
      selectedIds,
      basketCreatePending,
      boughtPrompt,
      setAddOpen,
      requestMarkBought,
      requestMarkBasketBought,
      confirmMarkBought,
      cancelMarkBought,
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
  const { items, categoryFilter } = useApp()
  return useMemo(() => {
    return items.filter((item) => {
      if (item.status !== 'queued' && item.status !== 'ready') return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      return true
    })
  }, [items, categoryFilter])
}

export function useActiveItems() {
  const { items } = useApp()
  return useMemo(
    () => items.filter((i) => i.status === 'queued' || i.status === 'ready'),
    [items],
  )
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

export function useSelectedTotal(ids: Set<string>) {
  const { items, settings } = useApp()
  return useMemo(() => {
    const selected = items.filter((i) => ids.has(i.id))
    const priced = selected.filter((i) => i.price != null)
    const total = priced.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const unpriced = selected.length - priced.length
    return {
      total,
      count: selected.length,
      pricedCount: priced.length,
      unpriced,
      currency: settings.currency,
    }
  }, [ids, items, settings.currency])
}
export function useBudgetSummary() {
  const { items, settings } = useApp()
  return useMemo(() => {
    const active = items.filter((i) => i.status === 'queued' || i.status === 'ready')
    const listTotal = active.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const budget = settings.monthlyBudget ?? 0
    const remainder = budget - listTotal
    const unpriced = active.filter((i) => i.price == null).length
    const affordable = active
      .filter((i) => i.price != null)
      .filter((i) => budget > 0 && (i.price ?? 0) <= remainder)
    return {
      budget,
      listTotal,
      remainder,
      active,
      affordable,
      unpriced,
      hasBudget: budget > 0,
    }
  }, [items, settings.monthlyBudget])
}

export function useBudgetPeriod(month: MonthRef) {
  const { items, settings } = useApp()
  return useMemo(
    () => summarizeBudgetPeriod(items, settings, month),
    [items, settings, month.year, month.month],
  )
}
