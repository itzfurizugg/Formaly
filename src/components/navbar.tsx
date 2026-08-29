import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound, LayoutDashboard, X, LogOut } from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { easeOutExpo } from "../lib/motion"

const baseLinks = [
    { to: "/", label: "Beranda", icon: House },
    { to: "/history", label: "Riwayat", icon: RotateCcwClock },
    { to: "/profile", label: "Profil", icon: UserRound },
]

function Navbar() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user, profile, logout } = useAuth()
    const [open, setOpen] = useState(false)
    const [closing, setClosing] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [pathname])

    // Role diambil dari AuthContext (satu fetch users per sesi), bukan query terpisah.
    const role = String(profile?.role || "").toLowerCase()

    const navLinks = [...baseLinks]
    if (role === "creator" || role === "admin") {
        navLinks.push({ to: "/creator", label: "Creator", icon: LayoutDashboard })
    }

    const showContent = open || closing

    // Kunci scroll halaman selama sidebar terbuka (termasuk saat animasi tutup).
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
            return `flex items-center gap-3 w-full h-14 px-4 text-base font-medium transition-colors rounded-xl ${
                isActive
                    ? "bg-darks text-base"
                    : "text-darks hover:bg-base-200"
            }`
        }
        return `btn ${isActive ? "bg-darks text-base border-none hover:bg-darks" : "btn-ghost text-darks"}`
    }

    if (!user) return null

    return (
        <>
            <div
                className="navbar bg-base-300 px-4 lg:px-4 flex-col items-stretch !py-0 rounded-b-2xl lg:rounded-b-none"
            >
                <div className="flex items-center justify-between w-full py-2 gap-2 relative min-h-[44px]">
                    <div className="flex-1 relative min-h-[44px] flex items-center">
                        <Link to="/" onClick={() => open && closeNav()}>
                            <img src={logo} alt="Formaly" className="h-6 w-auto ml-3 mt-2 lg:ml-10 lg:mt-2" />
                        </Link>
                    </div>

                    <div className="hidden lg:flex flex-1 justify-center mt-1">
                        {navLinks
                            .filter(({ to }) => to !== "/creator")
                            .map(({ to, label, icon: Icon }) => (
                                <Link key={to} to={to} className={linkClass(to)}>
                                    <Icon className="h-4 w-auto" />
                                    {label}
                                </Link>
                            ))}
                    </div>

                    {/* Hamburger & sidebar drawer:
                        - <=380px (HP ~4 inch: iPhone SE 2020, iPhone 5s, Redmi 5A, dll) -> tampil (sidebar)
                        - 381px-767px (HP normal) -> disembunyikan, navigasi pakai Dock
                        - md (768px-1023px, tablet/iPad) -> tampil (sidebar)
                        - lg ke atas -> disembunyikan, pakai link horizontal */}
                    <button
                        onClick={toggle}
                        className="btn btn-square btn-ghost mt-1 text-darks relative overflow-hidden shrink-0 hidden max-[380px]:flex min-[381px]:max-[767px]:hidden md:flex lg:hidden ml-auto"
                        aria-label={open ? "Tutup menu" : "Buka menu"}
                    >
                        <motion.div
                            initial={false}
                            animate={{ opacity: open ? 0 : 1, rotate: open ? 90 : 0, scale: open ? 0.75 : 1 }}
                            transition={{ duration: 0.3, ease: easeOutExpo }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                            </svg>
                        </motion.div>
                        <motion.div
                            initial={false}
                            animate={{ opacity: open ? 1 : 0, rotate: open ? 0 : -90, scale: open ? 1 : 0.75 }}
                            transition={{ duration: 0.3, ease: easeOutExpo }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <X className="h-5 w-5" />
                        </motion.div>
                    </button>

                    {/* Creator button disembunyikan di semua ukuran mobile/tablet, cuma tampil di lg ke atas.
                        Di mobile/tablet, akses Creator lewat sidebar drawer. */}
                    <div className="hidden lg:flex flex-1 justify-end items-center gap-2">
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

            {/* Backdrop untuk sidebar */}
            {showContent && (
                <motion.div
                    className={`fixed inset-0 z-[60] hidden max-[380px]:block min-[381px]:max-[767px]:hidden md:block lg:hidden ${open ? "" : "pointer-events-none"}`}
                    initial={false}
                    animate={{ opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    onClick={closeNav}
                />
            )}

            {/* Sidebar drawer: <=380px dan md-lg (lihat komentar di button hamburger) */}
            <motion.aside
                initial={false}
                animate={{ x: open ? "0%" : "100%" }}
                transition={{ duration: 0.3, ease: easeOutExpo }}
                className="fixed top-0 right-0 z-[70] h-full w-72 max-w-[85vw] bg-white shadow-xl hidden max-[380px]:flex min-[381px]:max-[767px]:hidden md:flex lg:hidden flex-col"
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
            >
                <div className="flex items-center justify-between p-4 border-b border-second">
                    <div className="flex items-center gap-3 min-w-0 ml-2">
                        <div className="w-8 h-8 rounded-full bg-done overflow-hidden flex items-center justify-center shrink-0">
                            <span className="text-base font-bold text-white">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-darks">{profile?.name || "User"}</p>
                            <p className="text-xs text-tinted truncate">{profile?.email}</p>
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

                <nav className="flex-1 overflow-y-auto scrollbar-none p-3 flex flex-col gap-1.5">
                    {navLinks
                        .filter(({ to }) => to !== "/creator")
                        .map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className={linkClass(to, true)}
                                onClick={closeNav}
                            >
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        ))}
                </nav>

                <div className="p-3 border-t border-second flex flex-col gap-1.5">
                    {navLinks
                        .filter(({ to }) => to === "/creator")
                        .map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className={linkClass(to, true)}
                                onClick={closeNav}
                            >
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        ))}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 h-14 px-4 text-base font-medium text-wrong hover:bg-wrong/10 transition-colors text-left rounded-xl"
                    >
                        <LogOut className="h-5 w-5" /> Keluar
                    </button>
                </div>
            </motion.aside>
        </>
    )
}

export default Navbar