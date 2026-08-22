import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Check, Clock, ZoomIn, X } from "lucide-react"
import PageIndicator from "../../components/pageindicator"
import { RichText } from "../../components/richText"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { loginUrl } from "../../lib/redirect"
import ModalPortal from "../../components/modalPortal"
import { alertPop, modalBackdrop, modalPanel } from "../../lib/motion"

interface Option {
    id: string
    option_text: string
    is_correct?: boolean
}

interface Question {
    id: string
    question_text: string
    question_type: string
    score_value: number
    image_question?: string | null
    is_required?: boolean
    question_options: Option[]
}

interface Answer {
    [key: string]: string | string[]
}

interface LocationState {
    current?: number
    answers?: Answer
    deadline?: number
}

function FormPage() {
    const { formId } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const location = useLocation()
    const locationState = location.state as LocationState | null

    const [questions, setQuestions] = useState<Question[]>([])
    const [formMeta, setFormMeta] = useState<{ title: string; duration: number; randomize_questions?: boolean | null } | null>(null)
    const [current, setCurrent] = useState(locationState?.current || 0)
    const [answers, setAnswers] = useState<Answer>(locationState?.answers || {})
    const [timeLeft, setTimeLeft] = useState(300)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [modalImage, setModalImage] = useState<string | null>(null)
    const [hasTimer, setHasTimer] = useState(false)
    const autoSubmitted = useRef(false)
    const deadlineRef = useRef<number | null>(null)

    const handleSubmit = useCallback(async (allowRequiredSkip = false) => {
        if (!user || !formId) return
        setSubmitting(true)
        setError(null)

        if (!allowRequiredSkip) {
            const unanswered = questions.find((q) => {
                if (!q.is_required) return false
                const ans = answers[q.id]
                if (ans === undefined) return true
                if (Array.isArray(ans)) return ans.length === 0
                return String(ans).trim() === ""
            })
            if (unanswered) {
                setSubmitting(false)
                setError("Masih ada soal wajib yang belum dijawab. Periksa soal bertanda *.")
                setCurrent(questions.indexOf(unanswered))
                return
            }
        }

        let totalScore = 0
        for (const q of questions) {
            const ans = answers[q.id]
            if (ans === undefined) continue
            if (q.question_type === "text") continue

            const selected = Array.isArray(ans) ? ans : [ans]
            const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)

            if (selected.length === correct.length && selected.every((id) => correct.includes(id))) {
                totalScore += Number(q.score_value) || 0
            }
        }

        const { data: subData, error: subErr } = await supabase.from("submissions").insert({
            user_id: user.id,
            form_id: formId,
            total_score: totalScore,
            status: 'SUBMITTED',
            submitted_at: new Date().toISOString()
        }).select("id").single()

        if (subErr) {
            setSubmitting(false)
            setError(subErr.message || "Gagal mengirim jawaban. Coba lagi.")
            return
        }
        const submissionId = subData.id

        for (const q of questions) {
            const ans = answers[q.id]
            if (ans === undefined) continue

            let scoreObtained = 0
            if (q.question_type !== "text") {
                const selected = Array.isArray(ans) ? ans : [ans]
                const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
                if (selected.length === correct.length && selected.every((id) => correct.includes(id))) {
                    scoreObtained = Number(q.score_value) || 0
                }
            }

            let insertError
            if (q.question_type === "text") {
                ; ({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    answer_text: String(ans),
                    score_obtained: scoreObtained,
                }))
            } else if (Array.isArray(ans)) {
                ; ({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    selected_options: ans,
                    score_obtained: scoreObtained,
                }))
            } else {
                ; ({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    selected_option_id: ans,
                    score_obtained: scoreObtained,
                }))
            }

            if (insertError) {
                setSubmitting(false)
                setError(insertError.message || "Gagal menyimpan jawaban. Coba lagi.")
                return
            }
        }

        setSubmitting(false)
        navigate("/history")
    }, [user, formId, questions, answers, navigate])

    const loadForm = useCallback(async () => {
        setLoading(true)
        setNotFound(false)
        const { data: formData } = await supabase
            .from("forms")
            .select("title, duration, status, randomize_questions")
            .eq("id", formId)
            .single()

        if (!formData) {
            setNotFound(true)
            setLoading(false)
            return
        }

        if (String(formData.status).toLowerCase() !== "published") {
            setNotFound(true)
            setLoading(false)
            return
        }

        setFormMeta(formData)
        const dur = Number(formData.duration) || 0
        setHasTimer(dur > 0)
        if (dur > 0) {
            if (locationState?.deadline) {
                deadlineRef.current = locationState.deadline
            } else {
                deadlineRef.current = Date.now() + dur * 60 * 1000
            }
            setTimeLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)))
        } else {
            setTimeLeft(300)
        }

        const { data: qData } = await supabase
            .from("questions")
            .select(`
                id,
                question_text,
                question_type,
                score_value,
                image_question,
                is_required,
                question_options (
                    id,
                    option_text,
                    is_correct
                )
            `)
            .eq("form_id", formId)
            .order("order_index", { ascending: true })

        // Pengaturan "acak urutan soal": di-shuffle sekali saat load, jadi urutan
        // konsisten selama sesi pengerjaan (navigasi maju/mundur tidak berubah-ubah).
        const nextQuestions = ((qData as Question[]) || []).slice()
        if (formData.randomize_questions) {
            for (let i = nextQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[nextQuestions[i], nextQuestions[j]] = [nextQuestions[j], nextQuestions[i]]
            }
        }
        if (nextQuestions.length > 0) {
            setQuestions(nextQuestions)
        }

        setLoading(false)
    }, [formId, locationState])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }
        if (!formId) {
            navigate("/")
            return
        }
        loadForm()
    }, [user, authLoading, formId, navigate, location, loadForm])

    useEffect(() => {
        if (!hasTimer || !deadlineRef.current || loading) return
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.round((deadlineRef.current! - Date.now()) / 1000))
            setTimeLeft(remaining)
            if (remaining <= 0) clearInterval(timer)
        }, 1000)
        return () => clearInterval(timer)
    }, [loading, hasTimer])

    useEffect(() => {
        if (autoSubmitted.current) return
        if (hasTimer && timeLeft === 0 && !submitting && questions.length > 0 && user && formId) {
            autoSubmitted.current = true
            const id = window.setTimeout(() => handleSubmit(true), 0)
            return () => window.clearTimeout(id)
        }
    }, [timeLeft, submitting, questions, user, formId, handleSubmit, hasTimer])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    const question = questions[current]
    const total = questions.length

    const selectOption = (optionId: string) => {
        if (!question) return
        if (question.question_type === "multiple_choice") {
            const current = answers[question.id]
            const selected = Array.isArray(current) ? current : []
            const next = selected.includes(optionId)
                ? selected.filter((id) => id !== optionId)
                : [...selected, optionId]
            setAnswers({ ...answers, [question.id]: next })
        } else {
            setAnswers({ ...answers, [question.id]: optionId })
        }
    }

    const next = () => {
        if (current < total - 1) setCurrent(current + 1)
    }

    const prev = () => {
        if (current > 0) setCurrent(current - 1)
    }

    const goToList = () => {
        navigate('/form/list', { state: { current, answers, formId, questions, deadline: deadlineRef.current || undefined } })
    }

    return (
        <>
            {!authLoading && !loading && (
            notFound ? (
                <div className="flex flex-col items-center justify-center min-h-screen px-4">
                    <p className="text-tinted mb-4">Form tidak ditemukan atau belum dipublikasikan.</p>
                    <button onClick={() => navigate("/")} className="btn bg-darks text-white border-none">
                        Kembali
                    </button>
                </div>
            ) : !question || total === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-screen px-4">
                    <p className="text-tinted mb-4">Form tidak memiliki soal.</p>
                    <button onClick={() => navigate("/")} className="btn bg-darks text-white border-none">
                        Kembali
                    </button>
                </div>
            ) : (
        <div className="flex flex-col items-center px-4 pt-6 pb-28 md:pb-6">
            <div className="w-full max-w-3xl xl:mt-15">
                <div className="p-2 mb-3 hidden sm:block">
                    <h1 className="text-xl xl:text-4xl font-bold text-darks">{formMeta?.title || "Form"}</h1>
                    <p className="text-xs text-tinted mt-1">
                        {current + 1} dari {total} soal
                    </p>
                </div>

                {/* key=current agar animasi diulang tiap pindah soal */}
                <motion.div
                    key={current}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-base-300 lg:bg-white border border-second p-1 lg:p-6 lg:shadow-sm rounded-xl"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-2">
                            <p className="text-sm text-tinted font-semibold">Soal {current + 1}</p>
                            {question.is_required && <span className="text-red-600 font-bold text-xl">*</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${!hasTimer
                                    ? "bg-second text-tinted"
                                    : timeLeft <= 60
                                        ? "bg-red-500/10 text-red-600"
                                        : "bg-done/10 text-done"
                                    }`}
                            >
                                <Clock className="h-3.5 w-3.5" />
                                {hasTimer ? formattedTime : "Tanpa Waktu"}
                            </span>
                        </div>
                    </div>

                    <div className="text-base font-medium text-darks leading-relaxed">
                        <RichText html={question.question_text} />
                    </div>
                    {/* Menampilkan Gambar Soal menggunakan field image_question */}
                    {question.image_question && (
                        <div className="mt-4 relative group rounded-lg overflow-hidden border border-second bg-base w-fit">
                            <img
                                src={question.image_question}
                                alt="Ilustrasi Soal"
                                className="max-h-60 object-contain cursor-pointer"
                                onClick={() => setModalImage(question.image_question ?? null)}
                            />
                            <button
                                onClick={() => setModalImage(question.image_question ?? null)}
                                className="absolute bottom-2 right-2 bg-base/70 hover:bg-darks text-medium text-darks hover:text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"
                            >
                                <ZoomIn className="h-4 w-4" /> Perbesar
                            </button>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        {question.question_type === "text" ? (
                            <textarea
                                value={Array.isArray(answers[question.id]) ? "" : (answers[question.id] as string) || ""}
                                onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                                rows={5}
                                placeholder="Tulis jawabanmu di sini..."
                                className="textarea w-full bg-white border-second focus:border-done focus:outline-none transition-colors text-sm resize-y"
                            />
                        ) : (
                            question.question_options?.map((option) => {
                                const isMulti = question.question_type === "multiple_choice"
                                const selected = isMulti
                                    ? Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.id)
                                    : answers[question.id] === option.id
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => selectOption(option.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${selected
                                            ? "bg-darks border-darks text-white font-medium"
                                            : "bg-white border-second text-darks hover:border-darks/50"
                                            }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isMulti ? "rounded-md" : "rounded-full"
                                                    } ${selected ? "border-darks bg-darks" : "border-tinted"}`}
                                            >
                                                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                            </span>
                                            <RichText as="span" html={option.option_text} />
                                        </span>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </motion.div>

                {/* NOTE: LAYOUT DESKTOP (>= md) — PageIndicator & tombol Kirim inline di bawah konten */}
                <div className="hidden md:flex items-center justify-between mt-4">
                    <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} />
                    {current === total - 1 && (
                        <button
                            onClick={() => handleSubmit()}
                            disabled={submitting}
                            className="btn text-white h-12 min-h-0 px-4 bg-done border-none rounded-xl hover:opacity-90 disabled:opacity-25"
                        >
                            {submitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            {submitting ? "Mengirim..." : "Kirim"}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                {error && (
                    <motion.div
                        key="form-error-desktop"
                        variants={alertPop}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                    >
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>

            {/* NOTE: LAYOUT MOBILE (< md) — Dock fixed di bawah, latar bg-second */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-second border-t border-base px-4 py-3 md:hidden">
                <div className="w-full max-w-3xl mx-auto flex items-center justify-between mb-3">
                    <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} />
                    {current === total - 1 && (
                        <button
                            onClick={() => handleSubmit()}
                            disabled={submitting}
                            className="btn text-white h-12 min-h-0 px-4 bg-done border-none rounded-full hover:opacity-90 disabled:opacity-25"
                        >
                            {submitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            {submitting ? "Mengirim..." : "Kirim"}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                {error && (
                    <motion.div
                        key="form-error-mobile"
                        variants={alertPop}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="mt-3 flex flex-col items-stretch gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                    >
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>

            {/* Modal Zoom Gambar */}
            <AnimatePresence>
            {modalImage && (
                <ModalPortal>
                <motion.div
                    variants={modalBackdrop}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                >
                    <motion.div variants={modalPanel} className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                        <button
                            onClick={() => setModalImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 bg-darks/50 p-2 rounded-full"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={modalImage}
                            alt="Zoom Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
                        />
                    </motion.div>
                </motion.div>
                </ModalPortal>
            )}
            </AnimatePresence>
        </div>
            )
            )}
        </>
    )
}

export default FormPage