import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    LogOut,
    Save,
    UserRound,
    Mail,
    ShieldCheck,
    CalendarDays,
    Lock,
    Eye,
    EyeOff,
    KeyRound,
    X,
    ChevronRight,
} from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { supabase } from "../lib/supabase" // sesuaikan path kalau beda
import ModalPortal from "../components/modalPortal"

const ROLE_LABEL: Record<string, string> = {
    admin: "Admin",
    creator: "Creator",
    user: "User",
}

const ROLE_STYLE: Record<string, string> = {
    admin: "bg-wrong/10 text-wrong",
    creator: "bg-[#007DCC]/10 text-[#007DCC]",
    user: "bg-done/10 text-done",
}

function formatJoinDate(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

// --- Modal wrapper ---
function Modal({
    open,
    onClose,
    title,
    icon,
    children,
}: {
    open: boolean
    onClose: () => void
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        document.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <ModalPortal>
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-darks/50"
                onClick={onClose}
            />
            <div className="relative bg-white border border-second rounded-none w-full max-w-md p-5 shadow-xl animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            {icon}
                        </div>
                        <h3 className="text-base font-bold text-darks">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-tinted hover:text-darks transition-colors p-1"
                        aria-label="Tutup"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
        </ModalPortal>
    )
}

function Profile() {
    const navigate = useNavigate()
    const { user, profile, logout, updateProfile, loading: authLoading } = useAuth()
    const [loggingOut, setLoggingOut] = useState(false)

    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    // --- form akun ---
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // --- ganti password ---
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPw, setShowPw] = useState(false)
    const [pwSaving, setPwSaving] = useState(false)
    const [pwMessage, setPwMessage] = useState<string | null>(null)
    const [pwError, setPwError] = useState<string | null>(null)

    useEffect(() => () => {
        if (messageTimer.current) clearTimeout(messageTimer.current)
    }, [])

    useEffect(() => {
        if (!authLoading && !user) navigate("/login")
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (profile) {
            setName(profile.name || "")
            setEmail(profile.email || "")
        }
    }, [profile])

    const resetAccountFeedback = () => {
        setError(null)
        setMessage(null)
    }

    const closeAccountModal = () => {
        setShowAccountModal(false)
        resetAccountFeedback()
        if (profile) {
            setName(profile.name || "")
            setEmail(profile.email || "")
        }
    }

    const resetPasswordFeedback = () => {
        setPwError(null)
        setPwMessage(null)
    }

    const closePasswordModal = () => {
        setShowPasswordModal(false)
        setNewPassword("")
        setConfirmPassword("")
        setShowPw(false)
        resetPasswordFeedback()
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setMessage(null)
        if (!name.trim()) {
            setError("Username tidak boleh kosong.")
            return
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Format email tidak valid.")
            return
        }
        setSaving(true)
        try {
            await updateProfile(name.trim(), email.trim())
            setMessage("Profil berhasil diperbarui.")
            if (messageTimer.current) clearTimeout(messageTimer.current)
            messageTimer.current = setTimeout(() => {
                setMessage(null)
                setShowAccountModal(false)
            }, 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memperbarui profil.")
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setPwError(null)
        setPwMessage(null)
        if (newPassword.length < 6) {
            setPwError("Kata sandi minimal 6 karakter.")
            return
        }
        if (newPassword !== confirmPassword) {
            setPwError("Konfirmasi kata sandi tidak cocok.")
            return
        }
        setPwSaving(true)
        try {
            const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
            if (pwErr) throw pwErr
            setPwMessage("Kata sandi berhasil diubah.")
            setNewPassword("")
            setConfirmPassword("")
            setTimeout(() => {
                closePasswordModal()
            }, 1500)
        } catch (err) {
            setPwError(err instanceof Error ? err.message : "Gagal mengubah kata sandi.")
        } finally {
            setPwSaving(false)
        }
    }

    const handleLogout = async () => {
        setLoggingOut(true)
        await logout()
        navigate("/login")
    }

    if (!user) return null

    const role = (profile?.role as string | undefined) || "user"

    return (
        <div className="flex flex-col items-center px-2 py-5">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="bg-white border border-second p-5 rounded-none mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="w-20 h-20 shrink-0 rounded-full bg-done flex items-center justify-center">
                            <span className="text-4xl font-bold text-base">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col min-w-0 gap-1.5">
                            <h2 className="text-xl font-bold text-darks truncate">{profile?.name || "User"}</h2>
                            <p className="text-sm text-tinted truncate flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {profile?.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span
                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        ROLE_STYLE[role] || ROLE_STYLE.user
                                    }`}
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    {ROLE_LABEL[role] || "User"}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-tinted">
                                    <CalendarDays className="h-3 w-3" />
                                    Bergabung {formatJoinDate(profile?.created_at)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="btn bg-wrong/10 text-wrong border-none hidden lg:flex sm:ml-auto hover:opacity-90 transition-opacity shrink-0"
                        >
                            {loggingOut ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            {loggingOut ? "Keluar..." : "Keluar"}
                        </button>
                    </div>
                </div>

                {/* Menu: buka modal */}
                <div className="bg-white border border-second rounded-none mb-3 divide-y divide-second">
                    <button
                        onClick={() => setShowAccountModal(true)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-base transition-colors text-left"
                    >
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            <UserRound className="h-4 w-4 text-darks" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-darks">Informasi Akun</p>
                            <p className="text-xs text-tinted">Ubah username dan email kamu</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                    </button>

                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-base transition-colors text-left"
                    >
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            <Lock className="h-4 w-4 text-darks" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-darks">Ubah Kata Sandi</p>
                            <p className="text-xs text-tinted">Perbarui kata sandi akun kamu</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="btn bg-wrong/10 text-wrong border-none w-full mt-2 lg:hidden hover:opacity-90 transition-opacity"
                >
                    {loggingOut ? (
                        <span className="loading loading-spinner loading-sm" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? "Keluar..." : "Keluar"}
                </button>
            </div>

            {/* Modal: Informasi Akun */}
            <Modal
                open={showAccountModal}
                onClose={closeAccountModal}
                title="Informasi Akun"
                icon={<UserRound className="h-4 w-4 text-darks" />}
            >
                <p className="text-xs text-tinted mb-4">
                    Perbarui username dan email kamu. Perubahan email akan memerlukan verifikasi ulang.
                </p>

                {message && (
                    <div role="alert" className="text-sm text-pass bg-pass/5 border border-pass/20 rounded-lg px-4 py-3 mb-4">
                        {message}
                    </div>
                )}
                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xs font-medium text-darks mb-1.5">
                            Username
                        </label>
                        <div className="relative">
                            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input w-full pl-3 bg-base border border-second focus:border-done focus:outline-none transition-colors"
                                placeholder="Nama kamu"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-darks mb-1.5">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full pl-3 bg-base border border-second focus:border-done focus:outline-none transition-colors"
                                placeholder="nama@email.com"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {saving ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </form>
            </Modal>

            {/* Modal: Ubah Kata Sandi */}
            <Modal
                open={showPasswordModal}
                onClose={closePasswordModal}
                title="Ubah Kata Sandi"
                icon={<Lock className="h-4 w-4 text-darks" />}
            >
                <p className="text-xs text-tinted mb-4">Gunakan kata sandi yang kuat dan belum pernah dipakai sebelumnya.</p>

                {pwMessage && (
                    <div role="alert" className="text-sm text-pass bg-pass/5 border border-pass/20 rounded-lg px-4 py-3 mb-4">
                        {pwMessage}
                    </div>
                )}
                {pwError && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {pwError}
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword" className="block text-xs font-medium text-darks mb-1.5">
                            Kata Sandi Baru
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                id="newPassword"
                                type={showPw ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="input w-full pl-3 pr-3 bg-base border border-second focus:border-done focus:outline-none transition-colors"
                                placeholder="Minimal 6 karakter"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-tinted"
                                tabIndex={-1}
                            >
                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-xs font-medium text-darks mb-1.5">
                            Konfirmasi Kata Sandi
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                id="confirmPassword"
                                type={showPw ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input w-full pl-3 bg-base border border-second focus:border-done focus:outline-none transition-colors"
                                placeholder="Ulangi kata sandi baru"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={pwSaving}
                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {pwSaving ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <Lock className="h-4 w-4" />
                        )}
                        {pwSaving ? "Menyimpan..." : "Simpan Kata Sandi"}
                    </button>
                </form>
            </Modal>
        </div>
    )
}

export default Profile