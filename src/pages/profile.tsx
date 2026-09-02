import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    LogOut,
    Save,
    UserRound,
    Mail,
    Lock,
    Eye,
    EyeOff,
    KeyRound,
    X,
    ChevronRight,
    Info,
    Sparkles,
} from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { showAlert } from "../lib/alerts"
import ModalPortal from "../components/modalPortal"
import { AnimatePresence, motion } from "motion/react"
import { Spinner } from "../components/loading"
import { modalBackdrop, modalPanel } from "../lib/motion"

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

    return (
        <AnimatePresence>
            {open && (
                <ModalPortal key="profile-modal">
                    <motion.div
                        variants={modalBackdrop}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="fixed inset-0 z-50 flex items-center justify-center px-3.5"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className="absolute inset-0 bg-darks/50"
                            onClick={onClose}
                        />
                        <motion.div
                            variants={modalPanel}
                            className="relative bg-white border border-second rounded-2xl lg:rounded-xl w-full max-w-md p-5 shadow-xl"
                        >
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
                        </motion.div>
                    </motion.div>
                </ModalPortal>
            )}
        </AnimatePresence>
    )
}

function Profile() {
    const navigate = useNavigate()
    const { user, profile, logout, updateProfile, updatePassword, loading: authLoading } = useAuth()
    const [loggingOut, setLoggingOut] = useState(false)

    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    // --- form akun ---
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)

    // --- ganti password ---
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPw, setShowPw] = useState(false)
    const [pwSaving, setPwSaving] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) navigate("/login")
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (profile) {
            setName(profile.name || "")
            setEmail(profile.email || "")
        }
    }, [profile])

    const closeAccountModal = () => {
        setShowAccountModal(false)
        if (profile) {
            setName(profile.name || "")
            setEmail(profile.email || "")
        }
    }

    const closePasswordModal = () => {
        setShowPasswordModal(false)
        setNewPassword("")
        setConfirmPassword("")
        setShowPw(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            showAlert("Username tidak boleh kosong.", "error")
            return
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            showAlert("Format email tidak valid.", "error")
            return
        }
        setSaving(true)
        const emailChanged = email.trim() !== (profile?.email ?? "")
        try {
            await updateProfile(name.trim(), email.trim())
            showAlert(
                emailChanged
                    ? "Profil berhasil diperbarui. Periksa email baru jika konfirmasi diperlukan."
                    : "Profil berhasil diperbarui.",
                "success"
            )
            setTimeout(() => setShowAccountModal(false), 1200)
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal memperbarui profil.", "error")
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 6) {
            showAlert("Kata sandi minimal 6 karakter.", "error")
            return
        }
        if (newPassword !== confirmPassword) {
            showAlert("Konfirmasi kata sandi tidak cocok.", "error")
            return
        }
        setPwSaving(true)
        try {
            await updatePassword(newPassword)
            showAlert("Kata sandi berhasil diubah.", "success")
            setNewPassword("")
            setConfirmPassword("")
            setTimeout(() => closePasswordModal(), 1200)
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal mengubah kata sandi.", "error")
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
        <div className="flex flex-col items-center px-3.5 py-2">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="bg-white border border-second p-5 rounded-2xl lg:rounded-xl mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                        <div className="w-20 h-20 shrink-0 rounded-full bg-done flex items-center justify-center">
                            <span className="text-4xl font-bold text-base">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col min-w-0 gap-1.5">
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <h2 className="text-xl font-bold text-darks truncate">{profile?.name || "User"}</h2>
                                <span
                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1 rounded-full ${ROLE_STYLE[role] || ROLE_STYLE.user
                                        }`}
                                >
                                    {/* <ShieldCheck className="h-3 w-3" /> */}
                                    {ROLE_LABEL[role] || "User"}
                                </span>
                            </div>
                            <p className="text-sm text-tinted truncate flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {profile?.email}
                            </p>
                            <span className="inline-flex items-center gap-1 text-xs text-tinted">
                                {/* <CalendarDays className="h-3 w-3" /> */}
                                Bergabung pada {formatJoinDate(profile?.created_at)}
                            </span>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="btn bg-wrong/10 text-wrong border-none hidden lg:flex sm:ml-auto hover:opacity-90 transition-opacity shrink-0 rounded-full"
                        >
                            {loggingOut ? (
                                <Spinner size={16} />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            {loggingOut ? "Keluar..." : "Keluar"}
                        </button>
                    </div>
                </div>

                {/* Menu: buka modal */}
                <div className="bg-white border border-second mb-3 divide-y divide-second rounded-2xl lg:rounded-xl overflow-hidden">
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

                    {role === "user" && (
                        <button
                            onClick={() => navigate("/upgrade-to-creator")}
                            className="w-full flex items-center gap-3 p-4 hover:bg-base transition-colors text-left"
                        >
                            <div className="w-9 h-9 shrink-0 rounded-full bg-done/10 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-done" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-darks">Upgrade ke Creator</p>
                                <p className="text-xs text-tinted">Jadilah yang membuat formulir untuk banyak orang.</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                        </button>
                    )}

                    <button
                        onClick={() => navigate("/credit")}
                        className="w-full flex items-center gap-3 p-4 hover:bg-base transition-colors text-left"
                    >
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            <Info className="h-4 w-4 text-darks" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-darks">Tentang Kami</p>
                            <p className="text-xs text-tinted">Kenalan dengan yang membuat Formaly.</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="btn flex w-full py-6 mx-auto bg-base text-wrong border-wrong/20 border-2 mt-2 lg:hidden hover:opacity-90 transition-opacity rounded-2xl"
                >
                    {loggingOut ? (
                        <Spinner size={16} />
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
                        className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                    >
                        {saving ? (
                            <Spinner size={16} />
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
                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                    >
                        {pwSaving ? (
                            <Spinner size={16} />
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