import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"

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
    // jadi ruang kompensasi 20vw juga dihilangkan supaya loader jadi full-width.
    const sidebarHidden = pathname.startsWith("/creator/galileo/generate")
    // 20vw = seperlima lebar layar, sinkron dengan lebar sidebar desktop
    // (w-[20vw] di CreatorSidebar). Padding kompensasi statis (tanpa animasi):
    // sidebar tampil langsung sebagai bagian halaman, bukan digeser masuk.
    const targetPad = isDesktop && !sidebarHidden ? "20vw" : "0rem"

    return (
        <div className="bg-second min-h-screen transition-[padding-left] duration-500 ease-in-out" style={{ paddingLeft: targetPad }}>
            <Outlet />
        </div>
    )
}

export default CreatorLayout