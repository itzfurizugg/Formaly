import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Check, Clock, ZoomIn, ZoomOut, X, LayoutList } from "lucide-react"
import PageIndicator from "../../components/pageindicator"
import { RichText } from "../../components/richText"
import QuestionMedia from "../../components/QuestionMedia"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { loginUrl } from "../../lib/redirect"
import ModalPortal from "../../components/modalPortal"
import { extractQuestionConfig, type QuestionConfig } from "../../lib/questionConfig"
import FileAnswerUpload from "../../components/fileAnswerUpload"
import DateTimeAnswer from "../../components/dateTimeAnswer"
import { richTextToPlain } from "../../lib/richtext"
import { easeOutExpo, modalBackdrop, modalPanel } from "../../lib/motion"
import { Spinner } from "../../components/loading"
import { showAlert } from "../../lib/alerts"
import { networkNow, networkISOString, syncTime, onTimeSync } from "../../lib/networkTime"
import { isStandardMode } from "../../lib/formPages"

interface Option {
    id: string
    option_text: string
    is_correct?: boolean
    /** TODO(backend): kolom question_options.media_url menyusul lewat migration. */
    media_url?: string | null
}

interface Question {
    id: string
    question_text: string
    question_type: string
    score_value: number
    image_question?: string | null
    media_url?: string | null
    is_required?: boolean
    page_id?: string | null
    question_options: Option[]
    config?: QuestionConfig | null
}

/** Section (pembagian halaman) saat pengerjaan mode standard. */
interface SectionNav {
    id: string
    title: string
    questionIds: string[]
}

interface Answer {
    [key: string]: string | string[]
}

interface LocationState {
    current?: number
    answers?: Answer
    deadline?: number
    /** "Tiket" dari RPC start_form_submission — wajib ada, tanpa ini akses ditolak. */
    submissionId?: string
    /** Tanda ragu-ragu per soal, dipertahankan saat bolak-balik dari Daftar Soal. */
    rages?: Record<string, boolean>
    /** Navigasi section (mode standard) untuk dibawa ke Daftar Soal. */
    sections?: SectionNav[]
    layoutMode?: string | null
}

function FormPage() {
    const { formId } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const location = useLocation()
    const locationState = location.state as LocationState | null
    // Submission dibuat di server lewat RPC start_form_submission (IN_PROGRESS)
    // sebelum halaman ini boleh dibuka. Tanpa itu, akses langsung via URL ditolak.
    const submissionId = locationState?.submissionId ?? null

    const [questions, setQuestions] = useState<Question[]>([])
    const [formMeta, setFormMeta] = useState<{ title: string; duration: number; randomize_questions?: boolean | null } | null>(null)
    const [layoutMode, setLayoutMode] = useState<string | null>(locationState?.layoutMode ?? null)
    const [sections, setSections] = useState<SectionNav[]>(locationState?.sections ?? [])
    const [current, setCurrent] = useState(locationState?.current || 0)
    const [answers, setAnswers] = useState<Answer>(locationState?.answers || {})
    // Jawaban file (soal file_upload) disimpan terpisah karena berbentuk File.
    // TODO(backend): penyimpanan permanen jawaban file menyusul.
    const [fileAnswers, setFileAnswers] = useState<Record<string, File>>({})
    const [raguQuestions, setRaguQuestions] = useState<Record<string, boolean>>(locationState?.rages ?? {})
    const [timeLeft, setTimeLeft] = useState(300)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [modalImage, setModalImage] = useState<string | null>(null)
    const [pageZoom, setPageZoom] = useState(1)
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
    const [hasTimer, setHasTimer] = useState(false)
    const autoSubmitted = useRef(false)
    const deadlineRef = useRef<number | null>(null)
    const prevTimeRef = useRef<number | null>(null)

    const isStandard = isStandardMode(layoutMode)

    // Flag ragu aktif: ada soal yang ditandai ragu-ragu. Selagi ada tanda ragu,
    // kirim manual diblokir; jawaban baru dikirim otomatis saat timer habis
    // (handleSubmit(true)) terlepas dari kondisi apapun. Tanpa timer tidak ada
    // auto-submit sebagai jaring pengaman, jadi blokir tidak diterapkan.
    const raguActive = hasTimer && Object.values(raguQuestions).some((v) => v)

    const raguNumberList = useCallback(
        () => questions.map((q, i) => (raguQuestions[q.id] ? i + 1 : 0)).filter((n) => n > 0),
        [questions, raguQuestions]
    )

    // Cek apakah soal sudah dijawab, termasuk tipe baru (file_upload / date_time).
    const isQuestionAnswered = useCallback(
        (q: Question) => {
            if (q.question_type === "file_upload") return fileAnswers[q.id] != null
            const ans = answers[q.id]
            if (ans === undefined) return false
            if (Array.isArray(ans)) return ans.length > 0
            return String(ans).trim() !== ""
        },
        [answers, fileAnswers]
    )

    const handleSubmit = useCallback(async (allowRequiredSkip = false) => {
        if (!user || !formId || !submissionId) return
        setSubmitting(true)

        if (!allowRequiredSkip && raguActive) {
            setSubmitting(false)
            showAlert(`Masih ada soal yang ditandai ragu-ragu (nomor ${raguNumberList().join(", ")}). Hapus tanda ragu atau tunggu waktu habis — jawaban otomatis dikirim saat timer selesai.`, "error")
            return
        }

        if (!allowRequiredSkip) {
            const unanswered = questions.find((q) => q.is_required && !isQuestionAnswered(q))
            if (unanswered) {
                setSubmitting(false)
                showAlert("Masih ada soal wajib yang belum dijawab. Periksa soal bertanda *.", "error")
                if (!isStandard) setCurrent(questions.indexOf(unanswered))
                return
            }
        }

        let totalScore = 0
        for (const q of questions) {
            const ans = answers[q.id]
            if (ans === undefined) continue
            // Isian, Upload File, dan Tanggal & Jam tidak dinilai otomatis.
            if (q.question_type === "text" || q.question_type === "file_upload" || q.question_type === "date_time") continue

            const selected = Array.isArray(ans) ? ans : [ans]
            const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)

            if (selected.length === correct.length && selected.every((id) => correct.includes(id))) {
                totalScore += Number(q.score_value) || 0
            }
        }

        // Submission sudah dibuat saat mulai (RPC start_form_submission, IN_PROGRESS).
        // Di sini cukup finalisasi: skor + status SUBMITTED.
        const { error: subErr } = await supabase
            .from("submissions")
            .update({
                total_score: totalScore,
                status: 'SUBMITTED',
                submitted_at: networkISOString()
            })
            .eq("id", submissionId)

        if (subErr) {
            setSubmitting(false)
            showAlert(subErr.message || "Gagal mengirim jawaban. Coba lagi.", "error")
            return
        }

        for (const q of questions) {
            const ans = answers[q.id]
            if (ans === undefined && q.question_type !== "file_upload") continue

            let scoreObtained = 0
            if (q.question_type !== "text" && q.question_type !== "file_upload" && q.question_type !== "date_time") {
                const selected = Array.isArray(ans) ? ans : [ans]
                const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
                if (selected.length === correct.length && selected.every((id) => correct.includes(id))) {
                    scoreObtained = Number(q.score_value) || 0
                }
            }

            let insertError
            if (q.question_type === "text" || q.question_type === "date_time") {
                // TODO(backend): kolom jawaban khusus date_time (dan file) menyusul;
                // untuk sekarang tanggal/jam disimpan sebagai string ISO di answer_text.
                ; ({ error: insertError } = await supabase.from("answers").insert({
                    submission_id: submissionId,
                    question_id: q.id,
                    answer_text: q.question_type === "date_time" ? String(ans ?? "") : String(ans ?? ""),
                    score_obtained: scoreObtained,
                }))
            } else if (q.question_type === "file_upload") {
                // TODO(backend): upload file ke storage.formaly.my.id & kolom URL
                // jawaban menyusul. Untuk sekarang file hanya ada di state dan
                // dicatat ke console agar tidak hilang sebelum backend siap.
                const file = fileAnswers[q.id]
                console.log(`[file_upload pending] question=${q.id}, file=${file?.name ?? "(kosong)"}`, file ?? null)
                continue
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
                showAlert(insertError.message || "Gagal menyimpan jawaban. Coba lagi.", "error")
                return
            }
        }

        if (submissionId) sessionStorage.removeItem(`formTimer:${formId}:${submissionId}`)

        setSubmitting(false)
        // Ganti halaman (bukan push) supaya tombol back tidak kembali ke
        // halaman soal yang sudah ter-submit.
        navigate(`/form/done/${submissionId}`, { replace: true })
    }, [user, formId, submissionId, questions, answers, fileAnswers, isQuestionAnswered, navigate, raguActive, raguNumberList, isStandard])

    // Tombol "Kirim" hanya membuka modal konfirmasi; pengiriman asli tetap
    // lewat handleSubmit (juga dipakai auto-submit saat waktu habis, tanpa konfirmasi).
    const requestSubmit = () => {
        if (submitting) return
        if (raguActive) {
            const raguNumbers = raguNumberList()
            showAlert(`Masih ada soal yang ditandai ragu-ragu (nomor ${raguNumbers.join(", ")}). Hapus tanda ragu atau tunggu waktu habis — jawaban otomatis dikirim saat timer selesai.`, "error")
            if (!isStandard) setCurrent((raguNumbers[0] || 1) - 1)
            return
        }
        const unanswered = questions.find((q) => q.is_required && !isQuestionAnswered(q))
        if (unanswered) {
            showAlert("Masih ada soal wajib yang belum dijawab. Periksa soal bertanda *.", "error")
            if (!isStandard) setCurrent(questions.indexOf(unanswered))
            return
        }
        setShowSubmitConfirm(true)
    }

    const confirmSubmit = async () => {
        setShowSubmitConfirm(false)
        await handleSubmit()
    }

    const loadForm = useCallback(async () => {
        setLoading(true)
        setNotFound(false)
        const { data: formData } = await supabase
            .from("forms")
            .select("title, duration, status, randomize_questions, layout_mode")
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

        const nextLayout = (formData as { layout_mode?: string }).layout_mode ?? null
        setLayoutMode(nextLayout)
        setFormMeta(formData)
        const dur = Number(formData.duration) || 0
        setHasTimer(dur > 0)
        if (dur > 0) {
            const storageKey = submissionId ? `formTimer:${formId}:${submissionId}` : null
            let deadline = locationState?.deadline || null
            if (!deadline && storageKey) {
                const saved = sessionStorage.getItem(storageKey)
                if (saved) deadline = Number(saved)
            }
            if (!deadline) {
                deadline = networkNow() + dur * 60 * 1000
            }
            if (storageKey) sessionStorage.setItem(storageKey, String(deadline))
            deadlineRef.current = deadline
            setTimeLeft(Math.max(0, Math.round((deadline - networkNow()) / 1000)))
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
                media_url,
                is_required,
                page_id,
                question_options (
                    id,
                    option_text,
                    is_correct
                )
            `)
            .eq("form_id", formId)
            .order("order_index", { ascending: true })

        // Ambil daftar section (form_pages) untuk mode standard.
        let pageRows: { id: string; title: string }[] = []
        if (isStandardMode(nextLayout)) {
            const { data: pages } = await supabase
                .from("form_pages")
                .select("id, title")
                .eq("form_id", formId)
                .order("position", { ascending: true })
            pageRows = (pages ?? []) as { id: string; title: string }[]
        }

        const loaded = ((qData as Question[]) || []).map((q) => {
            const { html, config } = extractQuestionConfig(q.question_text)
            return { ...q, question_text: html, config }
        })
        const byId = new Map(loaded.map((q) => [q.id, q]))

        let nextQuestions: Question[]
        let nextSections: SectionNav[] = []

        if (isStandardMode(nextLayout)) {
            // Kelompokkan soal per section; soal tanpa page_id masuk ke section
            // sintetis "Soal lainnya" agar tidak hilang dari tampilan.
            const pageSet = new Set(pageRows.map((p) => p.id))
            const groups = new Map<string, { id: string; questionIds: string[] }>()
            for (const p of pageRows) groups.set(p.id, { id: p.id, questionIds: [] })
            const unassigned: Question[] = []

            for (const q of loaded) {
                if (q.page_id && pageSet.has(q.page_id)) {
                    groups.get(q.page_id)!.questionIds.push(q.id)
                } else {
                    unassigned.push(q)
                }
            }

            if (unassigned.length > 0) {
                groups.set("__unassigned__", { id: "__unassigned__", questionIds: unassigned.map((q) => q.id) })
            }
            nextSections = [...groups.values()]
                .map((g) => ({
                    id: g.id,
                    title: g.id === "__unassigned__" ? "Soal lainnya" : (pageRows.find((p) => p.id === g.id)?.title ?? "Bagian"),
                    questionIds: g.questionIds,
                }))

            // Acak urutan hanya di dalam section (jangan sampai soal pindah section).
            if (formData.randomize_questions) {
                for (const s of nextSections) {
                    for (let i = s.questionIds.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1))
                        ;[s.questionIds[i], s.questionIds[j]] = [s.questionIds[j], s.questionIds[i]]
                    }
                }
            }

            // Flatten berdasarkan urutan section, lalu urutan soal di dalamnya.
            nextQuestions = []
            for (const s of nextSections) {
                for (const qid of s.questionIds) {
                    const q = byId.get(qid)
                    if (q) nextQuestions.push(q)
                }
            }
            // Dangling: soal yang tetap tidak masuk section manapun.
            for (const q of loaded) {
                if (!nextQuestions.some((x) => x.id === q.id)) nextQuestions.push(q)
            }

            // Pastikan section tidak kosong terlompat: hapus section tanpa soal
            // dari navigasi (merek tidak berguna untuk responden).
            nextSections = nextSections.filter((s) => s.questionIds.length > 0)
        } else {
            nextQuestions = loaded.slice()
            if (formData.randomize_questions) {
                for (let i = nextQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                        ;[nextQuestions[i], nextQuestions[j]] = [nextQuestions[j], nextQuestions[i]]
                }
            }
        }

        if (nextQuestions.length > 0) {
            setQuestions(nextQuestions)
        }
        if (nextSections.length > 0) {
            setSections(nextSections)
            setCurrent((c) => (c < nextSections.length ? c : 0))
        } else {
            setSections([])
        }

        setLoading(false)
    }, [formId, submissionId, locationState])

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
        if (!submissionId) {
            navigate(`/form/description?formId=${formId}`)
            return
        }
        let cancelled = false
        syncTime().then(() => {
            if (!cancelled) loadForm()
        })
        const unsub = onTimeSync(() => {
            if (deadlineRef.current) {
                setTimeLeft(Math.max(0, Math.round((deadlineRef.current - networkNow()) / 1000)))
            }
        })
        return () => {
            cancelled = true
            unsub()
        }
    }, [user, authLoading, formId, submissionId, navigate, location, loadForm])

    useEffect(() => {
        if (!hasTimer || !deadlineRef.current || loading) return
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.round((deadlineRef.current! - networkNow()) / 1000))
            setTimeLeft(remaining)
            if (remaining <= 0) clearInterval(timer)
        }, 1000)
        return () => clearInterval(timer)
    }, [loading, hasTimer])

    useEffect(() => {
        if (autoSubmitted.current) return
        const prevTime = prevTimeRef.current
        prevTimeRef.current = timeLeft
        if (prevTime === null || prevTime <= 0) return
        if (hasTimer && timeLeft === 0 && !submitting && questions.length > 0 && user && formId) {
            autoSubmitted.current = true
            const id = window.setTimeout(() => handleSubmit(true), 0)
            return () => window.clearTimeout(id)
        }
    }, [timeLeft, submitting, questions, user, formId, handleSubmit, hasTimer])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    const total = isStandard ? sections.length : questions.length
    // Soal pada section aktif (mode standard) — urutan sesuai section.
    const currentSection = isStandard ? sections[current] : undefined
    const visibleQuestions = useMemo(() => {
        if (!isStandard || !currentSection) return questions
        const byId = new Map(questions.map((q) => [q.id, q]))
        return currentSection.questionIds.map((qid) => byId.get(qid)).filter((q): q is Question => Boolean(q))
    }, [isStandard, currentSection, questions])
    // Mode standard: label "Bagian N"; mode quiz: "Soal N".
    const question = isStandard ? undefined : questions[current]

    const selectOption = (q: Question, optionId: string) => {
        if (q.question_type === "multiple_choice") {
            const current = answers[q.id]
            const selected = Array.isArray(current) ? current : []
            const next = selected.includes(optionId)
                ? selected.filter((id) => id !== optionId)
                : [...selected, optionId]
            setAnswers({ ...answers, [q.id]: next })
        } else {
            setAnswers({ ...answers, [q.id]: optionId })
        }
    }

    // Validasi wajib-isi pada section aktif sebelum lanjut ke section berikutnya.
    const validateCurrentSection = (): boolean => {
        if (!isStandard) return true
        const unans = visibleQuestions.find((q) => q.is_required && !isQuestionAnswered(q))
        if (unans) {
            showAlert("Masih ada soal wajib yang belum dijawab di section ini. Periksa soal bertanda *.", "error")
            return false
        }
        return true
    }

    const next = () => {
        if (current < total - 1) {
            if (isStandard && !validateCurrentSection()) return
            setCurrent(current + 1)
        }
    }

    const prev = () => {
        if (current > 0) setCurrent(current - 1)
    }

    const goToList = () => {
        if (isStandard) {
            navigate('/form/list', {
                state: {
                    current,
                    answers,
                    formId,
                    questions,
                    submissionId,
                    deadline: deadlineRef.current || undefined,
                    rages: raguQuestions,
                    sections,
                    layoutMode,
                },
            })
        } else {
            navigate('/form/list', { state: { current, answers, formId, questions, submissionId, deadline: deadlineRef.current || undefined, rages: raguQuestions } })
        }
    }

    const zoomPage = (delta: number) => {
        setPageZoom(Math.min(2, Math.max(0.5, pageZoom + delta)))
    }

    const toggleRagu = () => {
        if (!question) return
        setRaguQuestions((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
    }

    const renderQuestionContent = (q: Question, indexLabel: number, isStandardModeCard = false) => (
        <div className="bg-base-300 lg:bg-white dark:bg-second border border-second p-1 lg:p-6 lg:shadow-sm rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                    <p className="text-sm text-tinted font-semibold">Soal {indexLabel}</p>
                    {q.is_required && <span className="text-red-600 font-bold text-xl">*</span>}
                </div>
                {!isStandardModeCard && (
                    <div className="flex items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${!hasTimer
                                ? "bg-white dark:bg-second text-tinted"
                                : timeLeft <= 60
                                    ? "bg-red-500/10 text-red-600"
                                    : "bg-done/10 text-done"
                                }`}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {hasTimer ? formattedTime : "Tanpa Waktu"}
                        </span>
                    </div>
                )}
            </div>

            <div className="text-base font-medium text-darks leading-relaxed mt-5">
                <RichText html={q.question_text} />
            </div>
            {q.image_question && (
                <div className="mt-6 relative group rounded-lg overflow-hidden border border-second bg-base w-fit">
                    <img
                        src={q.image_question}
                        alt="Ilustrasi Soal"
                        className="max-h-60 object-contain cursor-pointer"
                        onClick={() => setModalImage(q.image_question ?? null)}
                    />
                    <button
                        onClick={() => setModalImage(q.image_question ?? null)}
                        className="absolute bottom-2 right-2 bg-base/70 hover:bg-darks text-medium text-darks hover:text-white dark:text-second p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"
                    >
                        <ZoomIn className="h-4 w-4" /> Perbesar
                    </button>
                </div>
            )}
            {q.media_url && (
                <div className="mt-4">
                    {(() => {
                        const ext = q.media_url!.toLowerCase().substring(q.media_url!.lastIndexOf("."))
                        if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
                            return (
                                <div className="mt-4 relative group rounded-lg overflow-hidden border border-second bg-base w-fit">
                                    <img
                                        src={q.media_url!}
                                        alt="Media Soal"
                                        className="max-h-60 object-contain cursor-pointer"
                                        onClick={() => setModalImage(q.media_url! ?? null)}
                                    />
                                    <button
                                        onClick={() => setModalImage(q.media_url! ?? null)}
                                        className="absolute bottom-2 right-2 bg-base/70 hover:bg-darks text-medium text-darks hover:text-white dark:text-second p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"
                                    >
                                        <ZoomIn className="h-4 w-4" /> Perbesar
                                    </button>
                                </div>
                            )
                        }
                        if ([".mp4", ".mkv", ".mov", ".avi"].includes(ext)) {
                            return (
                                <QuestionMedia
                                    url={q.media_url!}
                                    maxHeight="max-h-60"
                                    className="mt-2 border border-second rounded-lg"
                                />
                            )
                        }
                        if ([".mp3"].includes(ext)) {
                            return (
                                <audio src={q.media_url!} controls className="w-full mt-2" preload="metadata" />
                            )
                        }
                        return null
                    })()}
                </div>
            )}

            <div className="mt-6 space-y-3">
                {q.question_type === "text" ? (
                    <textarea
                        value={Array.isArray(answers[q.id]) ? "" : (answers[q.id] as string) || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        rows={5}
                        placeholder="Tulis jawabanmu di sini..."
                        className="textarea w-full bg-white dark:bg-second border-second focus:border-done focus:outline-none transition-colors text-sm resize-y"
                    />
                ) : q.question_type === "dropdown" ? (
                    <div>
                        <select
                            value={Array.isArray(answers[q.id]) ? "" : (answers[q.id] as string) || ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="select w-full bg-white dark:bg-second border-second focus:border-done focus:outline-none rounded-lg text-sm"
                        >
                            <option value="">-- Pilih salah satu --</option>
                            {q.question_options?.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {richTextToPlain(option.option_text)}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-tinted mt-1 px-1">Pilih satu jawaban dari daftar.</p>
                    </div>
                ) : q.question_type === "file_upload" ? (
                    <FileAnswerUpload
                        value={fileAnswers[q.id] ?? null}
                        onChange={(file) =>
                            setFileAnswers((prev) => {
                                const next = { ...prev }
                                if (file) next[q.id] = file
                                else delete next[q.id]
                                return next
                            })
                        }
                    />
                ) : q.question_type === "date_time" ? (
                    <DateTimeAnswer
                        variant={q.config?.dateTimeVariant ?? "date_and_time"}
                        value={Array.isArray(answers[q.id]) ? "" : (answers[q.id] as string) || ""}
                        onChange={(iso) => setAnswers((prev) => ({ ...prev, [q.id]: iso }))}
                    />
                ) : (
                    q.question_options?.map((option) => {
                        const isMulti = q.question_type === "multiple_choice"
                        const selected = isMulti
                            ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(option.id)
                            : answers[q.id] === option.id
                        return (
                            <button
                                key={option.id}
                                onClick={() => selectOption(q, option.id)}
                                className={`w-full text-left px-3.5 py-3 rounded-lg border text-sm transition-colors ${selected
                                    ? "bg-darks border-darks text-white dark:text-second font-medium"
                                    : "bg-white dark:bg-second border-second text-darks hover:border-darks/50"
                                    }`}
                            >
                                <span className="flex items-center gap-3">
                                    <span
                                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isMulti ? "rounded-md" : "rounded-full"
                                            } ${selected ? "border-darks bg-darks" : "border-tinted"}`}
                                    >
                                        {selected && <Check className="h-3 w-3 text-white dark:text-second" strokeWidth={3} />}
                                    </span>
                                    {option.media_url && (
                                        <span className="shrink-0">
                                            <QuestionMedia url={option.media_url} maxHeight="max-h-16" className="rounded-md border border-second" />
                                        </span>
                                    )}
                                    <RichText as="span" html={option.option_text} />
                                </span>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )

    return (
        <>
            {!authLoading && !loading && (
                notFound ? (
                    <div className="flex flex-col items-center justify-center min-h-screen px-3.5">
                        <p className="text-tinted mb-4">Form tidak ditemukan atau belum dipublikasikan.</p>
                        <button onClick={() => navigate("/")} className="btn rounded-full p-4 bg-darks text-white dark:text-second border-none">
                            Kembali
                        </button>
                    </div>
                ) : questions.length === 0 || (isStandard && sections.length === 0) ? (
                    <div className="flex flex-col items-center justify-center min-h-screen px-3.5">
                        <p className="text-tinted mb-4">Form tidak memiliki soal.</p>
                        <button onClick={() => navigate("/")} className="btn rounded-full p-4 bg-darks text-white dark:text-second border-none">
                            Kembali
                        </button>
                    </div>
                ) : isStandard ? (
                    <div className="flex flex-col items-center px-3.5 pt-6 pb-28 md:pb-6">
                        <div className="w-full max-w-3xl xl:mt-3" style={{ zoom: pageZoom }}>
                            <div className="p-2 mb-3 hidden sm:block">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h1 className="text-xl xl:text-4xl font-bold text-darks">{formMeta?.title || "Form"}</h1>
                                        <p className="text-xs text-tinted mt-1 flex items-center gap-1.5">
                                            <LayoutList className="h-3.5 w-3.5" /> Bagian {current + 1} dari {sections.length}
                                            {currentSection && <span className="font-medium text-darks"> · {currentSection.title}</span>}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 inline-flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${!hasTimer
                                            ? "bg-white dark:bg-second text-tinted"
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

                            {currentSection && (
                                <motion.div
                                    key={current}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45, ease: easeOutExpo }}
                                >
                                    <div className="p-2 sm:p-3 mb-3">
                                        <h2 className="text-base sm:text-lg font-semibold text-darks">{currentSection.title}</h2>
                                    </div>
                                    <div className="space-y-4">
                                        {visibleQuestions.map((q, qi) => (
                                            <div key={q.id} id={`q-${q.id}`}>
                                                {renderQuestionContent(q, qi + 1, true)}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Tombol navigasi section di bawah konten */}
                            <div className="hidden md:flex items-center justify-between gap-3 sticky bottom-0 z-30 mt-4 py-3 bg-gradient-to-t from-second via-second/90 to-transparent">
                                <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} onRaguToggle={toggleRagu} onRequestSubmit={requestSubmit} submitting={submitting} label="Bagian" hideRagu />
                            </div>
                        </div>

                        <div className="hidden md:flex fixed bottom-4 right-4 z-40 items-center">
                            <div className="bg-white dark:bg-second p-2 rounded-full border border-second shadow-md flex items-center gap-1.5">
                                <button
                                    onClick={() => zoomPage(-0.25)}
                                    className="p-2 rounded-full border border-second bg-white dark:bg-second text-darks hover:bg-white dark:bg-second"
                                    aria-label="Zoom out"
                                    title="Zoom out"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-semibold text-tinted tabular-nums w-10 text-center">
                                    {Math.round(pageZoom * 100)}%
                                </span>
                                <button
                                    onClick={() => zoomPage(0.25)}
                                    className="p-2 rounded-full border border-second bg-white dark:bg-second text-darks hover:bg-white dark:bg-second"
                                    aria-label="Zoom in"
                                    title="Zoom in"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile: bar fixed di bawah */}
                        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
                            <div className="bg-gradient-to-t from-second via-second/95 to-transparent px-3.5 pt-20 pb-5">
                                <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-2 pointer-events-auto mb-2">
                                    <span
                                        className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${!hasTimer
                                            ? "bg-white dark:bg-second/80 text-tinted"
                                            : timeLeft <= 60
                                                ? "bg-red-500/10 text-red-600"
                                                : "bg-done/10 text-done"
                                            }`}
                                    >
                                        <Clock className="h-3 w-3" />
                                        {hasTimer ? formattedTime : "Tanpa Waktu"}
                                    </span>
                                    <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} onRaguToggle={toggleRagu} onRequestSubmit={requestSubmit} submitting={submitting} label="Bagian" hideRagu />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !question || total === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-screen px-3.5">
                        <p className="text-tinted mb-4">Form tidak memiliki soal.</p>
                        <button onClick={() => navigate("/")} className="btn rounded-full p-4 bg-darks text-white dark:text-second border-none">
                            Kembali
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center px-3.5 pt-6 pb-28 md:pb-6">
                        <div className="w-full max-w-3xl xl:mt-3" style={{ zoom: pageZoom }}>
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
                                transition={{ duration: 0.45, ease: easeOutExpo }}
                            >
                                {renderQuestionContent(question, current + 1)}
                            </motion.div>

                            {/* Zoom control mobile di bawah kolom form */}
                            <div className="flex md:hidden items-center justify-center mt-3">
                                <div className="bg-white dark:bg-second backdrop-blur-xs px-2 py-1 rounded-full border border-second shadow-xs flex items-center gap-1">
                                    <button
                                        onClick={() => zoomPage(-0.25)}
                                        className="p-1 rounded-full text-darks hover:bg-white dark:bg-second active:scale-95 transition-transform"
                                        aria-label="Zoom out"
                                        title="Zoom out"
                                    >
                                        <ZoomOut className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="text-[11px] font-semibold text-tinted tabular-nums min-w-[36px] text-center">
                                        {Math.round(pageZoom * 100)}%
                                    </span>
                                    <button
                                        onClick={() => zoomPage(0.25)}
                                        className="p-1 rounded-full text-darks hover:bg-white dark:bg-second active:scale-95 transition-transform"
                                        aria-label="Zoom in"
                                        title="Zoom in"
                                    >
                                        <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* NOTE: LAYOUT DESKTOP (>= md) — PageIndicator & tombol Kirim inline di bawah konten */}
                            <div className="hidden md:flex items-center justify-between gap-3 sticky bottom-0 z-30 mt-4 py-3 bg-gradient-to-t from-second via-second/90 to-transparent">
                                <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} isRagu={question ? !!raguQuestions[question.id] : false} onRaguToggle={toggleRagu} onRequestSubmit={requestSubmit} submitting={submitting} groupRagu />
                            </div>
                        </div>

                        {/* Zoom control desktop di ujung bawah layar */}
                        <div className="hidden md:flex fixed bottom-4 right-4 z-40 items-center">
                            <div className="bg-white dark:bg-second p-2 rounded-full border border-second shadow-md flex items-center gap-1.5">
                                <button
                                    onClick={() => zoomPage(-0.25)}
                                    className="p-2 rounded-full border border-second bg-white dark:bg-second text-darks hover:bg-white dark:bg-second"
                                    aria-label="Zoom out"
                                    title="Zoom out"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-semibold text-tinted tabular-nums w-10 text-center">
                                    {Math.round(pageZoom * 100)}%
                                </span>
                                <button
                                    onClick={() => zoomPage(0.25)}
                                    className="p-2 rounded-full border border-second bg-white dark:bg-second text-darks hover:bg-white dark:bg-second"
                                    aria-label="Zoom in"
                                    title="Zoom in"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* NOTE: LAYOUT MOBILE (< md) — bar fixed di bawah dengan gradasi */}
                        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
                            <div className="bg-gradient-to-t from-second via-second/95 to-transparent px-3.5 pt-20 pb-5">
                                <div className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3 pointer-events-auto mb-2">
                                    <PageIndicator total={total} current={current} onPrev={prev} onNext={next} onListClick={goToList} isRagu={question ? !!raguQuestions[question.id] : false} onRaguToggle={toggleRagu} onRequestSubmit={requestSubmit} submitting={submitting} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

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
                                    className="absolute -top-10 right-0 text-white dark:text-second hover:text-gray-300 bg-darks/50 p-2 rounded-full"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                                <img
                                    src={modalImage}
                                    alt="Zoom Preview"
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white dark:bg-second"
                                />
                            </motion.div>
                        </motion.div>
                    </ModalPortal>
                )}
            </AnimatePresence>

            {/* Modal Konfirmasi Kirim Jawaban */}
            <AnimatePresence>
                {showSubmitConfirm && (
                    <ModalPortal key="submit-confirm-modal">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-50 flex items-center justify-center px-3.5"
                            role="dialog"
                            aria-modal="true"
                        >
                            <div
                                className="absolute inset-0 bg-darks/50"
                                onClick={() => setShowSubmitConfirm(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                                transition={{ duration: 0.25 }}
                                className="relative bg-white dark:bg-second border border-second rounded-2xl w-full max-w-sm p-5 shadow-xl"
                            >
                                <div className="items-start text-start">
                                    <div className="w-12 h-12 rounded-full bg-done/10 flex items-center justify-center mb-3">
                                        <Check className="h-5 w-5 text-done" />
                                    </div>
                                    <h3 className="text-base font-bold text-darks text-xl">Kirim Jawaban</h3>
                                    <p className="text-sm text-tinted mt-1">
                                        Apakah anda yakin ingin mengirim jawaban anda?
                                    </p>
                                </div>
                                <div className="mt-5 flex gap-3">
                                    <button
                                        onClick={() => setShowSubmitConfirm(false)}
                                        disabled={submitting}
                                        className="btn flex-1 rounded-full bg-base text-darks border border-second hover:bg-white dark:bg-second disabled:opacity-60"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={confirmSubmit}
                                        disabled={submitting}
                                        className="btn flex-1 rounded-full bg-done text-white dark:text-second border-none hover:opacity-90 disabled:opacity-60"
                                    >
                                        {submitting ? <Spinner size={16} /> : "Ya, Kirim"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </ModalPortal>
                )}
            </AnimatePresence>
        </>
    )
}

export default FormPage