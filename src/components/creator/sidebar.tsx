import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
    House,
    LayoutDashboard,
    FileText,
    ClipboardList,
    X,
} from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth-context"

interface NavItem {
    to: string
    label: string
    icon: typeof House
    active: boolean
}

// Sidebar vertikal khusus area /creator. Dirender sebagai pengganti Navbar
// horizontal saat pathname diawali "/creator".
function CreatorSidebar() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const [open, setOpen] = useState(false)
    const [closing, setClosing] = useState(false)

    // Tutup otomatis saat berpindah halaman.
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    const showContent = open || closing

    // Kunci scroll halaman selama sidebar mobile terbuka (termasuk animasi tutup).
    useEffect(() => {
        if (showContent) {
            const prev = document.body.style.overflow
            document.body.style.overflow = "hidden"
            return () => {
                document.body.style.overflow = prev
            }
        }
    }, [showContent])

    const closeNav = () => {
        if (closing) return
        setClosing(true)
        setOpen(false)
        setTimeout(() => setClosing(false), 300)
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
            icon: FileText,
            active: pathname.startsWith("/creator/forms") && !pathname.includes("/submissions"),
        },
        {
            to: "/creator/responden",
            label: "Responden",
            icon: ClipboardList,
            active: pathname.includes("/submissions") || pathname === "/creator/responden",
        },
    ]

    // Pill aktif dianimasikan lewat layoutId. Id berbeda per varian (desktop/mobile)
    // karena keduanya ter-mount bersamaan.
    const renderLink = (item: NavItem, pillId: string) => {
        const { to, label, icon: Icon, active } = item
        return (
            <Link
                key={to}
                to={to}
                onClick={() => open && closeNav()}
                className={`relative flex items-center gap-3 h-11 px-4 text-sm font-medium transition-colors ${active ? "text-base" : "text-darks hover:bg-base-200"
                    }`}
            >
                {active && (
                    <motion.span
                        layoutId={pillId}
                        className="absolute inset-0 rounded-lg bg-darks"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 truncate">{label}</span>
            </Link>
        )
    }

    const renderNav = (pillId: string) => (
        <div className="flex flex-col gap-1.5">
            {navItems.map((item) => renderLink(item, pillId))}
        </div>
    )

    if (!user) return null

    return (
        <>
            {/* ---- Sidebar desktop (lg ke atas): fixed di kiri ---- */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-base-200 border-r border-second">
                <div className="flex items-center h-16 px-5 border-b border-second shrink-0">
                    <Link to="/" onClick={() => open && closeNav()}>
                        <img src={logo} alt="Formaly" className="h-6 w-auto" />
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
                    {renderNav("creator-sidebar-active-desktop")}
                </nav>

                <div className="p-3 border-t border-second flex flex-col gap-1.5 shrink-0 mb-3 ml-2">
                    <div className="flex items-center gap-3 px-1 py-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-done overflow-hidden flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-white">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-darks truncate">{profile?.name || "User"}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ---- Backdrop sidebar mobile ---- */}
            {showContent && (
                <motion.div
                    className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`}
                    initial={false}
                    animate={{ opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    onClick={closeNav}
                />
            )}

            {/* ---- Sidebar mobile: off-canvas dari kiri ---- */}
            <motion.aside
                initial={false}
                animate={{ x: open ? "0%" : "-100%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed top-0 left-0 z-[70] h-full w-72 max-w-[85vw] bg-base-300 shadow-xl lg:hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-label="Menu creator"
            >
                <div className="flex items-center justify-between p-4 border-b border-second">
                    <div className="flex items-center gap-3 min-w-0 ml-2">
                        <div className="w-7 h-7 rounded-full bg-done overflow-hidden flex items-center justify-center shrink-0">
                            <span className="text-base font-bold text-white">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-darks">{profile?.name || "User"}</p>
                        </div>
                    </div>
                    <button
                        onClick={closeNav}
                        className="btn btn-square btn-ghost btn-sm text-darks shrink-0"
                        aria-label="Tutup menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
                    {renderNav("creator-sidebar-active-mobile")}
                </nav>

                <div className="p-3 border-t border-second flex flex-col gap-1.5">
                    <button
                        onClick={() => navigate("/")}
                        className="w-full flex items-center gap-3 h-11 px-4 text-sm font-medium text-darks hover:bg-base-200 transition-colors text-left rounded-lg"
                    >
                        <House className="h-4 w-4" /> Beranda
                    </button>
                </div>
            </motion.aside>
        </>
    )
}

export default CreatorSidebar