import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"

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
        <motion.div
            aria-hidden
            className={`flex flex-col items-center justify-center gap-3 px-4 ${
                opaque ? "" : "pointer-events-none"
            } ${inline ? "py-14" : "fixed inset-0 z-50 bg-base-300"}`}
            initial={false}
            animate={{ opacity: opaque ? 1 : 0 }}
            transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
        >
            <div className="relative h-1 w-44 max-w-full overflow-hidden rounded-full bg-white/70">
                <motion.div
                    className="absolute h-full w-1/3 rounded-full bg-darks"
                    initial={{ left: "-35%", right: "100%" }}
                    animate={{ left: ["-35%", "0%", "100%"], right: ["100%", "0%", "-35%"] }}
                    transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                />
            </div>
            <p className="text-xs text-tinted">{label}</p>
        </motion.div>
    )
}

export default Loading
