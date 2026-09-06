import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings, Basket, WishlistItem } from './types'
import { DEFAULT_SETTINGS } from './types'

interface SettingsRecord {
  key: 'app'
  value: AppSettings
}

interface IwantDB extends DBSchema {
  items: {
    key: string
    value: WishlistItem
    indexes: {
      status: WishlistItem['status']
      sortOrder: number
      basketId: string
    }
  }
  baskets: {
    key: string
    value: Basket
    indexes: {
      sortOrder: number
    }
  }
  settings: {
    key: string
    value: SettingsRecord
  }
}

let dbPromise: Promise<IDBPDatabase<IwantDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<IwantDB>('iwant_db', 2, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('items')) {
          const store = db.createObjectStore('items', { keyPath: 'id' })
          store.createIndex('status', 'status')
          store.createIndex('sortOrder', 'sortOrder')
          store.createIndex('basketId', 'basketId')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('baskets')) {
          const basketStore = db.createObjectStore('baskets', { keyPath: 'id' })
          basketStore.createIndex('sortOrder', 'sortOrder')
        }
        if (oldVersion >= 1 && db.objectStoreNames.contains('items')) {
          const itemStore = transaction.objectStore('items')
          if (!itemStore.indexNames.contains('basketId')) {
            itemStore.createIndex('basketId', 'basketId')
          }
        }
      },
    })
  }
  return dbPromise
}

export async function getAllItems(): Promise<WishlistItem[]> {
  const db = await getDb()
  return db.getAll('items')
}

export async function saveItem(item: WishlistItem): Promise<void> {
  const db = await getDb()
  await db.put('items', item)
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('items', id)
}

export async function getAllBaskets(): Promise<Basket[]> {
  const db = await getDb()
  return db.getAll('baskets')
}

export async function saveBasket(basket: Basket): Promise<void> {
  const db = await getDb()
  await db.put('baskets', basket)
}

export async function deleteBasket(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('baskets', id)
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const stored = await db.get('settings', 'app')
  return stored?.value ?? DEFAULT_SETTINGS
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { key: 'app', value: settings })
}

export async function exportData(): Promise<string> {
  const [items, baskets, settings] = await Promise.all([
    getAllItems(),
    getAllBaskets(),
    getSettings(),
  ])
  return JSON.stringify({ version: 2, exportedAt: Date.now(), items, baskets, settings }, null, 2)
}

export async function importData(
  json: string,
  mode: 'merge' | 'replace',
): Promise<{ imported: number }> {
  const parsed = JSON.parse(json) as {
    items?: WishlistItem[]
    baskets?: Basket[]
    settings?: AppSettings
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Invalid file: missing items array')
  }

  const db = await getDb()

  if (mode === 'replace') {
    const existing = await db.getAll('items')
    await Promise.all(existing.map((item) => db.delete('items', item.id)))
    const existingBaskets = await db.getAll('baskets')
    await Promise.all(existingBaskets.map((b) => db.delete('baskets', b.id)))
  }

  const existingIds = new Set(
    mode === 'merge' ? (await db.getAll('items')).map((i) => i.id) : [],
  )

  let imported = 0
  for (const item of parsed.items) {
    if (mode === 'merge' && existingIds.has(item.id)) continue
    await db.put('items', item)
    imported++
  }

  if (parsed.baskets) {
    for (const basket of parsed.baskets) {
      await db.put('baskets', basket)
    }
  }

  if (parsed.settings) {
    await saveSettings(parsed.settings)
  }

  return { imported }
}

export async function getStorageEstimate(): Promise<string> {
  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate()
    if (usage != null) {
      const mb = usage / (1024 * 1024)
      return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`
    }
  }
  return 'Unknown'
}
