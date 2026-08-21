import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { UserRound, LogOut } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useAuth } from "../lib/auth-context"

// Menu profile ala Clerk UserButton (UI only). Data user diambil dari session
// Supabase Auth yang sedang login — tidak ada provider Clerk/session tambahan.
function UserMenu() {
    const navigate = useNavigate()
    const { profile, logout } = useAuth()
    const [open, setOpen] = useState(false)

    const handleLogout = async () => {
        setOpen(false)
        await logout()
        navigate("/login")
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="btn btn-circle btn-ghost"
                aria-label="Menu akun"
                aria-expanded={open}
            >
                <div className="w-9 h-9 rounded-full bg-done overflow-hidden flex items-center justify-center ring-2 ring-white shadow-sm">
                    <span className="text-base font-bold text-white">
                        {(profile?.name || "U").charAt(0).toUpperCase()}
                    </span>
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="usermenu-backdrop"
                        className="fixed inset-0 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                )}
                {open && (
                    <motion.div
                        key="usermenu-panel"
                        className="absolute right-0 top-full mt-3 z-50 min-w-[16rem] max-w-[20rem] rounded-3xl lg:rounded-2xl bg-white border border-second shadow-xl overflow-hidden origin-top-right"
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-base">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-done overflow-hidden flex items-center justify-center">
                                <span className="text-lg font-bold text-white">
                                    {(profile?.name || "U").charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-darks truncate">
                                    {profile?.name || "User"}
                                </p>
                                <p className="text-xs text-tinted truncate">{profile?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setOpen(false)
                                navigate("/profile")
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-darks hover:bg-base transition-colors text-left"
                        >
                            <UserRound className="h-4 w-4 text-tinted" /> Profil
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-wrong hover:bg-wrong/10 transition-colors text-left border-t border-base"
                        >
                            <LogOut className="h-4 w-4" /> Keluar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default UserMenu