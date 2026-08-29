import { motion } from "motion/react"

// Parameter spring khas Material 3 Expressive: sedikit overshoot/bouncy agar
// bar terasa "hidup", bukan easing linear yang kaku.
const SPRING = { type: "spring" as const, damping: 18, stiffness: 90, mass: 0.9 }

interface LinearProgressProps {
    label?: string
    /** Class tambahan untuk lebar track (misal "w-56 sm:w-72"). Default 100%. */
    trackClassName?: string
}

function LinearProgress({ label = "Memuat...", trackClassName = "w-full" }: LinearProgressProps) {
    return (
        <div className="flex flex-col items-center">
            <div className={`relative h-1 overflow-hidden rounded-full bg-darks/10 ${trackClassName}`}>
                <motion.div
                    aria-hidden
                    className="absolute inset-y-0 rounded-full bg-darks"
                    initial={{ x: "-100%" }}
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                        ...SPRING,
                        duration: 1.6,
                        repeat: Infinity,
                        repeatDelay: 0.4,
                    }}
                    style={{ width: "40%" }}
                />
            </div>
            {label && (
                <p className="text-[11px] text-tinted text-center mt-3 tracking-wide">{label}</p>
            )}
        </div>
    )
}

export default LinearProgress