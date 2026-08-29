import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { KeyRound, CheckCircle2 } from "lucide-react"
import logo from "../../assets/logo.svg"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import PasswordInput from "../../components/passwordInput"
import { alertPop, easeOutExpo } from "../../lib/motion"
import { showAlert } from "../../lib/alerts"

function friendlyError(message: string): string {
    const msg = message.toLowerCase()
    if (msg.includes("expired") || msg.includes("invalid")) return "Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."
    if (msg.includes("at least")) return "Password minimal 8 karakter."
    if (msg.includes("different from the old password")) return "Password baru harus berbeda dari password lama."
    return message
}

function ResetPassword() {
    const navigate = useNavigate()
    const { updatePassword } = useAuth()

    const [checking, setChecking] = useState(true)
    const [sessionValid, setSessionValid] = useState(false)
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        let mounted = true

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return
            if (session) {
                setSessionValid(true)
                setChecking(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" && session) {
                setSessionValid(true)
                setChecking(false)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (!checking && !sessionValid) {
            showAlert("Link reset password sudah kedaluwarsa. Silakan minta tautan baru untuk melanjutkan.", "error")
        }
    }, [checking, sessionValid])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError("Password minimal 8 karakter.")
            return
        }
        if (password !== confirm) {
            setError("Konfirmasi password tidak sesuai.")
            return
        }

        setLoading(true)
        try {
            await updatePassword(password)
            setSuccess(true)
            setTimeout(() => navigate("/login"), 3000)
        } catch (err) {
            setError(err instanceof Error ? friendlyError(err.message) : "Gagal memperbarui password, coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-base">
            <div className="hidden lg:flex flex-1 flex-col justify-center px-3.5 bg-gradient-to-br from-darks/5 via-base to-darks/5">
                <div className="max-w-lg ml-20">
                    <img src={logo} alt="Formaly" className="h-10 w-auto mb-8" />
                    <h1 className="text-4xl font-bold text-darks leading-tight">
                        Buat lebih mudah.
                    </h1>
                    <p className="text-2xl text-tinted mt-2">
                        Kerjakan dengan gampang.
                    </p>
                    <p className="text-base text-tinted mt-6 leading-relaxed max-w-md">
                        Kelola formulir dan data dengan cepat, mudah, dan efisien.
                        Platform all-in-one untuk kebutuhan form kamu.
                    </p>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-3.5 py-12">
                <div className="w-full max-w-xl">
                    <div className="flex justify-center mb-8 lg:hidden">
                        <img src={logo} alt="Formaly" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white rounded-3xl lg:rounded-2xl border border-second p-8 shadow-sm">
                        <AnimatePresence mode="wait">
                        {checking ? (
                            <motion.div
                                key="checking"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, ease: easeOutExpo }}
                                className="flex flex-col items-center justify-center py-16 px-3.5"
                            >
                                <div className="w-full max-w-xs">
                                    <div className="relative h-1.5 w-full bg-second rounded-full overflow-hidden">
                                        <motion.div
                                            className="absolute h-full bg-darks rounded-full"
                                            initial={{ left: "-35%", right: "100%" }}
                                            animate={{ left: ["-35%", "0%", "100%"], right: ["100%", "0%", "-35%"] }}
                                            transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-tinted mt-4">Memeriksa tautan...</p>
                            </motion.div>
                        ) : success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3, ease: easeOutExpo }}
                                className="flex flex-col items-center text-center py-6"
                            >
                                <CheckCircle2 className="h-12 w-12 text-done mb-4" />
                                <h2 className="text-2xl font-bold text-darks">Password Diperbarui</h2>
                                <p className="text-sm text-tinted mt-2 mb-6">
                                    Password kamu berhasil diubah. Kamu akan dialihkan ke halaman masuk.
                                </p>
                                <Link
                                    to="/login"
                                    className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                                >
                                    Masuk Sekarang
                                </Link>
                            </motion.div>
                        ) : !sessionValid ? (
                            <motion.div
                                key="invalid"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3, ease: easeOutExpo }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <KeyRound className="h-8 w-auto text-wrong" />
                                    <h2 className="text-3xl font-bold text-darks">Reset Password</h2>
                                </div>
                                <p className="text-sm text-tinted mt-2 mb-6">
                                    Tautan reset password tidak valid atau sudah kedaluwarsa.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate("/forgot-password")}
                                    className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                                >
                                    Request Link Baru
                                </button>

                                <Link to="/login" className="btn bg-base text-darks border border-second hover:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                                    Kembali ke Login
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3, ease: easeOutExpo }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-3xl font-bold text-darks">Reset Password</h2>
                                </div>
                                <p className="text-sm text-tinted mt-2 mb-6">
                                    Masukkan password baru untuk akun kamu.
                                </p>

                                <AnimatePresence>
                                {error && (
                                    <motion.div
                                        key="reset-error"
                                        variants={alertPop}
                                        initial="hidden"
                                        animate="show"
                                        exit="exit"
                                        role="alert"
                                        className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl lg:rounded-lg px-3.5 py-3 mb-4"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-medium text-darks mb-1.5">
                                            Password Baru
                                        </label>
                                        <PasswordInput
                                            id="new-password"
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            placeholder="Minimal 8 karakter"
                                            value={password}
                                            onChange={setPassword}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-darks mb-1.5">
                                            Konfirmasi Password
                                        </label>
                                        <PasswordInput
                                            id="confirm-password"
                                            required
                                            autoComplete="new-password"
                                            placeholder="Ulangi password baru"
                                            value={confirm}
                                            onChange={setConfirm}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                                    >
                                        {loading ? (
                                            <span className="loading loading-spinner loading-sm" />
                                        ) : (
                                            <a></a>
                                        )}
                                        {loading ? "Menyimpan..." : "Simpan Password"}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ResetPassword
