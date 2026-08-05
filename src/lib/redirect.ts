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
