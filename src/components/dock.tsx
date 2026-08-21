import { Link, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { House, UserRound, LayoutDashboard, History } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const baseItems = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Riwayat", icon: History },
    // { to: "/creator", label: "Kreator", icon: LayoutDashboard },
    { to: "/profile", label: "Profil", icon: UserRound }
]

// Dock navigasi bottom bar bergaya "liquid glass" iOS 26: pill melayang
// di bawah layar dengan efek frosted glass (backdrop-blur + border transparan)
// dan pill aktif yang bergeser mulus via layoutId. Hanya tampil di layar kecil
// (md:hidden); hilang total di tablet/desktop yang memakai Navbar + link horizontal.
function Dock() {
    const { pathname } = useLocation()
    const { user, profile } = useAuth()

    if (!user) return null

    const role = profile?.role ? String(profile.role).toLowerCase() : ""
    const items = [...baseItems]
    if (role === "creator" || role === "admin") {
        items.push({ to: "/creator", label: "Creator", icon: LayoutDashboard })
    }

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 md:hidden pb-6 px-4 pointer-events-none">
            <nav
                className="mx-auto w-fit max-w-full flex items-center justify-around gap-1 rounded-full border border-white/70 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(57,62,70,0.25)] px-2 py-2 pointer-events-auto"
                aria-label="Navigasi utama"
            >
                {items.map(({ to, label, icon: Icon }) => {
                    const isActive = pathname === to
                    return (
                        <Link
                            key={to}
                            to={to}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={label}
                            className="relative flex flex-col items-center justify-center gap-0.5 rounded-full px-3.5 py-1.5 min-w-[64px]"
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="dock-active-pill"
                                    className="absolute inset-0 rounded-full bg-white/70 border border-white/70 shadow-sm"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <Icon
                                className={`relative z-10 size-[1.15em] transition-colors ${isActive ? "text-darks" : "text-darks/70"}`}
                                strokeWidth={isActive ? 2.4 : 2}
                            />
                            {isActive && (
                                <span
                                    className="relative z-10 text-[10px] font-medium leading-none transition-colors text-darks"
                                >
                                    {label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}

export default Dock
