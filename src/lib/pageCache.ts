// Cache data halaman dengan TTL agar navigasi/reload tidak selalu mem-fetch
// ke Supabase. Data dikembalikan selama masih fresh (belum lewat TTL); setelah
// kedaluwarsa di-refetch sekali, lalu disimpan lagi. Persist ke sessionStorage
// supaya reload pada tab yang sama tetap memakai cache (bukan fetch ulang).
// Cache di-clear saat logout.
const PREFIX = "formaly:cache:"
const DEFAULT_TTL_MS = 60_000

interface Entry<T> {
    value: T
    expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

function readStored(key: string): Entry<unknown> | null {
    try {
        const raw = sessionStorage.getItem(PREFIX + key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Entry<unknown>
        if (parsed.expiresAt <= Date.now()) {
            sessionStorage.removeItem(PREFIX + key)
            return null
        }
        return parsed
    } catch {
        return null
    }
}

function writeStored(key: string, entry: Entry<unknown>) {
    try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(entry))
    } catch {
        // abaikan error kuota storage
    }
}

export function cacheGet<T>(key: string): T | undefined {
    let entry = store.get(key)
    if (!entry) {
        const stored = readStored(key)
        if (stored) {
            entry = stored
            store.set(key, entry)
        }
    }
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
        store.delete(key)
        sessionStorage.removeItem(PREFIX + key)
        return undefined
    }
    return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS) {
    const entry: Entry<T> = { value, expiresAt: Date.now() + ttlMs }
    store.set(key, entry)
    writeStored(key, entry)
}

export function cacheDelete(key: string) {
    store.delete(key)
    sessionStorage.removeItem(PREFIX + key)
}

export function cacheClear() {
    store.clear()
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k?.startsWith(PREFIX)) sessionStorage.removeItem(k)
    }
}

// Backward-compatible helpers (dipakai page-page lama).
export function pageGet<T>(key: string): T | undefined {
    return cacheGet<T>(key)
}

export function pageSet<T>(key: string, value: T, ttlMs?: number) {
    cacheSet(key, value, ttlMs)
}

export function pageClear() {
    cacheClear()
}
