import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { LogIn, CheckCircle2 } from "lucide-react"
import logo from "../../assets/logo.svg"
import vye from "../../assets/vye.png"
import { useAuth } from "../../lib/auth-context"
import { safeNext } from "../../lib/redirect"
import PasswordInput from "../../components/passwordInput"
import { alertPop, fadeSlide } from "../../lib/motion"

function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login } = useAuth()

    const stateData = location.state as { verified?: boolean; email?: string } | null
    const nextParams = new URLSearchParams(location.search)
    const nextPath = safeNext(nextParams.get("next"))
    const nextQuery = nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""
    const [email, setEmail] = useState(stateData?.email || "")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await login(email, password)
            navigate(nextPath, { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-base">
            <div className="hidden lg:flex flex-1 flex-col justify-center px-3.5 bg-white from-darks/5 via-base to-darks/5">
                <div className="max-w-lg ml-20">
                    <img src={vye} alt="Ilustrasi" className="mb-8 h-72 object-contain" />
                    <img src={logo} alt="Formaly" className="h-10 w-auto mb-2" />
                    <h1 className="text-4xl font-bold text-darks leading-tight">
                        Buat lebih mudah.
                    </h1>
                    <p className="text-2xl text-tinted">
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

                    <motion.div
                        variants={fadeSlide}
                        initial="hidden"
                        animate="show"
                        className="bg-white rounded-3xl lg:rounded-2xl border border-second p-4 lg:p-8 shadow-sm"
                    >
                        <h2 className="text-2xl font-bold text-darks">Masuk</h2>
                        <p className="text-sm text-tinted mt-1 mb-6">
                            Masuk untuk melanjutkan ke akun kamu
                        </p>

                        <AnimatePresence>
                        {stateData?.verified && (
                            <motion.div
                                key="verified"
                                variants={alertPop}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                role="alert"
                                className="flex items-center gap-2 text-sm text-done bg-done/10 border border-done/20 rounded-xl lg:rounded-lg px-3.5 py-3 mb-4"
                            >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Email kamu berhasil diverifikasi! Silakan masuk ke akun kamu.</span>
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                key="login-error"
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
                                <label htmlFor="email" className="block text-sm font-medium text-darks mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
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
                                    autoComplete="current-password"
                                    placeholder="Masukkan password"
                                    value={password}
                                    onChange={setPassword}
                                />
                                <a href={`/forgot-password${nextQuery}`} className="text-xs text-done hover:underline mt-1.5 inline-block">
                                    Lupa password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                {loading ? "Memproses..." : "Masuk"}
                            </button>
                        </form>

                        <Link to={`/register${nextQuery}`} className="btn bg-base text-darks border border-second hover:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                            Belum punya akun? Daftar
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Login
