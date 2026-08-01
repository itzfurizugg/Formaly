import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Check, Clock, ZoomIn, X } from "lucide-react"
import PageIndicator from "../../components/pageindicator"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

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
    question_options: Option[]
}

interface Answer {
    [key: string]: string | string[]
}

interface LocationState {
    formId?: string
    current?: number
    answers?: Answer
}

function FormPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const locationState = location.state as LocationState | null
    const formId = locationState?.formId

    const [questions, setQuestions] = useState<Question[]>([])
    const [formMeta, setFormMeta] = useState<{ title: string; duration: number } | null>(null)
    const [current, setCurrent] = useState(locationState?.current || 0)
    const [answers, setAnswers] = useState<Answer>(locationState?.answers || {})
    const [timeLeft, setTimeLeft] = useState(300)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [modalImage, setModalImage] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        if (!formId) {
            navigate("/")
            return
        }
        loadForm()
    }, [user, authLoading, formId, navigate])

    async function loadForm() {
        setLoading(true)
        const { data: formData } = await supabase
            .from("forms")
            .select("title, duration")
            .eq("id", formId)
            .single()

        if (formData) {
            setFormMeta(formData)
            setTimeLeft(formData.duration * 60)
        }

        const { data: qData } = await supabase
            .from("questions")
            .select(`
                id,
                question_text,
                question_type,
                score_value,
                image_question,
                question_options (
                    id,
                    option_text,
                    is_correct
                )
            `)
            .eq("form_id", formId)
            .order("order_index", { ascending: true })

        if (qData && qData.length > 0) {
            setQuestions(qData as Question[])
        }

        setLoading(false)
    }

    useEffect(() => {
        if (timeLeft <= 0 || loading) return
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [loading])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg" />
            </div>
        )
    }

    const question = questions[current]
    const total = questions.length

    if (!question || total === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <p className="text-tinted mb-4">Form tidak memiliki soal.</p>
                <button onClick={() => navigate("/")} className="btn bg-darks text-white border-none">
                    Kembali
                </button>
            </div>
        )
    }

    const selectOption = (optionId: string) => {
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
        navigate('/form/list', { state: { current, answers, formId, questions } })
    }

    const handleSubmit = async () => {
        if (!user || !formId) return
        setSubmitting(true)
        setError(null)

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
            status: 'SUBMITTED'
        }).select("id").single()

        if (subErr) {
            setSubmitting(false)
            if (subErr.code === "23505") {
                setError("Kamu sudah pernah mengerjakan form ini.")
            } else {
                setError(subErr.message || "Gagal mengirim jawaban. Coba lagi.")
            }
            return
        }
        const submissionId = subData.id

        for (const q of questions) {
            const ans = answers[q.id]
            if (ans === undefined) continue

            let insertError = null
            if (q.question_type === "text") {
                ;({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    answer_text: String(ans),
                }))
            } else if (Array.isArray(ans)) {
                ;({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    selected_options: ans,
                }))
            } else {
                ;({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    selected_option_id: ans,
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
    }

    return (
        <div className="flex flex-col items-center px-4 pt-6 pb-28 md:pb-6">
            <div className="w-full max-w-3xl xl:mt-15">
                <div className="p-2 mb-3 hidden sm:block">
                    <h1 className="text-xl xl:text-4xl font-bold text-darks">{formMeta?.title || "Form"}</h1>
                    <p className="text-xs text-tinted mt-1">
                        {current + 1} dari {total} soal
                    </p>
                </div>

                <div className="bg-white border border-second p-6 shadow-sm rounded-none">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-tinted font-semibold">Soal {current + 1}</p>
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                                timeLeft <= 60
                                    ? "bg-red-500/10 text-red-600"
                                    : "bg-done/10 text-done"
                            }`}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {formattedTime}
                        </span>
                    </div>

                    <p className="text-base font-medium text-darks leading-relaxed">
                        {question.question_text}
                    </p>

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
                                className="absolute bottom-2 right-2 bg-darks/70 hover:bg-darks text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"
                            >
                                <ZoomIn className="h-4 w-4" /> Perbesar
                            </button>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        {question.question_options?.map((option) => {
                            const isMulti = question.question_type === "multiple_choice"
                            const selected = isMulti
                                ? Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.id)
                                : answers[question.id] === option.id
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => selectOption(option.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                                        selected
                                            ? "bg-darks border-darks text-white font-medium"
                                            : "bg-white border-second text-darks hover:border-darks/50"
                                    }`}
                                >
                                    <span className="flex items-center gap-3">
                                        <span
                                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                isMulti ? "rounded-md" : "rounded-full"
                                            } ${selected ? "border-darks bg-darks" : "border-tinted"}`}
                                        >
                                            {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                        </span>
                                        {option.option_text}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* NOTE: LAYOUT DESKTOP (>= md) — PageIndicator & tombol Kirim inline di bawah konten */}
                <div className="hidden md:flex items-center justify-between mt-4">
                    <PageIndicator total={total} current={current} answers={answers} onPrev={prev} onNext={next} onListClick={goToList} />
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn text-white h-12 min-h-0 px-4 bg-done border-none rounded-none hover:opacity-90 disabled:opacity-25"
                    >
                        {submitting ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        {submitting ? "Mengirim..." : "Kirim"}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 flex flex-col md:flex-row items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                        {error.includes("sudah pernah") && (
                            <button
                                onClick={() => navigate("/history")}
                                className="btn btn-sm text-white bg-darks border-none rounded-none hover:opacity-90"
                            >
                                Lihat Riwayat
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* NOTE: LAYOUT MOBILE (< md) — Dock fixed di bawah, latar bg-second */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-second border-t border-base px-4 py-3 md:hidden mb-5">
                <div className="w-full max-w-3xl mx-auto flex items-center justify-between">
                    <PageIndicator total={total} current={current} answers={answers} onPrev={prev} onNext={next} onListClick={goToList} />
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn text-white h-12 min-h-0 px-4 bg-done border-none rounded-none hover:opacity-90 disabled:opacity-25"
                    >
                        {submitting ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        {submitting ? "Mengirim..." : "Kirim"}
                    </button>
                </div>

                {error && (
                    <div className="mt-3 flex flex-col items-stretch gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                        {error.includes("sudah pernah") && (
                            <button
                                onClick={() => navigate("/history")}
                                className="btn btn-sm text-white bg-darks border-none rounded-none hover:opacity-90"
                            >
                                Lihat Riwayat
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Zoom Gambar */}
            {modalImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
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
                    </div>
                </div>
            )}
        </div>
    )
}

export default FormPage