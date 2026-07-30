import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound, Menu, X } from "lucide-react"

const navLinks = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Histori", icon: RotateCcwClock },
    { to: "/profile", label: "Profil", icon: UserRound },
]

function Navbar() {
    const { pathname } = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)

    const linkClass = (to: string) =>
        `btn ${pathname === to ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`

    return (
        <div className="navbar shadow-sm bg-base px-4 lg:px-6 relative">
            <div className="flex-1 flex items-center">
                <Link to="/" onClick={() => setMobileOpen(false)}>
                    <img src={logo} alt="Formaly" className="h-6 w-auto ml-3 xl:ml-10" />
                </Link>
            </div>

            <div className="hidden lg:flex flex-1 justify-center gap-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to} className={linkClass(to)}>
                        <Icon className="h-4 w-auto" />
                        {label}
                    </Link>
                ))}
            </div>

            <div className="flex-1 flex justify-end lg:hidden">
                <button
                    className="btn btn-square btn-ghost text-darks"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            <div className="hidden lg:flex flex-1 justify-end">
                <button className="btn btn-square btn-ghost text-darks">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                    </svg>
                </button>
            </div>

            {mobileOpen && (
                <div className="absolute top-full left-0 w-full bg-base border-t border-second shadow-md flex items-center px-4 py-3 gap-2 lg:hidden z-50">
                    {navLinks.map(({ to, label, icon: Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`btn btn-sm ${pathname === to ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon className="h-4 w-auto" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Navbar