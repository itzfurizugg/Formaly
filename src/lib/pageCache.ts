// Cache data halaman di memory supaya navigasi "kembali" tidak menampilkan
// overlay loading lagi (cukup fade-in/out halaman saja). Data tetap di-refresh
// diam-diam di background pada setiap mount. Cache di-clear saat logout.
const store = new Map<string, unknown>()

export function pageGet<T>(key: string): T | undefined {
    return store.get(key) as T | undefined
}

export function pageSet<T>(key: string, value: T) {
    store.set(key, value)
}

export function pageClear() {
    store.clear()
}
