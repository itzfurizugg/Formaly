import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { UserPlus } from "lucide-react"
import logo from "../../assets/logo.svg"
import ash from "../../assets/ash.png"
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
        <div className="min-h-screen flex bg-base">
            <div className="hidden lg:flex flex-1 flex-col justify-center px-3.5 bg-white from-darks/5 via-base to-darks/5">
                <div className="max-w-lg ml-20">
                    <img src={ash} alt="Ilustrasi" className="mb-8 h-72 object-contain" />
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
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
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

                        <Link to={`/login${nextQuery}`} className="btn bg-base text-darks border border-second hover:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                            Sudah punya akun? Masuk
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Register
