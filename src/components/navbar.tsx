import { Link, useLocation } from "react-router-dom"
import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound, LayoutDashboard } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const baseLinks = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Riwayat", icon: RotateCcwClock },
    { to: "/profile", label: "Profil", icon: UserRound },
]

function Navbar() {
    const { pathname } = useLocation()
    const { user, profile } = useAuth()

    // Role diambil dari AuthContext (satu fetch users per sesi), bukan query terpisah.
    const role = String(profile?.role || "").toLowerCase()

    const navLinks = [...baseLinks]
    if (role === "creator" || role === "admin") {
        navLinks.push({ to: "/creator", label: "Creator", icon: LayoutDashboard })
    }

    if (!user) return null

    const linkClass = (to: string) => {
        const isActive = pathname === to
        return `btn ${isActive ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`
    }

    return (
        <div
            className="navbar bg-base-300 px-4 lg:px-4 flex-col items-stretch !py-0 rounded-b-2xl lg:rounded-b-none"
        >
            <div className="flex items-center justify-between w-full py-2 gap-2 relative min-h-[44px]">
                <div className="flex-1 relative min-h-[44px] flex items-center">
                    <Link to="/">
                        <img src={logo} alt="Formaly" className="h-6 w-auto ml-3 mt-2 lg:ml-10 lg:mt-2" />
                    </Link>
                </div>

                <div className="hidden md:flex flex-1 justify-center mt-1">
                    {navLinks
                        .filter(({ to }) => to !== "/creator")
                        .map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to} className={linkClass(to)}>
                                <Icon className="h-4 w-auto" />
                                {label}
                            </Link>
                        ))}
                </div>

                {/* Creator button: tampil di md ke atas bareng nav horizontal. Di bawah md navigasi pakai Dock. */}
                <div className="hidden md:flex flex-1 justify-end items-center gap-2">
                    {(role === "creator" || role === "admin") && (
                        <Link
                            to="/creator"
                            className={`btn ml-5 ${pathname === "/creator" ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`}
                        >
                            <LayoutDashboard className="h-4 w-auto" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar