import { useCallback, useEffect, useRef, useState } from "react"
import { cacheGet, cacheSet, cacheDelete } from "./pageCache"

interface UseCachedDataOptions {
    /** Berapa lama cache dianggap fresh (ms). Default 60 detik. */
    ttlMs?: number
    /** Set false untuk sementara tidak men-fetch (mis. user belum login). */
    enabled?: boolean
}

interface UseCachedDataResult<T> {
    data: T | undefined
    loading: boolean
    /** Paksa refetch (abaikan cache) lalu perbarui cache. */
    refresh: () => Promise<void>
    /** Bersihkan cache key ini (dipakai setelah mutasi data). */
    invalidate: () => void
}

/**
 * Ambil data sekali dan pakai cache selama masih fresh. Jika cache fresh,
 * hook TIDAK men-fetch ke Supabase sama sekali. Jika kedaluwarsa/tidak ada,
 * fetch lalu simpan dengan TTL. Cocok untuk menggantikan pola:
 * `useState(pageGet)` + useEffect yang selalu fetch di tiap mount.
 */
export function useCachedData<T>(
    key: string | null | undefined,
    fetcher: () => Promise<T>,
    options: UseCachedDataOptions = {}
): UseCachedDataResult<T> {
    const { ttlMs = 60_000, enabled = true } = options
    const [data, setData] = useState<T | undefined>(() => (key ? cacheGet<T>(key) : undefined))
    const [loading, setLoading] = useState(() => (key ? cacheGet<T>(key) === undefined : false))
    const fetcherRef = useRef(fetcher)
    useEffect(() => {
        fetcherRef.current = fetcher
    }, [fetcher])

    const refresh = useCallback(async () => {
        if (!key || !enabled) return
        setLoading(true)
        try {
            const value = await fetcherRef.current()
            cacheSet(key, value, ttlMs)
            setData(value)
        } finally {
            setLoading(false)
        }
    }, [key, enabled, ttlMs])

    const invalidate = useCallback(() => {
        if (!key) return
        cacheDelete(key)
        setData(undefined)
        setLoading(true)
    }, [key])

    useEffect(() => {
        if (!enabled || !key) return
        // Hanya fetch jika tidak ada cache fresh.
        const cached = cacheGet<T>(key)
        if (cached === undefined) {
            refresh()
        } else {
            setData(cached)
            setLoading(false)
        }
    }, [key, enabled, refresh])

    return { data, loading, refresh, invalidate }
}

export default useCachedData
