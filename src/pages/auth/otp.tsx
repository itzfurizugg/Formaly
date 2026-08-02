import { useState, useRef, type KeyboardEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ShieldCheck, ArrowLeft, RotateCcw } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth"

const OTP_LENGTH = 6

function Otp() {
    const location = useLocation()
    const navigate = useNavigate()
    const { verifyOtp } = useAuth()
    const email = (location.state as { email?: string })?.email || ""

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return
        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)
        if (value && index < OTP_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
        const newOtp = Array(OTP_LENGTH).fill("")
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i]
        }
        setOtp(newOtp)
        const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1)
        inputsRef.current[nextIndex]?.focus()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const code = otp.join("")
        if (code.length !== OTP_LENGTH) {
            setError("Masukkan kode OTP yang valid.")
            return
        }
        setLoading(true)
        try {
            await verifyOtp(email, code)
            navigate("/")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verifikasi gagal, coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    const isComplete = otp.every((d) => d !== "")

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
                            to="/register"
                            className="inline-flex items-center gap-1 text-xs text-tinted hover:text-darks transition-colors mb-4"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Kembali
                        </Link>

                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-8 w-auto text-done" />
                            <h2 className="text-3xl font-bold text-darks">Verifikasi</h2>
                        </div>
                        <p className="text-sm text-tinted mt-2 mb-6">
                            Masukkan kode OTP yang dikirim ke {email || "email kamu"}
                        </p>

                        {error && (
                            <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputsRef.current[i] = el }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        required
                                        className="input w-10 h-12 text-center text-lg font-semibold bg-base border-second focus:border-done focus:outline-none transition-colors"
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !isComplete}
                                className="btn bg-darks text-base border-none w-full mt-6 hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4" />
                                )}
                                {loading ? "Memverifikasi..." : "Verifikasi"}
                            </button>
                        </form>

                        <button type="button" className="btn bg-base text-darks border border-second hover:bg-second w-full mt-2">
                            <RotateCcw className="h-4 w-4" />
                            Tidak menerima kode? Kirim ulang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Otp
