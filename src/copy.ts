/** Short, dry copy — stable per day, not chatty or motivational. */

function dayPick<T>(items: readonly T[]): T {
  const day = Math.floor(Date.now() / 86400000)
  return items[day % items.length]
}

export interface EmptyCopy {
  primary: string
  secondary?: string
}

const WISHLIST_EMPTY: readonly EmptyCopy[] = [
  { primary: 'Nothing on the list.', secondary: 'Add something when you mean it.' },
  { primary: 'Quiet for now.', secondary: 'The list is for things you still want.' },
  { primary: 'List is empty.', secondary: 'That counts too.' },
]

export function wishlistEmptyCopy(categoryFilter: string): EmptyCopy {
  if (categoryFilter !== 'all') {
    return { primary: 'Nothing in this category.' }
  }
  return dayPick(WISHLIST_EMPTY)
}

export function basketEmptyCopy(): EmptyCopy {
  return {
    primary: 'No baskets yet.',
    secondary: 'For stuff you buy in one go.',
  }
}

export function basketDetailEmptyCopy(all: boolean): EmptyCopy {
  if (all) {
    return { primary: 'This basket is empty.' }
  }
  return { primary: 'Nothing in this category.' }
}

export function budgetNoBudgetCopy(): string {
  return 'Set a budget if you want the numbers. The list works without one.'
}

export function withinReachLine(count: number): string | null {
  if (count <= 0) return null
  if (count === 1) return 'One thing on your list fits.'
  return `${count} on your list fit right now.`
}

export function withinReachEmptyLine(hasBudget: boolean, affordableCount: number, remaining: number): string | null {
  if (!hasBudget || affordableCount > 0 || remaining <= 0) return null
  return 'Nothing on the list fits at the moment.'
}
