let offsetMs = 0
let synced = false
let syncing = false
let listeners: Array<(offset: number) => void> = []

function getSupabaseBaseUrl(): string | null {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    return url ?? null
}

export async function syncTime(): Promise<number> {
    if (syncing) return offsetMs
    syncing = true
    try {
        const baseUrl = getSupabaseBaseUrl()
        if (!baseUrl) return offsetMs

        const t0 = Date.now()
        const res = await fetch(baseUrl, { method: "HEAD", cache: "no-store" })
        const t1 = Date.now()
        const serverDate = res.headers.get("date")
        if (!serverDate) return offsetMs

        const serverTime = new Date(serverDate).getTime()
        const roundTrip = t1 - t0
        offsetMs = serverTime - t0 - Math.round(roundTrip / 2)
        synced = true
        listeners.forEach((fn) => fn(offsetMs))
    } catch {
        // network error — keep previous offset
    } finally {
        syncing = false
    }
    return offsetMs
}

export function initTimeSync() {
    syncTime()
    setInterval(syncTime, 5 * 60 * 1000)
}

export function onTimeSync(fn: (offset: number) => void): () => void {
    listeners.push(fn)
    return () => {
        listeners = listeners.filter((l) => l !== fn)
    }
}

export function networkNow(): number {
    return Date.now() + offsetMs
}

export function networkISOString(): string {
    return new Date(networkNow()).toISOString()
}

export function isTimeSynced(): boolean {
    return synced
}
