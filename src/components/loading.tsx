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

// Spinner 8-blade ala iOS UIActivityIndicatorView: tiap blade menyala lalu
// meredup bergantian, memberi ilusi berputar tanpa benar-benar rotate.
const SPIN_DURATION = 1
const BLADE_COUNT = 8
const BLADE_STEP = SPIN_DURATION / BLADE_COUNT

function ActivitySpinner({ size = 28 }: { size?: number }) {
    const radius = size * 0.32
    const bladeLength = size * 0.28
    const bladeWidth = Math.max(2, size * 0.09)

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {Array.from({ length: BLADE_COUNT }).map((_, i) => {
                const angle = (360 / BLADE_COUNT) * i
                return (
                    <motion.span
                        key={i}
                        className="absolute top-1/2 left-1/2 rounded-full bg-darks"
                        style={{
                            width: bladeWidth,
                            height: bladeLength,
                            marginLeft: -bladeWidth / 2,
                            marginTop: -radius - bladeLength,
                            transformOrigin: `${bladeWidth / 2}px ${radius + bladeLength}px`,
                            transform: `rotate(${angle}deg)`,
                        }}
                        animate={{ opacity: [1, 0.15] }}
                        transition={{
                            duration: 0.4,
                            ease: "linear",
                            repeat: Infinity,
                            repeatDelay: SPIN_DURATION - 0.4,
                            delay: i * BLADE_STEP,
                        }}
                    />
                )
            })}
        </div>
    )
}

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
            <ActivitySpinner size={inline ? 26 : 30} />
            <p className="text-xs text-tinted">{label}</p>
        </motion.div>
    )
}

export default Loading