import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
    Save,
    UserRound,
    Mail,
    Lock,
    Eye,
    EyeOff,
    KeyRound,
    X,
    ChevronRight,
    Settings,
    FileText,
    CheckCircle2,
    ClipboardList,
    CalendarDays,
    BadgeCheck,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { showAlert } from "../../lib/alerts"
import ModalPortal from "../../components/modalPortal"
import { AnimatePresence } from "motion/react"
import Loading, { Spinner } from "../../components/loading"
import { modalBackdrop, modalPanel, easeOutExpo, listContainer, listItem } from "../../lib/motion"
import BackButton from "../../components/backButton"

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

interface Stats {
    total: number
    active: number
    submissions: number
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
                            className="absolute inset-0 bg-black/50"
                            onClick={onClose}
                        />
                        <motion.div
                            variants={modalPanel}
                            className="relative bg-white dark:bg-second border border-second rounded-2xl lg:rounded-xl w-full max-w-md p-5 shadow-xl"
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

const menuItems = [
    {
        key: "account",
        label: "Informasi Akun",
        desc: "Ubah username dan email kamu",
        icon: UserRound,
        tone: "bg-done/10 text-done",
        action: "setShowAccountModal",
    },
    {
        key: "password",
        label: "Ubah Kata Sandi",
        desc: "Perbarui kata sandi akun kamu",
        icon: Lock,
        tone: "bg-wrong/10 text-wrong",
        action: "setShowPasswordModal",
    },
    {
        key: "settings",
        label: "Pengaturan",
        desc: "Kelola preferensi tampilan dan aplikasi",
        icon: Settings,
        tone: "bg-[#007DCC]/10 text-[#007DCC]",
        action: "navigate/settings",
    },
]

function CreatorProfile() {
    const navigate = useNavigate()
    const { user, profile, updateProfile, updatePassword, loading: authLoading } = useAuth()

    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, submissions: 0 })
    const [statsLoading, setStatsLoading] = useState(true)

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

    useEffect(() => {
        if (!user) return
        const load = async () => {
            const [formsRes, subCountRes] = await Promise.all([
                supabase
                    .from("forms")
                    .select("id, status")
                    .eq("creator_id", user.id),
                supabase
                    .from("submissions")
                    .select("id, forms!inner(creator_id)", { count: "exact", head: true })
                    .eq("forms.creator_id", user.id),
            ])
            const rows = formsRes.data || []
            setStats({
                total: rows.length,
                active: rows.filter((f) => String((f as { status: string }).status).toLowerCase() === "published").length,
                submissions: subCountRes.count || 0,
            })
            setStatsLoading(false)
        }
        load()
    }, [user])

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

    if (!user) return null

    const role = (profile?.role as string | undefined) || "creator"

    const statCards = [
        {
            label: "Total Form",
            value: stats.total,
            desc: "Form dimiliki",
            icon: FileText,
            blobClass: "bg-darks/5",
            iconWrap: "bg-darks/10 text-darks",
        },
        {
            label: "Form Aktif",
            value: stats.active,
            desc: "Sedang dipublikasi",
            icon: CheckCircle2,
            blobClass: "bg-done/10",
            iconWrap: "bg-done/10 text-done",
        },
        {
            label: "Submission",
            value: stats.submissions,
            desc: "Responden form",
            icon: ClipboardList,
            blobClass: "bg-gradient-to-br from-done/5 to-second/30",
            iconWrap: "bg-gradient-to-br from-done/10 to-darks/5 text-done",
        },
    ]

    const handleMenu = (key: string) => {
        if (key === "account") setShowAccountModal(true)
        else if (key === "password") setShowPasswordModal(true)
        else navigate("/settings")
    }

    return (
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
            <div className="w-full max-w-3xl">
                <BackButton to="/creator" />

                <div className="ml-2 mb-4">
                    <h1 className="text-3xl lg:text-5xl font-bold font-display text-darks mb-1">Profil Creator</h1>
                    <p className="text-sm text-tinted">Kelola identitas dan akun creator kamu.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, ease: easeOutExpo }}
                    className="flex flex-col gap-3"
                >
                    {/* ========== HERO ========== */}
                    <motion.div className="relative overflow-hidden bg-white dark:bg-second border border-second rounded-3xl shadow-sm">
                        {/* Banner gradient + blob dekoratif */}
                        <div className="relative h-28 sm:h-36 bg-gradient-to-br from-[#007DCC] via-done to-emerald-400">
                            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15" />
                            <div className="absolute top-6 -left-10 h-32 w-32 rounded-full bg-white/10" />
                            <div className="absolute bottom-0 right-1/4 h-6 w-6 rounded-full bg-white/20" />
                            <div className="absolute top-4 right-1/3 hidden sm:flex h-3 w-3 rounded-full bg-white/25" />
                            <div className="absolute top-10 right-1/2 h-2 w-2 rounded-full bg-white/20" />
                        </div>

                        <div className="px-5 sm:px-7 pb-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-12 sm:-mt-14">
                                <div className="relative shrink-0">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-[#1A2028] p-1.5 shadow-lg">
                                        <div className="w-full h-full rounded-[1.1rem] bg-gradient-to-br from-done to-[#007DCC] flex items-center justify-center">
                                            <span className="text-4xl sm:text-5xl font-bold text-white">
                                                {(profile?.name || "U").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-white dark:bg-[#1A2028] flex items-center justify-center shadow">
                                        <BadgeCheck className="h-5 w-5 text-done" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 pt-3 sm:pt-0 sm:pb-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-2xl sm:text-3xl font-bold text-darks truncate">{profile?.name || "User"}</h2>
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${ROLE_STYLE[role] || ROLE_STYLE.user}`}>
                                            {ROLE_LABEL[role] || "Creator"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-tinted truncate flex items-center gap-1.5 mt-1">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        {profile?.email}
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-xs text-tinted mt-1.5">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        Bergabung pada {formatJoinDate(profile?.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ========== STATS ========== */}
                    {statsLoading ? (
                        <Loading inline />
                    ) : (
                        <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-3 w-full">
                            {statCards.map((card) => (
                                <motion.div key={card.label} variants={listItem} className="min-w-0">
                                    <div className="relative overflow-hidden bg-white dark:bg-second border border-second rounded-2xl shadow-sm p-3 sm:p-4 min-w-0">
                                        <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full ${card.blobClass}`} />
                                        <div className="relative flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-tinted text-[11px] sm:text-sm leading-tight truncate">{card.label}</div>
                                                <div className="text-darks text-2xl sm:text-4xl font-bold mt-1 break-words">{card.value}</div>
                                                <div className="hidden sm:block text-tinted text-[10px] sm:text-xs leading-tight truncate">{card.desc}</div>
                                            </div>
                                            <div className={`shrink-0 rounded-full ${card.iconWrap} p-1.5 sm:p-2 flex`}>
                                                <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* ========== MENU ========== */}
                    <motion.div
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                        className="bg-white dark:bg-second border border-second rounded-3xl overflow-hidden divide-y divide-second shadow-sm"
                    >
                        {menuItems.map((item) => (
                            <motion.div key={item.key} variants={listItem}>
                                <button
                                    onClick={() => handleMenu(item.key)}
                                    className="w-full flex items-center gap-3.5 p-4 sm:p-5 hover:bg-base transition-colors text-left group"
                                >
                                    <div className={`w-11 h-11 shrink-0 rounded-2xl ${item.tone} flex items-center justify-center transition-transform group-active:scale-90`}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-darks">{item.label}</p>
                                        <p className="text-xs text-tinted">{item.desc}</p>
                                    </div>
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-base flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-active:scale-90">
                                        <ChevronRight className="h-4 w-4 text-tinted" />
                                    </div>
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
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
                                className="input w-full pl-3 bg-base dark:bg-base dark:border-darks/30 border border-second focus:border-done focus:outline-none transition-colors"
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
                                className="input w-full pl-3 bg-base dark:bg-base dark:border-darks/30 border border-second focus:border-done focus:outline-none transition-colors"
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
                                className="input w-full pl-3 pr-3 bg-base dark:bg-base dark:border-darks/30 border border-second focus:border-done focus:outline-none transition-colors"
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
                                className="input w-full pl-3 bg-base dark:bg-base dark:border-darks/30 border border-second focus:border-done focus:outline-none transition-colors"
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

export default CreatorProfile