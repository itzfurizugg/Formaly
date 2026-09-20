import { useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { MailCheck, KeyRound } from "lucide-react"
import logo from "../../assets/logo.svg"
import { useAuth } from "../../lib/auth-context"
import { alertPop, easeOutExpo, fadeSlide } from "../../lib/motion"
import BackButton from "../../components/backButton"
import { Spinner } from "../../components/loading"

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
                    src={vye}
                    alt="Ilustrasi"
                    className="pointer-events-none absolute right-0 bottom-0 z-0 w-1/2 lg:w-3/5 xl:w-3/4 max-w-none object-contain object-right-bottom"
                /> */}
            </div>

            <div className="lg:hidden w-full rounded-none bg-darks px-5 sm:px-10 py-4 flex flex-col justify-center text-white dark:text-second">
                <img src={logo} alt="Formaly" className="h-6 w-auto brightness-0 invert self-start" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-start px-4 py-3 sm:px-6 lg:px-0 lg:py-0 lg:min-h-screen lg:justify-center lg:flex-row">
                <div className="w-full max-w-xl lg:px-3.5">
                    <motion.div
                        variants={fadeSlide}
                        initial="hidden"
                        animate="show"
                        className="bg-base lg:bg-white dark:bg-second rounded-2xl border border-transparent lg:border-second p-1 lg:p-8 shadow-none lg:shadow-sm w-full"
                    >
                        <BackButton to="/login" className="-ml-2"/>

                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl font-bold text-darks">Lupa Password</h2>
                        </div>
                        <p className="text-sm text-tinted mt-2 mb-6">
                            Masukkan email kamu, dan kami akan mengirimkan tautan untuk mengatur ulang password.
                        </p>

                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="sent"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.3, ease: easeOutExpo }}
                                    className="flex flex-col items-center text-center py-6"
                                >
                                    <MailCheck className="h-12 w-12 text-done mb-4" />
                                    <h3 className="text-lg font-bold text-darks">Email Terkirim</h3>
                                    <p className="text-sm text-tinted mt-2 mb-6">
                                        Kami telah mengirim tautan reset password ke <span className="font-medium text-darks">{email}</span>. Silakan cek kotak masuk kamu.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setSent(false); setEmail("") }}
                                        className="btn bg-base text-darks border border-second hover:bg-white dark:bg-second transition-colors w-full rounded-full lg:rounded-xl"
                                    >
                                        Kirim ulang
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.3, ease: easeOutExpo }}
                                >
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                key="forgot-error"
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
                                                className="input w-full bg-second border-darks/10 dark:bg-base dark:border-darks/30 focus:border-done focus:outline-none transition-colors"
                                                placeholder="nama@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
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
                                                <KeyRound className="h-4 w-4" />
                                            )}
                                            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
                                        </button>
                                    </form>

                                    <Link to="/login" className="btn bg-base text-darks border border-second hover:bg-white dark:bg-second transition-colors w-full mt-2 rounded-full lg:rounded-xl">
                                        Sudah ingat? Masuk
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default ForgotPassword
