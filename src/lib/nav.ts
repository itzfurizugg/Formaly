// Sumber tunggal aturan kapan Navbar umum tampil/sembunyi.
// Dipakai App.tsx (render navbar) dan BackButton (offset sticky)
// supaya keduanya tidak bisa saling beda.

const HIDE_NAV_PATHS = [
    "/login",
    "/register",
    "/auth",
    "/forgot-password",
    "/reset-password",
    "/form/description",
    "/form",
    "/form/list",
    "/form/result",
    "/credit",
]

/** Apakah Navbar umum dirender untuk path ini. */
export function isGeneralNavVisible(pathname: string, isMobile: boolean): boolean {
    const hidden =
        HIDE_NAV_PATHS.includes(pathname) ||
        /^\/form\/[^/]+$/.test(pathname) ||
        (isMobile && pathname.startsWith("/form/result"))
    return !hidden && !pathname.startsWith("/creator")
}

/** Ambang sama dengan useIsMobile() di App (breakpoint md). */
export function isMobileViewport(): boolean {
    return typeof window !== "undefined" ? window.innerWidth < 768 : false
}
