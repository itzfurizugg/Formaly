import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "motion/react"
import { Check, X, Clock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import Filter from "../../components/filter"
import { RichText } from "../../components/richText"
import { listContainer, listItem } from "../../lib/motion"
import BackButton from "../../components/backButton"
import FormHeader from "../../components/creator/formHeader"
import { showAlert } from "../../lib/alerts"

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
        media_url: string | null
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
    form: {
        id: string
        title: string
        duration: number
        passing_score: number | null
        show_score_to_respondent?: boolean | null
        show_answers_to_respondent?: boolean | null
        show_correct_filter_to_respondent?: boolean | null
    } | null
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

    // Header gambar & warna form diambil diam-diam; error diabaikan agar halaman tetap jalan.
    const [headerImage, setHeaderImage] = useState<string | null>(null)
    const [headerColor, setHeaderColor] = useState<string | null>(null)
    const [headerMedia, setHeaderMedia] = useState<string | null>(null)

    useEffect(() => {
        const fid = info?.form?.id
        if (!fid) return
        let cancelled = false
        supabase
            .from("forms")
            .select("header_image, header_color, media_url")
            .eq("id", fid)
            .single()
            .then(({ data }) => {
                if (cancelled) return
                const row = data as { header_image?: string | null; header_color?: string | null; media_url?: string | null } | null
                setHeaderImage(row?.header_image || null)
                setHeaderColor(row?.header_color || null)
                setHeaderMedia(row?.media_url || null)
            })
        return () => {
            cancelled = true
        }
    }, [info?.form?.id])

    const loadAll = useCallback(async () => {
        if (!user || !submissionId) return

        const { data: sub } = await supabase
            .from("submissions")
            .select("id, total_score, status, started_at, submitted_at, form:form_id ( id, title, duration, passing_score, show_score_to_respondent, show_answers_to_respondent, show_correct_filter_to_respondent ), user:user_id ( name )")
            .eq("id", submissionId)
            .eq("user_id", user.id)
            .single()

        if (!sub) {
            showAlert("Gagal memuat data.", "error")
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
                    id, question_text, question_type, score_value, image_question, media_url, order_index,
                    question_options ( id, option_text, is_correct )
                )
            `)
            .eq("submission_id", submissionId)
            // Urutkan soal sesuai order_index (sama dengan Question editor & Form).
            .order("question(order_index)", { ascending: true })

        // Sort tambahan di sisi client sebagai jaminan urutan soal.
        const rows = ((ans as unknown as AnswerRow[]) || []).slice().sort(
            (a, b) =>
                (a.question?.order_index ?? Number.MAX_SAFE_INTEGER) -
                (b.question?.order_index ?? Number.MAX_SAFE_INTEGER)
        )
        setAnswers(rows)
        setLoading(false)
    }, [user, submissionId])

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
    }, [user, authLoading, submissionId, navigate, loadAll])

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

    const hasCorrectAnswer = (a: AnswerRow) => {
        const q = a.question
        if (!q || q.question_type === "text") return false
        return q.question_options.some((o) => o.is_correct)
    }

    const correctCount = answers.filter(isCorrect).length
    const textCount = answers.filter((a) => a.question?.question_type === "text").length
    const noAnswerCount = answers.filter((a) => a.question?.question_type !== "text" && !hasCorrectAnswer(a)).length

    // Pengaturan form: kolom yang belum ada di DB (undefined) dianggap tampil
    // supaya perilaku lama tidak berubah sebelum migrasi diterapkan.
    const showScore = info?.form?.show_score_to_respondent !== false
    const showAnswers = info?.form?.show_answers_to_respondent !== false
    const showFilter = info?.form?.show_correct_filter_to_respondent !== false
    const failed = showScore && info?.form?.passing_score != null && (info?.total_score ?? 0) < info.form.passing_score

    const filterOptions = [
        { value: "correct", label: "Benar" },
        { value: "wrong", label: "Salah" },
        { value: "text", label: "Isian" },
        { value: "ungraded", label: "Tanpa Penilaian" },
    ]

    const filteredAnswers = answers.filter((a) => {
        if (filter === "correct") return isCorrect(a)
        if (filter === "wrong") return a.question?.question_type !== "text" && hasCorrectAnswer(a) && !isCorrect(a)
        if (filter === "ungraded") return a.question?.question_type !== "text" && !hasCorrectAnswer(a)
        if (filter === "text") return a.question?.question_type === "text"
        return true
    })

    const pgAnswers = filteredAnswers.filter((a) => a.question?.question_type !== "text")
    const textAnswers = filteredAnswers.filter((a) => a.question?.question_type === "text")

    return (
        <>
            {!authLoading && !loading && (
                error ? (
                    <div className="flex flex-col items-center px-3.5 py-5 sm:py-10">
                        <div className="w-full max-w-2xl">
                            <BackButton to="/history" />
                            <p className="text-sm text-tinted">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center px-3.5 py-5 sm:py-10">
                        <div className="w-full max-w-4xl">
                            <BackButton to="/history" />
                            {info?.form && (
                                <div className="rounded-xl overflow-hidden border border-second shadow-sm mb-3 lg:mb-4">
                                    <FormHeader formId={info.form.id} title={info.form.title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
                                </div>
                            )}

                            <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Hasil Pengerjaan</h1>
                            <p className="text-sm text-tinted mb-6">
                                {info?.form?.title || "Form"}
                            </p>

                            {showScore && (
                                <div className="bg-white border border-second p-6 shadow-sm rounded-xl mb-3 lg:mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-xs text-tinted">Total Skor</p>
                                            {showScore ? (
                                                <p className={`text-5xl font-bold ${failed ? "text-wrong" : "text-pass"}`}>
                                                    {info?.total_score ?? 0}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-tinted mt-2 flex items-center gap-2">
                                                    {/* <EyeOff className="h-4 w-4 shrink-0" /> */}
                                                    Nilai tidak ditampilkan oleh pembuat form.
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`badge rounded-full text-xs ${failed
                                                        ? "bg-wrong/10 text-wrong border-none"
                                                        : info?.status === "SUBMITTED"
                                                            ? "bg-pass/10 text-pass border-none"
                                                            : "badge-ghost text-tinted"
                                                    }`}
                                            >
                                                {failed ? "Gagal" : info?.status}
                                            </span>
                                            <p className="text-xs text-tinted mt-2 flex items-center gap-1 justify-end">
                                                <Clock className="h-3 w-3" /> {fmtDate(info?.submitted_at || info?.started_at || null)}
                                            </p>
                                        </div>
                                    </div>
                                    {showScore && showAnswers && (
                                        <div className="mt-4 pt-4 border-t border-base text-sm text-tinted flex items-center justify-between">
                                            <span>{answers.length} soal</span>
                                            <span>
                                                <span className="text-pass font-semibold">{correctCount} benar</span> &middot;{" "}
                                                <span className="text-wrong font-semibold">{answers.length - correctCount - textCount - noAnswerCount} salah</span>
                                                {noAnswerCount > 0 && <>&nbsp;&middot;&nbsp;<span className="text-tinted">{noAnswerCount} tanpa penilaian</span></>}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!showAnswers ? (
                                <div className="bg-white border border-second p-6 shadow-sm rounded-xl text-center py-5">
                                    {/* <EyeOff className="h-8 w-8 text-tinted/50 mx-auto mb-3" /> */}
                                    <p className="text-sm text-tinted">Rincian jawaban tidak ditampilkan untuk form ini.</p>
                                </div>
                            ) : answers.length === 0 ? (
                                <div className="text-center py-16">
                                    <p className="text-tinted">Belum ada jawaban.</p>
                                </div>
                            ) : (
                                <>
                                    {showFilter && (
                                        <div className="mb-4">
                                            <Filter options={filterOptions} value={filter} onChange={setFilter} />
                                        </div>
                                    )}
                                    {filteredAnswers.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-tinted">Tidak ada jawaban yang cocok dengan filter ini.</p>
                                        </div>
                                    ) : (
                                        <motion.div
                                            key={filter}
                                            className="space-y-6"
                                            variants={listContainer}
                                            initial="hidden"
                                            animate="show"
                                        >
                                            {pgAnswers.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm font-bold text-darks whitespace-nowrap">Pilihan Ganda (PG)</h3>
                                                        <div className="flex-1 h-px bg-second"></div>
                                                    </div>
                                                    {pgAnswers.map((a) => {
                                                        const idx = answers.indexOf(a)
                                                        return (
                                                            <motion.div key={a.id} variants={listItem} className="bg-white border border-second p-5 shadow-sm rounded-xl transition-colors hover:bg-base-200">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                                                    <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(a.question?.question_type || "")}</span>
                                                                    {hasCorrectAnswer(a) ? (
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
                                                                    )}
                                                                </div>
<div className="text-sm text-darks"><RichText html={a.question?.question_text} /></div>
                                                                 {a.question?.image_question && (
                                                                     <img src={a.question.image_question} alt="Soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                                                 )}
                                                                 {a.question?.media_url && (
                                                                     <div className="mt-2">
                                                                         {(() => {
                                                                             const ext = a.question!.media_url!.toLowerCase().substring(a.question!.media_url!.lastIndexOf("."))
                                                                             if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
                                                                                 return <img src={a.question!.media_url!} alt="Media soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                                                             }
                                                                             if ([".mp4", ".mkv", ".mov", ".avi"].includes(ext)) {
                                                                                 return <video src={a.question!.media_url!} controls className="max-h-40 w-full mt-2 border border-second rounded-lg" preload="metadata" />
                                                                             }
                                                                             if ([".mp3"].includes(ext)) {
                                                                                 return <audio src={a.question!.media_url!} controls className="w-full mt-2" preload="metadata" />
                                                                             }
                                                                             return null
                                                                         })()}
                                                                     </div>
                                                                 )}
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
                                                                                className={`flex items-center gap-2 text-sm rounded-lg px-3.5 py-1.5 border ${graded
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
                                                            </motion.div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                            {textAnswers.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm font-bold text-darks whitespace-nowrap">Soal Isian</h3>
                                                        <div className="flex-1 h-px bg-second"></div>
                                                    </div>
                                                    {textAnswers.map((a) => {
                                                        const idx = answers.indexOf(a)
                                                        return (
                                                            <motion.div key={a.id} variants={listItem} className="bg-white border border-second p-5 shadow-sm rounded-xl transition-colors hover:bg-base-200">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                                                    <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(a.question?.question_type || "")}</span>
                                                                </div>
<div className="text-sm text-darks"><RichText html={a.question?.question_text} /></div>
                                                                 {a.question?.image_question && (
                                                                     <img src={a.question.image_question} alt="Soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                                                 )}
                                                                 {a.question?.media_url && (
                                                                     <div className="mt-2">
                                                                         {(() => {
                                                                             const ext = a.question!.media_url!.toLowerCase().substring(a.question!.media_url!.lastIndexOf("."))
                                                                             if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
                                                                                 return <img src={a.question!.media_url!} alt="Media soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                                                             }
                                                                             if ([".mp4", ".mkv", ".mov", ".avi"].includes(ext)) {
                                                                                 return <video src={a.question!.media_url!} controls className="max-h-40 w-full mt-2 border border-second rounded-lg" preload="metadata" />
                                                                             }
                                                                             if ([".mp3"].includes(ext)) {
                                                                                 return <audio src={a.question!.media_url!} controls className="w-full mt-2" preload="metadata" />
                                                                             }
                                                                             return null
                                                                         })()}
                                                                     </div>
                                                                 )}
                                                                 <div className="mt-3 text-sm text-darks bg-base border border-second rounded-lg px-3.5 py-2 whitespace-pre-wrap break-words">
                                                                    {a.answer_text || "-"}
                                                                </div>
                                                            </motion.div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )
            )}
        </>
    )
}

export default ResultPage;
