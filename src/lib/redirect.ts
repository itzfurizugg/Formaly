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

export const PENDING_OTP_KEY = "formalyPendingOtp"
export const RESET_FLOW_KEY = "formalyResetFlow"

export function setPendingOtp(email: string) {
    sessionStorage.setItem(PENDING_OTP_KEY, email)
}

export function getPendingOtp(): string | null {
    return sessionStorage.getItem(PENDING_OTP_KEY)
}

export function clearPendingOtp() {
    sessionStorage.removeItem(PENDING_OTP_KEY)
}

export function setResetFlow() {
    sessionStorage.setItem(RESET_FLOW_KEY, "1")
}

export function clearResetFlow() {
    sessionStorage.removeItem(RESET_FLOW_KEY)
}

export function hasResetFlow(): boolean {
    return sessionStorage.getItem(RESET_FLOW_KEY) === "1"
}

