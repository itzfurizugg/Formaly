import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { LogIn, CheckCircle2 } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth-context"
import { safeNext } from "../../lib/redirect"
import PasswordInput from "../../components/passwordInput"
import { alertPop, fadeSlide } from "../../lib/motion"
import { Spinner } from "../../components/loading"
import vye from "../../assets/vye.png"


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
        <div className="min-h-screen flex flex-col lg:flex-row bg-base">
            <div className="hidden lg:flex flex-1 flex-col justify-start relative overflow-hidden bg-darks dark:bg-second text-white">
                <div className="flex items-start gap-6 px-10 pt-20 pb-10">
                    <div className="min-w-0 max-w-lg">
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

                {/* Absolute + offset negatif: gambarnya meluber melewati tepi
                kanan & bawah panel, lalu dipotong `overflow-hidden` Wrapper
                panel — jadi potongan gambar ikut mengikuti ukuran panel. */}
                <img
                    src={vye}
                    alt="Ilustrasi"
                    className="pointer-events-none absolute z-0 -right-35 -bottom-35 w-auto max-w-none h-[min(62%,26rem)] lg:h-[min(68%,30rem)] xl:h-[min(74%,34rem)] object-contain object-right-bottom select-none"
                />
            </div>

            <div className="lg:hidden w-full flex-1 rounded-none bg-darks dark:bg-second px-5 sm:px-10 py-8 flex flex-col justify-end text-white dark:text-white">
                <img src={logo} alt="Formaly" className="h-6 w-auto brightness-0 invert mb-6 self-start" />
                <h1 className="text-xl font-bold leading-tight">
                    Buat lebih mudah.
                    <span className="block mt-1">Kerjakan dengan gampang.</span>
                </h1>
                <p className="text-xs text-white/75 dark:text-white/75 mt-3 max-w-md leading-relaxed">
                    Kelola formulir dan data dengan cepat, mudah, dan efisien.
                    Platform all-in-one untuk kebutuhan form kamu.
                </p>
            </div>

            <div className="flex flex-col items-center justify-start px-4 py-6 sm:px-6 lg:px-0 lg:py-0 lg:min-h-screen lg:flex-1 lg:justify-center lg:flex-row">
                <div className="w-full max-w-xl lg:px-3.5">
                    <motion.div
                        variants={fadeSlide}
                        initial="hidden"
                        animate="show"
                        className="bg-base lg:bg-white dark:bg-transparent lg:dark:bg-second rounded-2xl border border-transparent lg:border-second p-1 lg:p-8 shadow-none lg:shadow-sm w-full mb-10 lg:mb-0"
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
                                    className="input w-full bg-second border-darks/10 dark:bg-second lg:dark:bg-base dark:border-darks/10 focus:border-done focus:outline-none transition-colors"
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
                                    <Spinner size={16} />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                {loading ? "Memproses..." : "Masuk"}
                            </button>
                        </form>

                        <Link to={`/register${nextQuery}`} className="btn bg-base text-darks border border-second hover:bg-darks/20 dark:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                            Belum punya akun? Daftar
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Login