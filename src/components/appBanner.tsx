import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { Capacitor } from "@capacitor/core"
import { Smartphone, X } from "lucide-react"

const DISMISS_KEY = "formaly:appbanner:dismissedAt"
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

const HIDE_PATHS = ["/login", "/register", "/auth", "/forgot-password", "/reset-password"]

// Banner "Buka di Apps" untuk pengunjung web (bukan di dalam app native).
// Tombol membuka link plain https ke domain → App Links (Android) / Universal
// Links (iOS) yang sudah dideklarasikan lalu membuka aplikasi jika terpasang.
function AppBanner() {
    const { pathname } = useLocation()
    const [dismissed, setDismissed] = useState<boolean>(() => {
        const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
        return ts > Date.now()
    })
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    // Jangan tampilkan di dalam app native (Capacitor/WebView).
    if (Capacitor.isNativePlatform()) return null
    if (!mounted) return null
    if (HIDE_PATHS.includes(pathname)) return null
    if (dismissed) return null

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS))
        setDismissed(true)
    }

    const origin = typeof window !== "undefined" ? window.location.origin : ""

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-x-0 z-40 flex justify-center px-4 bottom-20 sm:bottom-24 md:bottom-6"
        >
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(57,62,70,0.25)] py-3 pl-3 pr-2 w-full max-w-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800">
                    <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-darks leading-tight">Formaly</p>
                    <p className="text-xs text-tinted leading-tight mt-0.5">Buka di apps biar makin nyaman.</p>
                </div>
                <a
                    href={origin}
                    className="btn btn-sm bg-darks text-base border-none hover:opacity-90 transition-opacity rounded-full"
                >
                    Buka di Apps
                </a>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Tutup banner"
                    title="Tutup"
                    className="shrink-0 rounded-full p-1.5 text-tinted hover:text-darks hover:bg-second transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </motion.div>
    )
}

export default AppBanner