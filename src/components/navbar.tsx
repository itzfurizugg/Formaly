import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound, LayoutDashboard, X, LogOut } from "lucide-react"
import { useAuth } from "../lib/auth-context"

const baseLinks = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Histori", icon: RotateCcwClock },
    { to: "/profile", label: "Profil", icon: UserRound },
]

function Navbar() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user, profile, logout } = useAuth()
    const [open, setOpen] = useState(false)
    const [avatarOpen, setAvatarOpen] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    const navLinks = [...baseLinks]

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    const toggle = () => setOpen((v) => !v)

    const linkClass = (to: string, mobile = false) => {
        const isActive = pathname === to
        if (mobile) {
            return `flex items-center gap-3 w-full h-14 px-4 rounded-none text-base font-medium transition-colors ${
                isActive
                    ? "bg-darks text-base rounded-none"
                    : "bg-base-100 text-darks hover:bg-base-300"
            }`
        }
        return `btn ${isActive ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`
    }

    if (!user) return null

    const sidebarVariants = {
        hidden: { x: "100%" },
        visible: { x: 0 },
        exit: { x: "100%" },
    }

    return (
        <>
            <div className="navbar shadow-sm bg-base px-4 lg:px-4 sticky top-0 z-50 flex-col items-stretch !py-0">
                <div className="flex items-center justify-between w-full py-2 gap-2 relative min-h-[44px]">
                    <div className="flex-1 flex items-center">
                        <Link to="/">
                            <img src={logo} alt="Formaly" className="h-6 w-auto ml-3 mt-2 lg:ml-10 lg:mt-2" />
                        </Link>
                    </div>

                    <div className="hidden lg:flex flex-1 justify-center mt-1">
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

                    <div className="hidden lg:flex flex-1 mt-1 justify-end items-center gap-2">
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
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="sidebar-backdrop"
                        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                )}
                {open && (
                    <motion.aside
                        key="sidebar"
                        className="fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl lg:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu navigasi"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={sidebarVariants}
                        transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-second">
                            {/* <img src={logo} alt="Formaly" className="h-6 w-auto" /> */}
                            <button
                                onClick={() => setOpen(false)}
                                className="btn btn-square btn-ghost btn-sm text-darks"
                                aria-label="Tutup menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
                            {navLinks.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={linkClass(to, true)}
                                    onClick={() => setOpen(false)}
                                >
                                    <Icon className="h-5 w-5" />
                                    {label}
                                </Link>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-second">
                            <Link
                                to="/creator"
                                onClick={() => setOpen(false)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-darks hover:bg-base transition-colors text-left rounded-lg"
                            >
                                <LayoutDashboard className="h-4 w-4" /> Creator
                            </Link>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    )
}

export default Navbar