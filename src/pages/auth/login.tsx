import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { LogIn } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth"

function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await login(email, password)
            navigate("/")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-base">
            <div className="hidden lg:flex flex-1 flex-col justify-center px-16 bg-gradient-to-br from-darks/5 via-base to-darks/5">
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

            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-xl">
                    <div className="flex justify-center mb-8 lg:hidden">
                        <img src={logo} alt="Formaly" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white rounded-2xl border border-second p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-darks">Masuk</h2>
                        <p className="text-sm text-tinted mt-1 mb-6">
                            Masuk untuk melanjutkan ke akun kamu
                        </p>

                        {error && (
                            <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                                {error}
                            </div>
                        )}

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
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <a href="/forgot-password" className="text-xs text-done hover:underline mt-1.5 inline-block">
                                    Lupa password?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                {loading ? "Memproses..." : "Masuk"}
                            </button>
                        </form>

                        <Link to="/register" className="btn bg-base text-darks border border-second hover:bg-second w-full mt-2">
                            Belum punya akun? Daftar
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login