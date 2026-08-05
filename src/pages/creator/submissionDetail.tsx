import Loading from "../../components/loading"
import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"

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
    form: { id: string; title: string; passing_score: number | null } | null
    user: { name: string } | null
    token: { token_code: string } | null
}

function SubmissionDetail() {
    const { id, submissionId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [info, setInfo] = useState<SubmissionInfo | null>(null)
    const [answers, setAnswers] = useState<AnswerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadAll = useCallback(async () => {
        if (!user || !id || !submissionId) return

        const { data: sub } = await supabase
            .from("submissions")
            .select("id, total_score, status, started_at, submitted_at, form:form_id ( id, title, passing_score ), user:user_id ( name ), token:token_id ( token_code )")
            .eq("id", submissionId)
            .eq("form_id", id)
            .single()

        const { data: owner } = await supabase.from("forms").select("creator_id").eq("id", id).single()
        if (owner && owner.creator_id !== user.id) {
            setError("Anda tidak memiliki akses ke submission ini.")
            setLoading(false)
            return
        }

        setInfo((sub as unknown as SubmissionInfo) || null)

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
    }, [user, id, submissionId])

    useEffect(() => {
        if (!user || !id || !submissionId) return
        loadAll()
    }, [user, id, submissionId, loadAll])

    const typeLabel = (t: string) => {
        if (t === "multiple_choice") return "Pilihan Ganda"
        if (t === "text") return "Isian"
        return "Pilihan Tunggal"
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

    if (loading) {
        return <Loading />
    }

    if (error) {
        return (
            <div className="flex flex-col items-center px-4 py-10">
                <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-5xl">
                <button
                    onClick={() => navigate(`/creator/forms/${id}/submissions`)}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Detail Submission</h1>
                <p className="text-sm text-tinted mb-6">
                    {info?.user?.name || "Pengguna"} &middot; {info?.form?.title || "Form"} &middot; {fmtDate(info?.submitted_at || null)}
                </p>

                {info && info.total_score != null && (
                    <div className="bg-white border border-second p-5 shadow-sm rounded-none mb-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-tinted">Total Skor</p>
                            <p className={`text-3xl font-bold ${info.form?.passing_score != null && info.total_score < info.form.passing_score ? "text-wrong" : "text-done"}`}>
                                {info.total_score}
                            </p>
                        </div>
                        <span
                            className={`badge rounded-full text-xs ${
                                info.form?.passing_score != null && info.total_score < info.form.passing_score
                                    ? "bg-wrong/10 text-wrong border-none"
                                    : info.status === "SUBMITTED"
                                    ? "bg-done/10 text-done border-none"
                                    : "badge-ghost text-tinted"
                            }`}
                        >
                            {info.form?.passing_score != null && info.total_score < info.form.passing_score
                                ? "Gagal"
                                : info.status}
                        </span>
                    </div>
                )}

                {answers.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted">Belum ada jawaban.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {answers.map((a, idx) => (
                            <div key={a.id} className="bg-white border border-second p-5 shadow-sm rounded-none">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                    <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(a.question?.question_type || "")}</span>
                                    {Number(a.score_obtained) > 0 && (
                                        <span className="text-xs text-done font-medium">+{a.score_obtained} poin</span>
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
                                                            ? "border-done/40 bg-done/5 text-done"
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SubmissionDetail
