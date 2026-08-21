import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Plus, House, UserRound } from "lucide-react"

interface NavItem {
    to: string
    label: string
    icon: typeof LayoutDashboard
    match: (pathname: string) => boolean
}

const items: NavItem[] = [
    { to: "/creator", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/creator" || p.startsWith("/creator/forms") },
    {
        to: "/creator/forms/new",
        label: "Buat",
        icon: Plus,
        match: (p) => p === "/creator/forms/new",
    },
]

function CreatorNavbar() {
    const { pathname } = useLocation()

    return (
        <div className="navbar bg-base px-4 lg:px-4 sticky top-0 z-40 shadow-sm flex-col items-stretch !py-0 gap-0 pt-1">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                <nav className="flex items-center gap-1.5">
                    {items.map(({ to, label, icon: Icon, match }) => {
                        const active = match(pathname)
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`btn h-9 min-h-0 flex items-center gap-2 text-sm font-medium transition-colors ${
                                    active
                                        ? "bg-darks text-base border-none"
                                        : "bg-transparent text-tinted hover:text-darks border-none"
                                }`}
                            >
                                <Icon className="h-4 w-4" /> {label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex items-center gap-1">
                    <Link to="/" className="btn btn-ghost btn-sm text-tinted hover:text-darks" title="Beranda">
                        <House className="h-4 w-4" />
                    </Link>
                    <Link to="/profile" className="btn btn-ghost btn-sm text-tinted hover:text-darks" title="Profil">
                        <UserRound className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default CreatorNavbar