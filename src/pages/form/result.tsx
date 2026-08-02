import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, X, Clock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import Loading from "../../components/loading"
import Filter from "../../components/filter"

interface AnswerRow {
    id: string
    selected_option_id: string | null
    selected_options: string[] | null
    answer_text: string | null
    score_obtained: number | null
    question: {
        id: string
        question_text: string
        question_type: string
        score_value: number
        image_question: string | null
        question_options: { id: string; option_text: string; is_correct: boolean }[]
    } | null
}

interface SubmissionInfo {
    id: string
    total_score: number
    status: string
    started_at: string | null
    submitted_at: string | null
    form: { id: string; title: string; duration: number; passing_score: number | null } | null
    user: { name: string } | null
}

function ResultPage() {
    const { submissionId } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()

    const [info, setInfo] = useState<SubmissionInfo | null>(null)
    const [answers, setAnswers] = useState<AnswerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        if (!submissionId) {
            navigate("/history")
            return
        }
        loadAll()
    }, [user, authLoading, submissionId, navigate])

    async function loadAll() {
        if (!user || !submissionId) return

        const { data: sub } = await supabase
            .from("submissions")
            .select("id, total_score, status, started_at, submitted_at, form:form_id ( id, title, duration, passing_score ), user:user_id ( name )")
            .eq("id", submissionId)
            .eq("user_id", user.id)
            .single()

        if (!sub) {
            setError("Submission tidak ditemukan.")
            setLoading(false)
            return
        }

        setInfo(sub as unknown as SubmissionInfo)

        const { data: ans } = await supabase
            .from("answers")
            .select(`
                id, selected_option_id, selected_options, answer_text, score_obtained,
                question:question_id (
                    id, question_text, question_type, score_value, image_question,
                    question_options ( id, option_text, is_correct )
                )
            `)
            .eq("submission_id", submissionId)

        setAnswers((ans as unknown as AnswerRow[]) || [])
        setLoading(false)
    }

    const typeLabel = (t: string) => {
        if (t === "multiple_choice") return "Pilihan Ganda"
        if (t === "text") return "Isian"
        return "Pilihan Tunggal"
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

    const isCorrect = (a: AnswerRow) => {
        const q = a.question
        if (!q || q.question_type === "text") return false
        const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
        const selected = q.question_type === "multiple_choice"
            ? a.selected_options || []
            : a.selected_option_id ? [a.selected_option_id] : []
        return selected.length === correct.length && selected.every((id) => correct.includes(id))
    }

    if (authLoading || loading) return <Loading />

    if (error) {
        return (
            <div className="flex flex-col items-center px-4 py-10">
                <div className="w-full max-w-2xl">
                    <button
                        onClick={() => navigate("/history")}
                        className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
                    </button>
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3">
                        {error}
                    </div>
                </div>
            </div>
        )
    }

    const correctCount = answers.filter(isCorrect).length
    const textCount = answers.filter((a) => a.question?.question_type === "text").length

    const filterOptions = [
        { value: "correct", label: "Benar" },
        { value: "wrong", label: "Salah" },
        { value: "text", label: "Isian" },
    ]

    const filteredAnswers = answers.filter((a) => {
        if (filter === "correct") return isCorrect(a)
        if (filter === "wrong") return a.question?.question_type !== "text" && !isCorrect(a)
        if (filter === "text") return a.question?.question_type === "text"
        return true
    })

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-4xl">
                <button
                    onClick={() => navigate("/history")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Hasil Pengerjaan</h1>
                <p className="text-sm text-tinted mb-6">
                    {info?.form?.title || "Form"}
                </p>

                <div className="bg-white border border-second p-6 shadow-sm rounded-none mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-xs text-tinted">Total Skor</p>
                            <p
                                className={`text-5xl font-bold ${
                                    info?.form?.passing_score != null && (info?.total_score ?? 0) < info.form.passing_score
                                        ? "text-wrong"
                                        : "text-done"
                                }`}
                            >
                                {info?.total_score ?? 0}
                            </p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`badge rounded-full text-xs ${
                                    info?.form?.passing_score != null && (info?.total_score ?? 0) < info.form.passing_score
                                        ? "bg-wrong/10 text-wrong border-none"
                                        : info?.status === "SUBMITTED"
                                        ? "bg-done/10 text-done border-none"
                                        : "badge-ghost text-tinted"
                                }`}
                            >
                                {info?.form?.passing_score != null && (info?.total_score ?? 0) < info.form.passing_score
                                    ? "Gagal"
                                    : info?.status}
                            </span>
                            <p className="text-xs text-tinted mt-2 flex items-center gap-1 justify-end">
                                <Clock className="h-3 w-3" /> {fmtDate(info?.submitted_at || info?.started_at || null)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-base text-sm text-tinted flex items-center justify-between">
                        <span>{answers.length} soal</span>
                        <span>
                            <span className="text-pass font-semibold">{correctCount} benar</span> &middot;{" "}
                            <span className="text-wrong font-semibold">{answers.length - correctCount - textCount} salah</span>
                        </span>
                    </div>
                </div>

                {answers.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted">Belum ada jawaban.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <Filter options={filterOptions} value={filter} onChange={setFilter} />
                        </div>
                        {filteredAnswers.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-tinted">Tidak ada jawaban yang cocok dengan filter ini.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredAnswers.map((a) => {
                                    const idx = answers.indexOf(a)
                                    return (
                            <div key={a.id} className="bg-white border border-second p-5 shadow-sm rounded-none">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                    <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(a.question?.question_type || "")}</span>
                                    {isCorrect(a) ? (
                                        <span className="text-xs text-pass font-medium flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Benar
                                        </span>
                                    ) : a.question?.question_type === "text" ? (
                                        <span className="text-xs text-tinted font-medium">Isian</span>
                                    ) : (
                                        <span className="text-xs text-wrong font-medium flex items-center gap-1">
                                            <X className="h-3 w-3" /> Salah
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-darks whitespace-pre-line">{a.question?.question_text}</p>
                                {a.question?.image_question && (
                                    <img src={a.question.image_question} alt="Soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                )}

                                {a.question?.question_type === "text" ? (
                                    <div className="mt-3 text-sm text-darks bg-base border border-second rounded-lg px-3 py-2">
                                        {a.answer_text || "-"}
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-1.5">
                                        {(a.question?.question_options || []).map((o) => {
                                            const selected = a.question?.question_type === "multiple_choice"
                                                ? (a.selected_options || []).includes(o.id)
                                                : a.selected_option_id === o.id
                                            const isCorrect = o.is_correct
                                            return (
                                                <div
                                                    key={o.id}
                                                    className={`flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 border ${
                                                        isCorrect
                                                            ? "border-pass/40 bg-pass/5 text-pass"
                                                            : selected
                                                            ? "border-wrong/40 bg-wrong/5 text-wrong"
                                                            : "border-second text-tinted"
                                                    }`}
                                                >
                                                    {isCorrect ? (
                                                        <Check className="h-3.5 w-3.5 shrink-0" />
                                                    ) : selected ? (
                                                        <X className="h-3.5 w-3.5 shrink-0" />
                                                    ) : (
                                                        <span className="w-3.5 h-3.5 shrink-0" />
                                                    )}
                                                    {o.option_text}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default ResultPage;
