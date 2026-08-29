import { Link, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { House, UserRound, LayoutDashboard, History } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const baseItems = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Riwayat", icon: History },
    { to: "/profile", label: "Profil", icon: UserRound }
]

const creatorItem = { to: "/creator", label: "Creator", icon: LayoutDashboard }

/**
 * Dock bottom bar — tampil di sm (640–767px) saja.
 * Di xs (< 640px) pakai Navbar sidebar drawer; di md+ (768px+) pakai Navbar desktop.
 */
function Dock() {
    const { pathname } = useLocation()
    const { user, profile } = useAuth()

    if (!user) return null

    const role = profile?.role ? String(profile.role).toLowerCase() : ""
    const isCreatorRole = role === "creator" || role === "admin"
    const items = [...baseItems]
    const isCreatorActive = pathname === creatorItem.to

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 max-[380px]:hidden md:hidden pointer-events-none">
            {/* <div className="bg-gradient-to-t from-base-300 via-base-300/30 to-transparent px-4 pb-6 pt-30"> */}
                <div className="mx-auto w-fit max-w-full flex items-center justify-center gap-3 px-4 pb-6">
                    <nav
                        className="w-fit max-w-full flex items-center justify-around gap-1 rounded-full border border-white/70 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(57,62,70,0.25)] px-2 py-2 pointer-events-auto"
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
                                        className="absolute inset-0 rounded-full bg-darks/10 border border-darks/10 shadow-sm"
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

                {isCreatorRole && (
                    <Link
                        to={creatorItem.to}
                        aria-current={isCreatorActive ? "page" : undefined}
                        aria-label={creatorItem.label}
                        className={`pointer-events-auto flex items-center justify-center size-14 rounded-full border transition-all duration-200 shadow-[0_8px_32px_rgba(57,62,70,0.25)] ${
                            isCreatorActive
                                ? "bg-darks border-darks text-white"
                                : "border-white/70 bg-white/40 backdrop-blur-2xl text-darks hover:bg-white/55 active:scale-95"
                        }`}
                    >
                        <creatorItem.icon
                            className="size-[1.3em]"
                            strokeWidth={isCreatorActive ? 2.4 : 2}
                        />
                    </Link>
                )}
                </div>
            {/* </div> */}
        </div>
    )
}

export default Dock
