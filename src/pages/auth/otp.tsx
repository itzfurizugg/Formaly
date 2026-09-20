import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ShieldCheck, RotateCcw, CheckCircle2 } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth-context"
import { safeNext } from "../../lib/redirect"
import type { EmailOtpType } from "@supabase/supabase-js"
import { alertPop, easeOutExpo, fadeSlide } from "../../lib/motion"
import BackButton from "../../components/backButton"
import { Spinner } from "../../components/loading"

const OTP_LENGTH = 6

function friendlyOtpError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    if (/token has expired or is invalid|invalid otp|otp expired|expired token/i.test(msg)) {
        return "Kode OTP salah atau sudah kedaluwarsa. Tekan 'Kirim ulang' untuk mendapatkan kode baru."
    }
    if (/rate limit|too many requests|over rate|429/i.test(msg)) {
        return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi."
    }
    if (/signups not allowed|no user found/i.test(msg)) {
        return "Email belum terdaftar. Silakan daftar terlebih dahulu."
    }
    return msg || "Terjadi kesalahan, coba lagi."
}

function Otp() {
    const location = useLocation()
    const navigate = useNavigate()
    const { verifyOtp, resendOtp, sendOtp, logout } = useAuth()

    const stateData = location.state as { email?: string; type?: EmailOtpType; next?: string } | null
    const nextPath = safeNext(stateData?.next)
    const nextQuery = nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : ""
    const [email, setEmail] = useState(stateData?.email || "")
    const otpType = stateData?.type || "signup"

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""))
    const [loading, setLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState<string | null>(null)
    const [resendCountdown, setResendCountdown] = useState(otpType === "email" ? 30 : 0)
    const [error, setError] = useState<string | null>(null)
    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        if (resendCountdown <= 0) return
        const timer = setInterval(() => {
            setResendCountdown((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [resendCountdown])

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
        setResendSuccess(null)

        if (!email) {
            setError("Email wajib diisi untuk memverifikasi OTP.")
            return
        }

        const code = otp.join("")
        if (code.length !== OTP_LENGTH) {
            setError("Masukkan kode OTP yang valid.")
            return
        }

        setLoading(true)
        try {
            await verifyOtp(email, code, otpType)
            if (otpType === "email") {
                // Login via OTP: session sudah aktif, arahkan langsung ke tujuan.
                navigate(nextPath, { replace: true })
            } else {
                // Verifikasi email (signup): logout lalu user masuk dengan password.
                await logout()
                navigate(`/login${nextQuery}`, { state: { verified: true, email } })
            }
        } catch (err) {
            setError(friendlyOtpError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (!email) {
            setError("Email wajib diisi untuk mengirim ulang OTP.")
            return
        }
        setResendLoading(true)
        setError(null)
        setResendSuccess(null)
        try {
            if (otpType === "email") {
                await sendOtp(email)
            } else {
                await resendOtp(email, otpType as "signup" | "email_change")
            }
            setResendSuccess("Kode OTP baru telah dikirim ke email kamu.")
            setResendCountdown(60)
        } catch (err) {
            setError(friendlyOtpError(err))
        } finally {
            setResendLoading(false)
        }
    }

    const isComplete = otp.every((d) => d !== "") && Boolean(email)

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-base overflow-x-hidden">
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
                    src={vye}
                    alt="Ilustrasi"
                    className="pointer-events-none absolute right-0 bottom-0 z-0 w-1/2 lg:w-3/5 xl:w-3/4 max-w-none object-contain object-right-bottom"
                /> */}
            </div>

            <div className="lg:hidden w-full rounded-none bg-darks px-5 sm:px-10 py-4 flex flex-col justify-center text-white dark:text-second">
                <img src={logo} alt="Formaly" className="h-6 w-auto brightness-0 invert self-start" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-start px-4 py-2 sm:px-6 lg:px-0 lg:py-0 lg:min-h-screen lg:justify-center lg:flex-row">
                <div className="w-full max-w-xl lg:px-3.5">
                    <motion.div
                        variants={fadeSlide}
                        initial="hidden"
                        animate="show"
                        className="bg-base lg:bg-white dark:bg-second rounded-2xl border border-transparent lg:border-second p-1 lg:p-8 shadow-none lg:shadow-sm w-full"
                    >
                        <BackButton to={`/login${nextQuery}`} className="-ml-2"/>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-darks">Verifikasi OTP</h2>
                        </div>
                        <p className="text-sm text-tinted mt-2 mb-6">
                            Masukkan kode OTP yang dikirim ke <span className="font-semibold text-darks">{email || "email kamu"}</span>
                        </p>

                        {!stateData?.email && (
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-xs font-medium text-darks mb-1">
                                    Alamat Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="nama@email.com"
                                    className="input w-full bg-second border-darks/10 focus:border-done focus:outline-none transition-colors text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    key="otp-error"
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

                            {resendSuccess && (
                                <motion.div
                                    key="otp-resend"
                                    variants={alertPop}
                                    initial="hidden"
                                    animate="show"
                                    exit="exit"
                                    role="alert"
                                    className="flex items-center gap-2 text-sm text-done bg-done/10 border border-done/20 rounded-xl lg:rounded-lg px-3.5 py-3 mb-4"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span>{resendSuccess}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit}>
                            <div className="flex w-full max-w-xs gap-2 sm:gap-3 justify-center mx-auto" onPaste={handlePaste}>
                                {otp.map((digit, i) => (
                                    <motion.input
                                        key={i}
                                        ref={(el) => { inputsRef.current[i] = el }}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, ease: easeOutExpo, delay: Math.min(i * 0.05, 0.3) }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        required
                                        className="input flex-1 min-w-0 h-12 w-full text-center text-lg font-semibold bg-second border-darks/10 focus:border-done focus:outline-none transition-colors"
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !isComplete}
                                className="btn bg-darks text-base border-none w-full mt-6 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                            >
                                {loading ? (
                                    <Spinner size={16} />
                                ) : (
                                    <ShieldCheck className="h-4 w-4" />
                                )}
                                {loading ? "Memverifikasi..." : "Verifikasi OTP"}
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendLoading || resendCountdown > 0 || !email}
                            className="btn bg-base text-darks border border-second hover:bg-white dark:bg-second transition-colors w-full mt-2 disabled:opacity-60 rounded-full lg:rounded-xl"
                        >
                            {resendLoading ? (
                                <Spinner size={16} />
                            ) : (
                                <RotateCcw className="h-4 w-4" />
                            )}
                            {resendCountdown > 0
                                ? `Kirim ulang OTP dalam (${resendCountdown}s)`
                                : "Tidak menerima kode? Kirim ulang"}
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Otp

