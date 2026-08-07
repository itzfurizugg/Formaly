import { useEffect, useRef, useState } from "react"

interface LoadingProps {
    show?: boolean
    label?: string
    inline?: boolean
}

// Loading hanya muncul bila benar-benar memuat (delay kecil utk load cepat),
// lalu bertahan minimal ~1 detik supaya tidak berkedip, dan fade-out halus.
const SHOW_DELAY = 250
const MIN_DURATION = 1000
const FADE_MS = 500

function Loading({ show = true, label = "Memuat...", inline = false }: LoadingProps) {
    const [mounted, setMounted] = useState(false)
    const [opaque, setOpaque] = useState(false)
    const shownAtRef = useRef<number | null>(null)

    useEffect(() => {
        const timeoutIds: number[] = []
        let rafId = 0

        if (show) {
            // Muncul hanya setelah loading benar-benar berlangsung.
            const t = window.setTimeout(() => {
                setMounted(true)
                shownAtRef.current = Date.now()
                rafId = requestAnimationFrame(() => setOpaque(true))
            }, SHOW_DELAY)
            timeoutIds.push(t)
        } else {
            // Pertahankan minimal MIN_DURATION, lalu fade-out halus.
            const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : 0
            const wait = Math.max(0, MIN_DURATION - elapsed)
            const t = window.setTimeout(() => {
                setOpaque(false)
                timeoutIds.push(window.setTimeout(() => setMounted(false), FADE_MS))
            }, wait)
            timeoutIds.push(t)
        }

        return () => {
            timeoutIds.forEach((id) => window.clearTimeout(id))
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [show])

    if (!mounted) return null

    return (
        <div
            aria-hidden
            className={`flex flex-col items-center justify-center gap-3 px-4 transition-opacity duration-500 ease-out ${
                opaque ? "opacity-100" : "opacity-0 pointer-events-none"
            } ${inline ? "py-14" : "fixed inset-0 z-50 bg-base-300"}`}
        >
            <div className="relative h-1 w-44 max-w-full overflow-hidden rounded-full bg-white/70">
                <div className="absolute h-full w-1/3 rounded-full bg-darks animate-loadingbar" />
            </div>
            <p className="text-xs text-tinted">{label}</p>
        </div>
    )
}

export default Loading
