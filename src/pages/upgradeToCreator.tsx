import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { CheckCircle2, Send, ShieldCheck, XCircle, Mail, RefreshCw, Clock } from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { supabase } from "../lib/supabase"
import { alertPop, easeOutExpo, fadeSlide, listContainer, listItem } from "../lib/motion"
import { Spinner } from "../components/loading"
import BackButton from "../components/backButton"

const MIN_ACCOUNT_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

type Step = "age" | "otp" | "done"

// Menghitung sisa hari sebelum akun memenuhi syarat (pembulatan ke atas).
function remainingDays(createdAt?: string | null): number {
    if (!createdAt) return 0
    const created = new Date(createdAt).getTime()
    const threshold = Date.now() - MIN_ACCOUNT_DAYS * DAY_MS
    if (created <= threshold) return 0
    const msLeft = created - threshold
    return Math.ceil(msLeft / DAY_MS)
}

interface AgeStatus {
    eligible: boolean
    remaining: number
}

function friendlyCreatorError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    if (/belum berumur 7 hari|tunggu .* hari lagi/i.test(msg)) {
        return "Akun kamu belum berumur 7 hari. Tunggu beberapa hari lagi, lalu coba kembali."
    }
    if (/otp email belum tervalidasi|verifikasi otp/i.test(msg)) {
        return "Verifikasi OTP belum terkonfirmasi. Masukkan kode OTP yang benar terlebih dahulu."
    }
    if (/token has expired or is invalid|invalid otp|otp expired/i.test(msg)) {
        return "Kode OTP salah atau sudah kedaluwarsa. Kirim ulang untuk mendapatkan kode baru."
    }
    if (/rate limit|too many requests|over rate|429/i.test(msg)) {
        return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi."
    }
    return msg || "Terjadi kesalahan, coba lagi."
}

export default function UpgradeToCreator() {
    const navigate = useNavigate()
    const { user, profile, loading: authLoading, sendOtp, verifyOtp, refreshProfile } = useAuth()

    const [step, setStep] = useState<Step>("age")
    const [age, setAge] = useState<AgeStatus>({ eligible: false, remaining: 0 })
    const [checkingAge, setCheckingAge] = useState(true)

    const [sendingOtp, setSendingOtp] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [resendCountdown, setResendCountdown] = useState(0)
    const [resendLoading, setResendLoading] = useState(false)

    const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
    const [verifying, setVerifying] = useState(false)
    const [upgrading, setUpgrading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login?next=%2Fupgrade-to-creator", { replace: true })
            return
        }
    }, [user, authLoading, navigate])

    // Cek usia akun dari profil (source of truth = created_at user).
    useEffect(() => {
        if (authLoading || !user || !profile) return
        setCheckingAge(true)
        const remaining = remainingDays(profile.created_at)
        const eligible = remaining <= 0
        setAge({ eligible, remaining })
        setCheckingAge(false)
    }, [user, profile, authLoading])

    useEffect(() => {
        if (resendCountdown <= 0) return
        const timer = setInterval(() => setResendCountdown((prev) => prev - 1), 1000)
        return () => clearInterval(timer)
    }, [resendCountdown])

    // Sudah creator/admin: tidak perlu upgrade.
    const role = String(profile?.role || "").toLowerCase()
    const alreadyCreator = role === "creator" || role === "admin"

    const email = profile?.email || user?.email || ""

    const handleSendOtp = async () => {
        setError(null)
        setSendingOtp(true)
        try {
            await sendOtp(email)
            setOtpSent(true)
            setResendCountdown(30)
        } catch (err) {
            setError(friendlyCreatorError(err))
        } finally {
            setSendingOtp(false)
        }
    }

    const handleResend = async () => {
        setError(null)
        setResendLoading(true)
        try {
            // Kirim ulang dengan sendOtp: untuk tipe "email" (OTP login),
            // pola yang sama dipakai di halaman /auth.
            await sendOtp(email)
            setResendCountdown(60)
        } catch (err) {
            setError(friendlyCreatorError(err))
        } finally {
            setResendLoading(false)
        }
    }

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return
        const next = [...otp]
        next[index] = value
        setOtp(next)
        if (value && index < otp.length - 1) inputsRef.current[index + 1]?.focus()
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus()
        }
    }

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
        const next = Array(6).fill("")
        for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
        setOtp(next)
        inputsRef.current[Math.min(pasted.length, 5)]?.focus()
    }

    const completeUpgrade = async () => {
        setError(null)
        setUpgrading(true)
        try {
            await supabase.rpc("apply_as_creator")
            await refreshProfile()
            setStep("done")
        } catch (err) {
            setError(friendlyCreatorError(err))
        } finally {
            setUpgrading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const code = otp.join("")
        if (code.length !== 6) {
            setError("Masukkan kode OTP yang valid.")
            return
        }
        setVerifying(true)
        try {
            // verifyOtp(type "email") menghasilkan sesi login dengan claim AMR otp,
            // yang menjadi bukti server-side bahwa OTP sudah tervalidasi.
            await verifyOtp(email, code, "email")
            await completeUpgrade()
        } catch (err) {
            setError(friendlyCreatorError(err))
        } finally {
            setVerifying(false)
        }
    }

    if (authLoading || !user) return null

    const isComplete = otp.every((d) => d !== "") && Boolean(email)

    return (
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
            <div className="w-full max-w-2xl">
                <BackButton
                    to={step === "age" ? "/profile" : undefined}
                    onClick={step !== "age" ? () => setStep("age") : undefined}
                    showOnDesktop
                />

                <motion.div variants={fadeSlide} initial="hidden" animate="show">
                    <div className="flex items-center gap-2.5 mb-1">
                        <h1 className="text-3xl sm:text-4xl font-bold text-darks">Upgrade ke Creator</h1>
                    </div>
                    <p className="text-sm text-tinted mb-6">
                        Kelola formulirmu sendiri. Verifikasi akunmu terlebih dahulu sebelum bisa menjadi creator.
                    </p>
                </motion.div>

                {alreadyCreator && (
                    <motion.div
                        variants={listItem}
                        initial="hidden"
                        animate="show"
                        className="bg-white border border-second rounded-2xl lg:rounded-xl p-6 shadow-sm flex flex-col items-center text-center gap-3"
                    >
                        <CheckCircle2 className="h-10 w-10 text-done" />
                        <p className="font-semibold text-darks">Kamu sudah berstatus {role === "admin" ? "Admin" : "Creator"}.</p>
                        <button
                            onClick={() => navigate("/creator")}
                            className="btn bg-darks text-base border-none mt-2 hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                        >
                            Buka Creator
                        </button>
                    </motion.div>
                )}

                {!alreadyCreator && (
                    <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-4">
                        {/* Step indicator
                        <motion.div variants={listItem} className="flex items-center gap-2 text-xs font-medium text-tinted">
                            <span className={step === "otp" || step === "done" ? "text-done" : "text-done"}>1. Cek usia akun</span>
                            <span className="text-second">—</span>
                            <span className={step === "otp" ? "text-darks font-semibold" : step === "done" ? "text-done" : "text-tinted"}>2. Verifikasi OTP</span>
                            <span className="text-second">—</span>
                            <span className={step === "done" ? "text-done font-semibold" : "text-tinted"}>3. Selesai</span>
                        </motion.div> */}

                        {step === "age" && (
                            <motion.div
                                key="age"
                                variants={fadeSlide}
                                initial="hidden"
                                animate="show"
                                className="bg-white border border-second rounded-2xl lg:rounded-xl p-6 shadow-sm"
                            >
                                <h2 className="font-semibold text-darks mb-2 text-lg">Cek persyaratan akun</h2>
                                {checkingAge ? (
                                    <div className="flex items-center gap-2 text-tinted text-sm py-3">
                                        <Spinner size={16} /> Memeriksa usia akun...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {age.eligible ? (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    {/* <div className="w-5 h-5 bg-pass rounded-full" /> */}
                                                    <CheckCircle2 className="h-5 w-5 text-pass shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-medium text-darks">Akun memenuhi syarat</p>
                                                        <p className="text-sm text-tinted mt-1">
                                                            Akun kamu sudah berumur lebih dari {MIN_ACCOUNT_DAYS} hari. Silakan lanjut ke verifikasi OTP.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setStep("otp")}
                                                    className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                                                >
                                                    Lanjut Verifikasi
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    <XCircle className="h-5 w-5 text-wrong shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-medium text-darks">Akun belum memenuhi syarat</p>
                                                        <p className="text-sm text-tinted mt-1">
                                                            Akun kamu harus berumur minimal {MIN_ACCOUNT_DAYS} hari untuk menjadi creator.
                                                            {age.remaining > 0 && (
                                                                <span className="font-semibold text-darks"> Sisa {age.remaining} hari lagi.</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => navigate("/profile")}
                                                    className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                                                >
                                                    Kembali ke Profil
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === "otp" && (
                            <motion.div
                                key="otp"
                                variants={fadeSlide}
                                initial="hidden"
                                animate="show"
                                className="bg-white dark:bg-second border border-second dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm"
                            >
                                <div className="flex flex-row items-start gap-3.5 sm:gap-4 mb-6 text-left">
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-done/10 dark:bg-done/20 text-done flex items-center justify-center">
                                        <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg sm:text-xl font-bold text-darks mb-1">Verifikasi Email</h2>
                                        <p className="text-xs sm:text-sm text-tinted leading-relaxed">
                                            {otpSent ? (
                                                <>
                                                    Masukkan 6 digit kode verifikasi yang telah dikirim ke{" "}
                                                    <span className="inline-flex items-center gap-1 font-semibold text-darks bg-base dark:bg-base/70 px-2 py-0.5 rounded-full border border-second dark:border-white/10 text-xs">
                                                        {email || "email kamu"}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    Kami akan mengirim kode OTP ke{" "}
                                                    <span className="inline-flex items-center gap-1 font-semibold text-darks bg-base dark:bg-base/70 px-2 py-0.5 rounded-full border border-second dark:border-white/10 text-xs">
                                                        {email || "email kamu"}
                                                    </span>{" "}
                                                    untuk konfirmasi akun.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {!otpSent ? (
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !email}
                                        className="btn h-12 bg-darks text-base hover:bg-darks/90 border-none w-full font-semibold rounded-xl sm:rounded-2xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
                                    >
                                        {sendingOtp ? <Spinner size={16} /> : <Send className="h-4 w-4" />}
                                        {sendingOtp ? "Mengirim Kode OTP..." : "Kirim Kode OTP"}
                                    </button>
                                ) : (
                                    <form onSubmit={handleVerify} className="space-y-6">
                                        <div
                                            className="flex w-full max-w-sm gap-2 sm:gap-2.5 justify-center mx-auto"
                                            onPaste={handleOtpPaste}
                                        >
                                            {otp.map((digit, i) => (
                                                <motion.input
                                                    key={i}
                                                    ref={(el) => { inputsRef.current[i] = el }}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.25, ease: easeOutExpo, delay: Math.min(i * 0.04, 0.2) }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    required
                                                    aria-label={`Digit ${i + 1}`}
                                                    className={`w-11 sm:w-13 h-13 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl border-2 transition-all outline-none ${
                                                        digit
                                                            ? "bg-done/5 dark:bg-done/10 border-done text-darks shadow-sm"
                                                            : "bg-base dark:bg-base/60 border-second dark:border-white/10 text-darks hover:border-tinted/50 focus:border-done focus:ring-4 focus:ring-done/15"
                                                    }`}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                />
                                            ))}
                                        </div>

                                        <div className="space-y-3 pt-1">
                                            <button
                                                type="submit"
                                                disabled={verifying || upgrading || !isComplete}
                                                className="btn h-12 bg-darks text-base hover:bg-darks/90 border-none w-full font-semibold rounded-xl sm:rounded-2xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {verifying || upgrading ? <Spinner size={16} /> : <ShieldCheck className="h-4 w-4" />}
                                                {verifying ? "Memverifikasi..." : upgrading ? "Mengupgrade..." : "Verifikasi & Upgrade"}
                                            </button>

                                            <div className="flex items-center justify-center pt-1">
                                                {resendCountdown > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-tinted bg-base dark:bg-base/70 border border-second dark:border-white/10 px-3.5 py-1.5 rounded-full font-medium">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Kirim ulang dalam <span className="font-semibold text-darks font-mono">{resendCountdown}s</span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleResend}
                                                        disabled={resendLoading}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-done hover:text-done/80 hover:underline transition-colors disabled:opacity-60 cursor-pointer py-1 px-2"
                                                    >
                                                        {/* {resendLoading ? (
                                                            <Spinner size={14} />
                                                        ) : (
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        )} */}
                                                        {resendLoading ? "Mengirim ulang..." : "Tidak menerima kode? Kirim ulang"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        )}

                        {step === "done" && (
                            <motion.div
                                key="done"
                                variants={fadeSlide}
                                initial="hidden"
                                animate="show"
                                className="bg-white border border-second rounded-2xl lg:rounded-xl p-6 shadow-sm flex flex-col items-center text-center gap-3"
                            >
                                <CheckCircle2 className="h-12 w-12 text-done" />
                                <h2 className="text-xl font-bold text-darks">Selamat! Akun kamu kini Creator.</h2>
                                <p className="text-sm text-tinted">Silakan masuk ke area creator untuk mulai membuat dan mengelola formulir.</p>
                                <button
                                    onClick={() => navigate("/creator")}
                                    className="btn bg-darks text-base border-none mt-2 hover:opacity-90 transition-opacity rounded-full lg:rounded-xl"
                                >
                                    Masuk ke Creator
                                </button>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    key="upgrade-error"
                                    variants={alertPop}
                                    initial="hidden"
                                    animate="show"
                                    exit="exit"
                                    role="alert"
                                    className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl lg:rounded-lg px-3.5 py-3"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
