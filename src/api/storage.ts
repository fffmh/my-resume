/** 基于 IndexedDB 的轻量 Promise 存储封装（keyPath: id） */

const DB_NAME = 'resumeGallery'
const DB_VERSION = 1
export const STORES = ['sections', 'templates', 'resumes', 'settings'] as const

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' })
          }
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<any>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = action(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function getAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll())
}

export function getOne<T>(store: string, id: string): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (s) => s.get(id))
}

export function putValue(store: string, value: unknown): Promise<void> {
  return run<void>(store, 'readwrite', (s) => s.put(value as never))
}

export function deleteValue(store: string, id: string): Promise<void> {
  return run<void>(store, 'readwrite', (s) => s.delete(id))
}

export function clearStore(store: string): Promise<void> {
  return run<void>(store, 'readwrite', (s) => s.clear())
}