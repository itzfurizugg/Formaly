import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { CheckCircle2, Send, ShieldCheck, Sparkles, XCircle } from "lucide-react"
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
                                className="bg-white border border-second rounded-2xl lg:rounded-xl p-6 shadow-sm"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="font-semibold text-darks">Verifikasi email kamu</h2>
                                </div>
                                <p className="text-sm text-tinted mb-5">
                                    Kami akan mengirim kode OTP ke <span className="font-semibold text-darks">{email || "email kamu"}</span> untuk memastikan kepemilikan akun.
                                </p>

                                {!otpSent ? (
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !email}
                                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                                    >
                                        {sendingOtp ? <Spinner size={16} /> : <Send className="h-4 w-4" />}
                                        {sendingOtp ? "Mengirim OTP..." : "Kirim Kode OTP"}
                                    </button>
                                ) : (
                                    <form onSubmit={handleVerify} className="space-y-4">
                                        <div className="flex w-full max-w-xs gap-2 sm:gap-3 justify-center mx-auto" onPaste={handleOtpPaste}>
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
                                                    className="input flex-1 min-w-0 h-12 w-full text-center text-lg font-semibold bg-base border-second focus:border-done focus:outline-none transition-colors"
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={verifying || upgrading || !isComplete}
                                            className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                                        >
                                            {verifying || upgrading ? <Spinner size={16} /> : <ShieldCheck className="h-4 w-4" />}
                                            {verifying ? "Memverifikasi..." : upgrading ? "Mengupgrade..." : "Verifikasi & Upgrade"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={resendLoading || resendCountdown > 0}
                                            className="btn bg-base text-darks border border-second hover:bg-second transition-colors w-full disabled:opacity-60 rounded-full lg:rounded-xl"
                                        >
                                            {resendLoading ? (
                                                <Spinner size={16} />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            {resendCountdown > 0
                                                ? `Kirim ulang OTP dalam (${resendCountdown}s)`
                                                : "Tidak menerima kode? Kirim ulang"}
                                        </button>
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
