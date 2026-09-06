import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WishlistItem } from './types'
import { vibrateBought, vibrateRemove } from './utils'

export type ExitKind = 'bought' | 'removed'

interface ExitState {
  item: WishlistItem
  kind: ExitKind
  onDone: () => void | Promise<void>
}

interface ExitAnimationContextValue {
  stageExit: (item: WishlistItem, kind: ExitKind, onDone: () => void | Promise<void>) => void
  getExitKind: (id: string) => ExitKind | null
  augmentItems: (items: WishlistItem[]) => WishlistItem[]
  completeExit: (id: string) => void
  budgetPulse: boolean
}

const ExitAnimationContext = createContext<ExitAnimationContextValue | null>(null)

export function ExitAnimationProvider({ children }: { children: ReactNode }) {
  const [exit, setExit] = useState<ExitState | null>(null)
  const [budgetPulse, setBudgetPulse] = useState(false)

  const stageExit = useCallback(
    (item: WishlistItem, kind: ExitKind, onDone: () => void | Promise<void>) => {
      if (kind === 'bought') vibrateBought()
      else vibrateRemove()
      setExit({ item, kind, onDone })
      if (kind === 'bought') {
        setBudgetPulse(true)
        window.setTimeout(() => setBudgetPulse(false), 520)
      }
    },
    [],
  )

  const completeExit = useCallback(
    (id: string) => {
      if (!exit || exit.item.id !== id) return
      const { onDone } = exit
      setExit(null)
      void onDone()
    },
    [exit],
  )

  const getExitKind = useCallback(
    (id: string) => (exit?.item.id === id ? exit.kind : null),
    [exit],
  )

  const augmentItems = useCallback(
    (items: WishlistItem[]) => {
      if (!exit) return items
      if (items.some((i) => i.id === exit.item.id)) return items
      return [...items, exit.item]
    },
    [exit],
  )

  const value = useMemo(
    () => ({
      stageExit,
      getExitKind,
      augmentItems,
      completeExit,
      budgetPulse,
    }),
    [stageExit, getExitKind, augmentItems, completeExit, budgetPulse],
  )

  return <ExitAnimationContext.Provider value={value}>{children}</ExitAnimationContext.Provider>
}

export function useExitAnimation() {
  const ctx = useContext(ExitAnimationContext)
  if (!ctx) throw new Error('useExitAnimation must be used within ExitAnimationProvider')
  return ctx
}

export function useBudgetPulse() {
  const ctx = useContext(ExitAnimationContext)
  return ctx?.budgetPulse ?? false
}

export function stageBoughtFromPrompt(
  stageExit: ExitAnimationContextValue['stageExit'],
  items: WishlistItem[],
  prompt: { mode: 'item' | 'basket'; itemId?: string },
  onConfirm: () => void | Promise<void>,
) {
  if (prompt.mode === 'item' && prompt.itemId) {
    const item = items.find((i) => i.id === prompt.itemId)
    if (item) {
      stageExit(item, 'bought', onConfirm)
      return true
    }
  }
  vibrateBought()
  void onConfirm()
  return false
}
