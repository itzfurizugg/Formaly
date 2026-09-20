import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { UserPlus } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth-context"
import { safeNext } from "../../lib/redirect"
import PasswordInput from "../../components/passwordInput"
import { alertPop, fadeSlide } from "../../lib/motion"
import { Spinner } from "../../components/loading"

function Register() {
    const navigate = useNavigate()
    const location = useLocation()
    const { register } = useAuth()
    const nextPath = safeNext(new URLSearchParams(location.search).get("next"))
    const nextQuery = nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError("Password minimal 8 karakter.")
            return
        }

        if (password !== confirmPassword) {
            setError("Konfirmasi password tidak cocok.")
            return
        }

        setLoading(true)
        try {
            await register(name, email, password)
            navigate("/auth", { state: { email, next: nextPath } })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal daftar, coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-base">
            <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden bg-darks dark:bg-second text-white">
                {/* Dekorasi lembut: blob gradasi di pojok panel */}
                {/* <span className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-white dark:bg-second blur-2xl" />
                <span className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-done/10 blur-2xl" /> */}

                <div className="flex flex-col h-full px-3.5 relative z-10 py-16">
                    <div className="max-w-lg ml-10">
                        <div className="flex items-start gap-3 mb-10">
                            <img src={logo} alt="Formaly" className="h-9 w-auto brightness-0 invert" />
                        </div>

                        <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                            Buat lebih mudah.
                            <span className="block text-white mt-2">Kerjakan dengan gampang.</span>
                        </h1>

                        <p className="text-white text-lg mt-6 max-w-md leading-relaxed">
                            Kelola formulir dan data dengan cepat, mudah, dan efisien.
                            Platform all-in-one untuk kebutuhan form kamu.
                        </p>
                    </div>
                </div>

                {/* <img
                    src={ash}
                    alt="Ilustrasi"
                    className="pointer-events-none absolute right-0 bottom-0 z-0 w-1/2 lg:w-3/5 xl:w-3/4 max-w-none object-contain object-right-bottom"
                /> */}
            </div>

            <div className="lg:hidden w-full rounded-none bg-darks px-5 sm:px-10 py-8 flex flex-col justify-center text-white dark:text-second">
                <img src={logo} alt="Formaly" className="h-6 w-auto brightness-0 invert mb-6 self-start" />
                <h1 className="text-xl font-bold leading-tight">
                    Buat lebih mudah.
                    <span className="block mt-1">Kerjakan dengan gampang.</span>
                </h1>
                <p className="text-xs text-white/75 dark:text-second/75 mt-3 max-w-md leading-relaxed">
                    Kelola formulir dan data dengan cepat, mudah, dan efisien.
                    Platform all-in-one untuk kebutuhan form kamu.
                </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-end lg:justify-center px-4 py-6 sm:px-6 lg:px-0 lg:py-0 lg:min-h-screen lg:flex-row">
                <div className="w-full max-w-xl lg:px-3.5">
                    <motion.div
                        variants={fadeSlide}
                        initial="hidden"
                        animate="show"
                        className="bg-base lg:bg-white dark:bg-second rounded-2xl border border-transparent lg:border-second p-1 lg:p-8 shadow-none lg:shadow-sm w-full"
                    >
                        <h2 className="text-2xl font-bold text-darks">Daftar</h2>
                        <p className="text-sm text-tinted mt-1 mb-6">
                            Daftar untuk mulai membuat form anda!
                        </p>

                        <AnimatePresence>
                        {error && (
                            <motion.div
                                key="register-error"
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
                                <label htmlFor="name" className="block text-sm font-medium text-darks mb-1.5">
                                    Nama
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    className="input w-full bg-second border-darks/10 dark:bg-base dark:border-darks/30 focus:border-done focus:outline-none transition-colors"
                                    placeholder="John Smith"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-darks mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="input w-full bg-second border-darks/10 dark:bg-base dark:border-darks/30 focus:border-done focus:outline-none transition-colors"
                                    placeholder="nama@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-darks mb-1.5">
                                    Password
                                </label>
                                <PasswordInput
                                    id="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    placeholder="Minimal 8 karakter"
                                    value={password}
                                    onChange={setPassword}
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-darks mb-1.5">
                                    Konfirmasi Password
                                </label>
                                <PasswordInput
                                    id="confirmPassword"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChange={setConfirmPassword}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                            >
                                {loading ? (
                                    <Spinner size={16} />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}
                                {loading ? "Memproses..." : "Daftar"}
                            </button>
                        </form>

                        <Link to={`/login${nextQuery}`} className="btn bg-base text-darks border border-second hover:bg-darks/20 dark:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                            Sudah punya akun? Masuk
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Register