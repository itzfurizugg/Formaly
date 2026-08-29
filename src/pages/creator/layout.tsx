import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Outlet } from "react-router-dom"
import { easeOutExpo } from "../../lib/motion"

// Sidebar desktop hanya tampil di >= lg. Padding kompensasi mengikuti breakpoint itu
// agar konten di layar kecil tidak ikut diberi ruang kosong.
function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth >= 1024 : true
    )
    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])
    return isDesktop
}

interface CreatorLayoutProps {
    // true hanya saat pertama kali membuka area creator (termasuk kembali dari
    // Beranda/Login). Saat pindah antar halaman creator nilainya false, sehingga
    // konten tidak "terdorong" ulang.
    reveal?: boolean
    // Dipanggil setelah reveal dijalankan, supaya App bisa mengunci reveal
    // berikutnya selama masih di dalam area creator.
    onRevealed?: () => void
}

function CreatorLayout({ reveal = false, onRevealed }: CreatorLayoutProps) {
    const isDesktop = useIsDesktop()
    const reduceMotion = useReducedMotion()
    // w-64 = 16rem. Durasi & easing sama persis dengan slide-in sidebar
    // (0.45s, easeOutExpo) supaya sidebar dan konten terasa satu kesatuan gerakan.
    const targetPad = isDesktop ? "16rem" : "0rem"

    useEffect(() => {
        if (reveal) onRevealed?.()
    }, [reveal, onRevealed])

    return (
        <motion.div
            className="bg-second min-h-screen"
            initial={reveal ? { paddingLeft: "0rem" } : false}
            animate={{ paddingLeft: targetPad }}
            // Transisi hanya berjalan saat reveal (masuk area creator). Setelah itu
            // padding harus instan — termasuk saat breakpoint lg dilintasi karena
            // resize, biar tidak terlihat seperti sidebar dibuka ulang.
            transition={{ duration: reduceMotion || !reveal ? 0 : 0.45, ease: easeOutExpo }}
        >
            <Outlet />
        </motion.div>
    )
}

export default CreatorLayout