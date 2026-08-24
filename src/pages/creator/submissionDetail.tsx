import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { motion } from "motion/react"
import { Check, X } from "lucide-react"
import { RichText } from "../../components/richText"
import { DonutChart } from "../../components/charts"
import { colors } from "../../lib/colorbase"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { easeOutExpo } from "../../lib/motion"
import BackButton from "../../components/backButton"

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
        order_index: number
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
                    id, question_text, question_type, score_value, image_question, order_index,
                    question_options ( id, option_text, is_correct )
                )
            `)
            .eq("submission_id", submissionId)
            // Urutkan soal sesuai order_index (sama dengan halaman Question editor & Form),
            // bukan urutan default tabel answers yang tidak dijamin.
            .order("question(order_index)", { ascending: true })

        // Sort tambahan di sisi client sebagai jaminan, karena data diambil dari tabel
        // answers (bukan questions) sehingga urutannya mengikuti baris jawaban.
        const rows = ((ans as unknown as AnswerRow[]) || []).slice().sort(
            (a, b) =>
                (a.question?.order_index ?? Number.MAX_SAFE_INTEGER) -
                (b.question?.order_index ?? Number.MAX_SAFE_INTEGER)
        )
        setAnswers(rows)

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

    const hasCorrectAnswer = (a: AnswerRow) => {
        const q = a.question
        if (!q || q.question_type === "text") return false
        return q.question_options.some((o) => o.is_correct)
    }

    const isCorrect = (a: AnswerRow) => {
        const q = a.question
        if (!q || q.question_type === "text") return false
        if (!hasCorrectAnswer(a)) return false
        const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
        const selected = q.question_type === "multiple_choice"
            ? a.selected_options || []
            : a.selected_option_id ? [a.selected_option_id] : []
        return selected.length === correct.length && selected.every((id) => correct.includes(id))
    }

    const correctCount = answers.filter(isCorrect).length
    const textCount = answers.filter((a) => a.question?.question_type === "text").length
    const noAnswerCount = answers.filter((a) => a.question?.question_type !== "text" && !hasCorrectAnswer(a)).length
    const wrongCount = answers.length - correctCount - textCount - noAnswerCount
    const scoredCount = answers.length - textCount - noAnswerCount
    const correctPct = scoredCount > 0 ? Math.round((correctCount / scoredCount) * 100) : 0
    const wrongPct = scoredCount > 0 ? Math.round((wrongCount / scoredCount) * 100) : 0

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
        <>
            {!loading && (
        <div className="flex flex-col items-center px-4 py-5">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to={`/creator/forms/${id}/submissions`} />

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Detail Submission</h1>
                <p className="text-sm text-tinted mb-6">
                    {info?.user?.name || "Pengguna"} &middot; {info?.form?.title || "Form"} &middot; {fmtDate(info?.submitted_at || null)}
                </p>

                {info && info.total_score != null && (
                    <div className="bg-white border border-second p-5 shadow-sm rounded-xl mb-6">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <p className="text-xs text-tinted">Total Skor</p>
                                <p className={`text-3xl font-bold ${info.form?.passing_score != null && info.total_score < info.form.passing_score ? "text-wrong" : "text-pass"}`}>
                                    {info.total_score}
                                </p>
                                <span
                                    className={`badge rounded-full text-xs mt-2 ${
                                        info.form?.passing_score != null && info.total_score < info.form.passing_score
                                            ? "bg-wrong/10 text-wrong border-none"
                                            : info.status === "SUBMITTED"
                                            ? "bg-pass/10 text-pass border-none"
                                            : "badge-ghost text-tinted"
                                    }`}
                                >
                                    {info.form?.passing_score != null && info.total_score < info.form.passing_score
                                        ? "Gagal"
                                        : info.status}
                                </span>
                            </div>
                            {scoredCount > 0 && (
                                <div className="w-28 h-28 shrink-0">
                                    <DonutChart
                                        bare
                                        showLegend={false}
                                        height={112}
                                        data={[
                                            { name: "Benar", value: correctCount, color: colors.pass },
                                            { name: "Salah", value: wrongCount, color: colors.wrong },
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-second text-sm text-tinted flex items-center justify-between">
                            <span>{answers.length} soal</span>
                            <span>
                                <span className="text-pass font-semibold">{correctCount} benar ({correctPct}%)</span> &middot;{" "}
                                <span className="text-wrong font-semibold">{wrongCount} salah ({wrongPct}%)</span>
                                {textCount > 0 && <>&nbsp;&middot;&nbsp;<span className="text-tinted">{textCount} isian</span></>}
                            </span>
                        </div>
                    </div>
                )}

                {answers.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted">Belum ada jawaban.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {answers.map((a, idx) => (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(idx * 0.06, 0.4) }}
                            >
                            <div className="bg-white border border-second p-5 shadow-sm rounded-xl transition-colors hover:bg-base-200">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                    <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(a.question?.question_type || "")}</span>
                                    {a.question?.question_type !== "text" &&
                                        (hasCorrectAnswer(a) ? (
                                            isCorrect(a) ? (
                                                <span className="text-xs text-pass font-medium flex items-center gap-1">
                                                    <Check className="h-3 w-3" /> Benar
                                                </span>
                                            ) : (
                                                <span className="text-xs text-wrong font-medium flex items-center gap-1">
                                                    <X className="h-3 w-3" /> Salah
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-xs text-tinted font-medium">Tanpa Penilaian</span>
                                        ))}
                                    {Number(a.score_obtained) > 0 && (
                                        <span className="text-xs text-done font-medium">+{a.score_obtained} poin</span>
                                    )}
                                </div>
                                <div className="text-sm text-darks"><RichText html={a.question?.question_text} /></div>
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
                                            const graded = hasCorrectAnswer(a)
                                            const isCorrectOption = o.is_correct
                                            return (
                                                <div
                                                    key={o.id}
                                                    className={`flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 border ${
                                                        graded
                                                            ? isCorrectOption
                                                                ? selected
                                                                    ? "border-pass/40 bg-pass/5 text-pass"
                                                                    : "border-done/40 bg-done/5 text-done"
                                                                : selected
                                                                ? "border-wrong/40 bg-wrong/5 text-wrong"
                                                                : "border-second text-tinted"
                                                            : selected
                                                            ? "border-darks/30 bg-darks/5 text-darks"
                                                            : "border-second text-tinted"
                                                    }`}
                                                >
                                                    {graded ? (
                                                        isCorrectOption ? (
                                                            <Check className="h-3.5 w-3.5 shrink-0" />
                                                        ) : selected ? (
                                                            <X className="h-3.5 w-3.5 shrink-0" />
                                                        ) : (
                                                            <span className="w-3.5 h-3.5 shrink-0" />
                                                        )
                                                    ) : selected ? (
                                                        <span className="h-2 w-2 shrink-0 rounded-full bg-darks/50" />
                                                    ) : (
                                                        <span className="w-3.5 h-3.5 shrink-0" />
                                                    )}
                                                    <RichText as="span" html={o.option_text} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
            )}
        </>
    )
}

export default SubmissionDetail
