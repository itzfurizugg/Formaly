import { motion, type Variants } from "motion/react"
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { easeOutExpo, listItem } from "../../lib/motion"
import {
    LayoutDashboard,
    ChartNoAxesColumn,
    Form,
    Bot,
    type LucideIcon,
} from "lucide-react"
import logo from "../../assets/icon.svg"
import { Link } from "react-router-dom"
import { useAuth } from "../../lib/auth-context"

// Breakpoint desktop (lg) supaya sidebar bisa dianimasikan keluar saat layar
// menyusut di bawah 1024px, bukan langsung hilang lewat CSS `hidden lg:flex`.
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

// Orkestrasi item nav setelah sidebar selesai menggelincir masuk:
// delay kecil dulu (guarded slide), lalu item muncul fade + angkat ringan.
const sidebarNav: Variants = {
    hidden: {},
    show: { transition: { delayChildren: 0.18, staggerChildren: 0.05 } },
}

// Sidebar vertikal khusus area /creator. Dirender sebagai pengganti Navbar
// horizontal saat pathname diawali "/creator".
function CreatorSidebar() {
    const { pathname } = useLocation()
    const { user, profile } = useAuth()

    // Sidebar disembunyikan (menggelincir keluar ke kiri) di layar < lg (mobile
    // pakai drawer sendiri) dan di halaman generate Galileo supaya fokus penuh.
    const isDesktop = useIsDesktop()
    const hidden = !isDesktop || pathname.startsWith("/creator/galileo/generate")

    interface NavItem {
        to: string
        label: string
        icon: LucideIcon
        active: boolean
        /** Label kecil di sebelah teks nav, mis. "Baru" / "Beta". Kosongkan kalau tidak perlu. */
        badge?: string
        /** Ikon diisi penuh saat aktif. Galileo memakai garis biasa. */
        filled?: boolean
    }

    const navItems: NavItem[] = [
        {
            to: "/creator",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/creator",
        },
        {
            to: "/creator/forms",
            label: "Kelola Form",
            icon: Form,
            active: pathname.startsWith("/creator/forms") && !pathname.includes("/submissions"),
        },
        {
            to: "/creator/responden",
            label: "Responden",
            icon: ChartNoAxesColumn,
            active: pathname.includes("/submissions") || pathname === "/creator/responden",
        },
        {
            to: "/creator/galileo",
            label: "Galileo AI",
            icon: Bot,
            active: pathname.startsWith("/creator/galileo"),
            badge: "BETA",
            filled: false,
        },
    ]

    // Pill aktif dianimasikan lewat layoutId.
    const renderLink = (item: NavItem) => {
        const { to, label, icon: Icon, active, badge, filled = true } = item
        return (
            <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-3 h-12 px-4 rounded-lg text-sm font-medium transition-colors ${active ? "text-base" : "text-darks hover:bg-base-200"
                    }`}
            >
                {active && (
                    <motion.span
                        layoutId="creator-sidebar-active"
                        className="absolute inset-0 rounded-lg bg-darks"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" fill={active && filled ? "currentColor" : "none"} />
                <span className="relative z-10 truncate text-[15px] flex-1">{label}</span>
                {badge && (
                    <span className={`relative z-10 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${active ? "bg-white text-darks" : "bg-darks text-white"}`}>
                        {badge}
                    </span>
                )}
            </Link>
        )
    }

    if (!user) return null

    return (
        <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: hidden ? "-100%" : "0%" }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
            className="flex fixed inset-y-0 left-0 z-40 w-[20vw] flex-col bg-base-200 border-r border-second"
        >
            <div className="flex flex-row items-center h-28 px-6 shrink-0">
                <Link to="/" className="flex items-center gap-2">
                    <img src={logo} alt="Formaly" className="h-8 w-auto" />
                    <p className="font-semibold text-tinted">C R E A T O R</p>
                </Link>
            </div>

            <motion.nav
                className="flex-1 overflow-y-auto scrollbar-none px-3 pt-4 flex flex-col gap-1"
                variants={sidebarNav}
                initial="hidden"
                animate="show"
            >
                {navItems.map((item) => (
                    <motion.div key={item.to} variants={listItem}>
                        {renderLink(item)}
                    </motion.div>
                ))}
            </motion.nav>

            <div className="p-3 border-t border-second shrink-0">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-done overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-white">
                        <span className="text-sm font-bold text-white">
                            {(profile?.name || "U").charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-darks truncate">{profile?.name || "User"}</p>
                        <p className="text-xs text-tinted truncate">{profile?.email || "user@email.com"}</p>
                    </div>
                </div>
            </div>
        </motion.aside>
    )
}

export default CreatorSidebar