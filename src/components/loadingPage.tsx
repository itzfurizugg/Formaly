import { motion } from "motion/react"

/** Loading full-area yang tampil seketika (tanpa delay) sebagai fallback
 * Suspense / pengecekan auth, supaya layar tidak blank putih saat chunk
 * halaman (mis. dashboard) diunduh pertama kali. */
function LoadingPage({ label = "Memuat..." }: { label?: string }) {
    return (
        <div aria-hidden className="flex flex-col items-center justify-center gap-3 px-4 min-h-[60vh]">
            <div className="relative h-1 w-44 max-w-full overflow-hidden rounded-full bg-white/70">
                <motion.div
                    className="absolute h-full w-1/3 rounded-full bg-darks"
                    initial={{ left: "-35%", right: "100%" }}
                    animate={{ left: ["-35%", "0%", "100%"], right: ["100%", "0%", "-35%"] }}
                    transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                />
            </div>
            <p className="text-xs text-tinted">{label}</p>
        </div>
    )
}

export default LoadingPage
