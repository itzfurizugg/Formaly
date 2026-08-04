import { useState, useRef, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound, LayoutDashboard, X, LogOut } from "lucide-react"
import { useAuth } from "../lib/auth"
import { supabase } from "../lib/supabase"

const baseLinks = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Histori", icon: RotateCcwClock },
    { to: "/profile", label: "Profil", icon: UserRound },
]

function Navbar() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user, profile, logout } = useAuth()
    const [role, setRole] = useState("")
    const [open, setOpen] = useState(false)
    const [avatarOpen, setAvatarOpen] = useState(false)
    const [closing, setClosing] = useState(false)
    const navRef = useRef<HTMLDivElement>(null)
    const [navHeight, setNavHeight] = useState(0)

    useEffect(() => {
        if (!user) return
        supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
                if (data) setRole(String(data.role).toLowerCase())
            })
    }, [user])

    const navLinks = [...baseLinks]
    if (role === "creator" || role === "admin") {
        navLinks.push({ to: "/creator", label: "Creator", icon: LayoutDashboard })
    }

    const showContent = open || closing

    useEffect(() => {
        if (navRef.current) {
            setNavHeight(navRef.current.offsetHeight)
        }
    }, [open, closing])

    const closeNav = () => {
        if (closing) return
        setClosing(true)
        setOpen(false)
        setTimeout(() => setClosing(false), 300)
    }

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    const toggle = () => {
        if (open) {
            closeNav()
        } else {
            setOpen(true)
        }
    }

    const linkClass = (to: string, mobile = false) => {
        const isActive = pathname === to
        if (mobile) {
            return `flex items-center gap-2 w-full h-11 px-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? "bg-darks text-base"
                    : "bg-base-200 text-darks hover:bg-base-300"
            }`
        }
        return `btn ${isActive ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`
    }

    if (!user) return null

    return (
        <>
            <div
                ref={navRef}
                className="navbar shadow-sm bg-base px-4 lg:px-4 sticky top-0 z-50 flex-col items-stretch !py-0"
            >
                <div className="flex items-center justify-between w-full py-2 gap-2 relative min-h-[44px]">
                    <div className="flex-1 relative min-h-[44px] flex items-center">
                        <div
                            className={`absolute inset-0 flex items-center transition-all duration-300 ease-out ${
                                open ? "opacity-0 pointer-events-none" : "opacity-100"
                            }`}
                        >
                            <Link to="/" onClick={() => open && closeNav()}>
                                <img src={logo} alt="Formaly" className="h-6 w-auto ml-3 mt-2 lg:ml-10 lg:mt-2" />
                            </Link>
                        </div>

                        <div
                            className={`absolute inset-0 flex items-center transition-all duration-300 ease-out lg:hidden ${
                                open
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-1 pointer-events-none"
                            }`}
                        >
                            <Link
                                to={navLinks[0].to}
                                className={linkClass(navLinks[0].to, true)}
                                onClick={closeNav}
                            >
                                {(() => {
                                    const Icon = navLinks[0].icon
                                    return <Icon className="h-4 w-4" />
                                })()}
                                {navLinks[0].label}
                            </Link>
                        </div>
                    </div>

                    <div
                        className={`hidden lg:flex flex-1 justify-center transition-all duration-300 ease-out mt-1 ${
                            open ? "opacity-0" : "opacity-100"
                        }`}
                    >
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link key={to} to={to} className={linkClass(to)}>
                                <Icon className="h-4 w-auto" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    <button
                        onClick={toggle}
                        className="btn btn-square btn-ghost mt-1 text-darks relative overflow-hidden shrink-0 lg:hidden ml-auto"
                        aria-label={open ? "Tutup menu" : "Buka menu"}
                    >
                        <div className={`transition-all duration-300 ease-out ${open ? "opacity-0 rotate-90 scale-75" : "opacity-100"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                            </svg>
                        </div>
                        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${!open ? "opacity-0 -rotate-90 scale-75" : "opacity-100"}`}>
                            <X className="h-5 w-5" />
                        </div>
                    </button>

                    <div className={`hidden lg:flex flex-1 mt-1 justify-end items-center gap-2 transition-all duration-300 ease-out ${
                            open ? "opacity-0" : "opacity-100"
                        }`}
                    >
                        <div className="relative">
                            <button
                                onClick={() => setAvatarOpen((v) => !v)}
                                className="btn btn-circle btn-ghost"
                                aria-label="Menu akun"
                                aria-expanded={avatarOpen}
                            >
                                <div className="w-9 h-9 rounded-full bg-done overflow-hidden flex items-center justify-center">
                                    <span className="text-base font-bold text-white">
                                        {(profile?.name || "U").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </button>

                            {avatarOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setAvatarOpen(false)}
                                        aria-hidden="true"
                                    />
                                    <div className="absolute right-0 top-full mt-3 p-4 z-50 min-w-[16rem] max-w-[20rem] rounded-box bg-white border border-second shadow-lg overflow-hidden">
                                        <div className="px-3 py-3 border-b border-base">
                                            <p className="text-xl font-semibold text-darks break-words">
                                                {profile?.name || "User"}
                                            </p>
                                            <p className="text-md text-tinted break-words">{profile?.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setAvatarOpen(false)
                                                navigate("/profile")
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-darks hover:bg-base transition-colors text-left"
                                        >
                                            <UserRound className="h-4 w-4" /> Profil
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-wrong hover:bg-wrong/10 transition-colors text-left"
                                        >
                                            <LogOut className="h-4 w-4" /> Keluar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className={`overflow-hidden transition-all duration-300 ease-out lg:hidden ${
                        open ? "max-h-64" : "max-h-0"
                    }`}
                >
                    <div className={`transition-all duration-300 ease-out ${
                        open
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0"
                    }`}>
                        <div className="flex flex-col gap-1.5 pb-2">
                            {navLinks.slice(1).map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={linkClass(to, true)}
                                    onClick={closeNav}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showContent && (
                <div
                    className={`fixed inset-x-0 bottom-0 z-40 lg:hidden transition-all duration-300 ease-out ${
                        open ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ top: navHeight, backgroundColor: "rgba(0,0,0,0.4)" }}
                    onClick={closeNav}
                />
            )}
        </>
    )
}

export default Navbar
