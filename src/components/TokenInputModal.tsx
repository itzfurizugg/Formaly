import { useEffect, useState } from "react"
import { AnimatePresence, motion, type Variants } from "motion/react"
import { KeyRound, X } from "lucide-react"
import { startFormSubmission } from "../lib/formStart"
import { showAlert } from "../lib/alerts"
import { easeOutExpo } from "../lib/motion"
import ModalPortal from "./modalPortal"

const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.25, ease: easeOutExpo } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
}

const panelVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 24 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: easeOutExpo } },
    exit: { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.18, ease: "easeIn" } },
}

interface TokenInputModalProps {
    open: boolean
    onClose: () => void
    formId: string
    /** Dipanggil saat RPC sukses; membawa submission_id untuk masuk ke halaman pengerjaan. */
    onStarted: (submissionId: string) => void
}

/**
 * Modal input token sebelum mulai mengerjakan form yang membutuhkan token.
 * Memanggil RPC start_form_submission: sukses → onStarted(submissionId),
 * gagal → pesan error dari Postgres ditampilkan di bawah input.
 */
function TokenInputModal({ open, onClose, formId, onStarted }: TokenInputModalProps) {
    const [code, setCode] = useState("")
    const [starting, setStarting] = useState(false)

    // Reset isi input tiap kali modal dibuka.
    useEffect(() => {
        if (!open) return
        setCode("")
        setStarting(false)
    }, [open])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && !starting && onClose()
        document.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [open, onClose, starting])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const token = code.trim()
        if (!token || starting) return
        setStarting(true)

        try {
            const submissionId = await startFormSubmission(formId, token)
            onStarted(submissionId)
            onClose()
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal memulai pengerjaan. Coba lagi.", "error")
        } finally {
            setStarting(false)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <ModalPortal key="token-input-modal">
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="fixed inset-0 z-50 flex items-center justify-center px-3.5"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="absolute inset-0 bg-darks/50" onClick={() => !starting && onClose()} />
                        <motion.div
                            variants={panelVariants}
                            className="relative bg-white border border-second rounded-2xl lg:rounded-xl w-full max-w-md p-5 shadow-xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-bold text-darks">Masukkan Token</h3>
                                </div>
                                {!starting && (
                                    <button
                                        onClick={onClose}
                                        className="text-tinted hover:text-darks transition-colors p-1"
                                        aria-label="Tutup"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <p className="text-xs text-tinted mb-4">
                                Form ini memerlukan token untuk dikerjakan. Masukkan token yang kamu miliki.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="exam-token" className="block text-xs font-medium text-darks mb-1.5">
                                        Token
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                        <input
                                            id="exam-token"
                                            type="text"
                                            required
                                            autoFocus
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            className="input w-full pl-3 pr-3 bg-base border border-second focus:border-done focus:outline-none transition-colors tracking-widest uppercase"
                                            placeholder="Masukkan token"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={starting || !code.trim()}
                                    className="btn flex w-fit mx-auto bg-darks text-base border-none px-4 mt-2 hover:opacity-90 transition-opacity disabled:opacity-60 rounded-full lg:rounded-xl"
                                >
                                    {starting && <span className="loading loading-spinner loading-sm" />}
                                    {starting ? "Memulai..." : "Verifikasi & Mulai"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                </ModalPortal>
            )}
        </AnimatePresence>
    )
}

export default TokenInputModal
