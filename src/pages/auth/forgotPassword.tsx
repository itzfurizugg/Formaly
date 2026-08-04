import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, MailCheck, KeyRound } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth"

function ForgotPassword() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await resetPassword(email)
            setSent(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengirim email, coba lagi.")
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

            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-xl">
                    <div className="flex justify-center mb-8 lg:hidden">
                        <img src={logo} alt="Formaly" className="h-10 w-auto" />
                    </div>

                    <div className="bg-white rounded-2xl border border-second p-8 shadow-sm">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1 text-xs text-tinted hover:text-darks transition-colors mb-4"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Kembali
                        </Link>

                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl font-bold text-darks">Lupa Password</h2>
                        </div>
                        <p className="text-sm text-tinted mt-2 mb-6">
                            Masukkan email kamu, dan kami akan mengirimkan tautan untuk mengatur ulang password.
                        </p>

                        {sent ? (
                            <div className="flex flex-col items-center text-center py-6">
                                <MailCheck className="h-12 w-12 text-done mb-4" />
                                <h3 className="text-lg font-bold text-darks">Email Terkirim</h3>
                                <p className="text-sm text-tinted mt-2 mb-6">
                                    Kami telah mengirim tautan reset password ke <span className="font-medium text-darks">{email}</span>. Silakan cek kotak masuk kamu.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setSent(false); setEmail("") }}
                                    className="btn bg-base text-darks border border-second hover:bg-second w-full"
                                >
                                    Kirim ulang
                                </button>
                            </div>
                        ) : (
                            <>
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

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                                    >
                                        {loading ? (
                                            <span className="loading loading-spinner loading-sm" />
                                        ) : (
                                            <KeyRound className="h-4 w-4" />
                                        )}
                                        {loading ? "Mengirim..." : "Kirim Tautan Reset"}
                                    </button>
                                </form>

                                <Link to="/login" className="btn bg-base text-darks border border-second hover:bg-second w-full mt-2">
                                    Sudah ingat? Masuk
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
