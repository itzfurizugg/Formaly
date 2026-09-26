import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { easeOutExpo } from "../../lib/motion"
import { CREATOR_SIDEBAR_WIDTH } from "../../lib/creatorLayout"

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

function CreatorLayout() {
    const isDesktop = useIsDesktop()
    const { pathname } = useLocation()
    // Di halaman generate Galileo, sidebar disembunyikan (menggelincir ke kiri),
    // jadi ruang kompensasi juga dihilangkan supaya loader jadi full-width.
    const sidebarHidden = pathname.startsWith("/creator/galileo/generate")
    // Ruang kompensasi = lebar sidebar persis (CREATOR_SIDEBAR_WIDTH), lalu
    // digeser pakai Motion dengan durasi/easing yang SAMA dengan slide sidebar
    // supaya konten dan sidebar bergeraksinkron, tidak saling tertinggal.
    const targetPad = isDesktop && !sidebarHidden ? CREATOR_SIDEBAR_WIDTH : "0rem"

    return (
        <motion.div
            className="bg-second dark:bg-base min-h-screen"
            initial={false}
            animate={{ paddingLeft: targetPad }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
        >
            <Outlet />
        </motion.div>
    )
}

export default CreatorLayout