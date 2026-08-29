// Cache data halaman supaya navigasi "kembali" tidak menampilkan overlay loading
// lagi (cukup fade-in/out halaman saja). Data tetap di-refresh diam-diam di
// background pada setiap mount.
//
// Panutan lama cuma Map in-memory, jadi tiap refresh browser cache hilang dan
// halaman menyala loading ulang (berkontribusi ke loading beruntun di /creator).
// Sekarang data ikut dipersist ke sessionStorage (bukan localStorage, biar
// otomatis bersih saat tab ditutup — sesuai sifat data dashboard yang
// session-scoped). Key tetap sama formatnya (`dashboard:${user.id}`, dll) supaya
// callers yang sudah ada tidak berubah. Cache di-clear saat logout.
const PREFIX = "formaly:page:"
const memory = new Map<string, unknown>()

// sessionStorage bisa tidak tersedia (SSR / private mode yang memblokir).
// Probe hanya membaca sekali; kalau throw, anggap tidak ada storage.
let storageRef: Storage | null | undefined
function storage(): Storage | null {
    if (storageRef !== undefined) return storageRef
    try {
        storageRef = typeof window !== "undefined" ? window.sessionStorage : null
    } catch {
        storageRef = null
    }
    return storageRef
}

export function pageGet<T>(key: string): T | undefined {
    if (memory.has(key)) return memory.get(key) as T

    const s = storage()
    if (!s) return undefined
    try {
        const raw = s.getItem(PREFIX + key)
        if (raw === null) return undefined
        const value = JSON.parse(raw) as T
        // Hidrasi ke memory jadi pembacaan berikutnya tidak perlu parse lagi.
        memory.set(key, value)
        return value
    } catch {
        // Data corrupt di storage: abaikan, treat sebagai cache kosong.
        return undefined
    }
}

export function pageSet<T>(key: string, value: T) {
    if (value === undefined) {
        // Invalidate: nilai undefined dipakai caller untuk menandai "hapus cache".
        memory.delete(key)
        const s = storage()
        if (!s) return
        try {
            s.removeItem(PREFIX + key)
        } catch {
            // Storage diblokir: biarkan; tidak terjadi apa-apa.
        }
        return
    }

    memory.set(key, value)
    const s = storage()
    if (!s) return
    try {
        s.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
        // Quota penuh / storage diblokir: cache memory tetap jalan, hanya saja
        // tidak bertahan antar refresh. Tidak perlu gagalkan operasi.
    }
}

export function pageClear() {
    memory.clear()
    const s = storage()
    if (!s) return
    try {
        const keysToRemove: string[] = []
        for (let i = 0; i < s.length; i++) {
            const k = s.key(i)
            if (k && k.startsWith(PREFIX)) keysToRemove.push(k)
        }
        keysToRemove.forEach((k) => s.removeItem(k))
    } catch {
        // Storage diblokir: tidak ada yang perlu dibersihkan.
    }
}