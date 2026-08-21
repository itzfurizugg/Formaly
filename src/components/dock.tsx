import { Link, useLocation } from "react-router-dom"
import { House, RotateCcwClock, UserRound, LayoutDashboard } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const baseItems = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Riwayat", icon: RotateCcwClock },
    // { to: "/creator", label: "Kreator", icon: LayoutDashboard },
    { to: "/profile", label: "Profil", icon: UserRound }
]

// Dock navigasi bottom bar (DaisyUI) khusus mobile. Hanya tampil di layar kecil
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
        <nav
            className="dock bg-base border-t border-second md:hidden z-50"
            aria-label="Navigasi utama"
        >
            {items.map(({ to, label, icon: Icon }) => {
                const isActive = pathname === to
                return (
                    <Link
                        key={to}
                        to={to}
                        aria-current={isActive ? "page" : undefined}
                        className={isActive ? "dock-active text-darks" : "text-tinted"}
                    >
                        <Icon className="size-[1.2em]" />
                        <span className="dock-label">{label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}

export default Dock