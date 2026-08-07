export function loginUrl(next?: string): string {
    if (next && next.startsWith("/") && !next.startsWith("//")) {
        return `/login?next=${encodeURIComponent(next)}`
    }
    return "/login"
}

export function safeNext(value: string | null | undefined): string {
    if (value && value.startsWith("/") && !value.startsWith("//")) return value
    return "/"
}

// Deteksi subdomain creator (creator-formaly.vercel.app) untuk redirect
// otomatis ke /creator. Routing dilakukan di level React (bukan rewrite
// server) supaya SPA client-side routing tetap berjalan benar.
export function isCreatorSubdomain(): boolean {
    return typeof window !== "undefined" && window.location.hostname.startsWith("creator-formaly")
}

