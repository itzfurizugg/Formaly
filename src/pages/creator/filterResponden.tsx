import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronDown, Download, Eye, ListFilter, Search, User, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { showAlert } from "../../lib/alerts"
import { exportFormXlsx, type ExportRespondentItem } from "../../lib/exportForm"
import { richTextToPlain } from "../../lib/richtext"
import BackButton from "../../components/backButton"
import Loading, { Spinner } from "../../components/loading"
import ModalPortal from "../../components/modalPortal"
import { easeOutExpo, modalBackdrop, modalPanel } from "../../lib/motion"

interface QuestionOption {
    id: string
    option_text: string
    is_correct: boolean
}

interface Question {
    id: string
    question_text: string
    question_type: string
    order_index: number
    score_value: number
    question_options: QuestionOption[]
}

interface Submission {
    id: string
    total_score: number | null
    status: string
    started_at: string | null
    submitted_at: string | null
    user: { name: string; email?: string } | null
    token: { token_code: string } | null
}

interface AnswerRecord {
    submission_id: string
    question_id: string
    selected_option_id: string | null
    selected_options: string[] | null
    answer_text: string | null
    score_obtained: number | null
}

interface ActiveQuestionFilter {
    questionId: string
    optionId: string
}

function CreatorFilterResponden() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [formTitle, setFormTitle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [answers, setAnswers] = useState<AnswerRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    // Filter controls
    const [statusFilter, setStatusFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>("")
    const [selectedOptionId, setSelectedOptionId] = useState<string>("")
    const [activeQuestionFilters, setActiveQuestionFilters] = useState<ActiveQuestionFilter[]>([])
    const [showFilterPanel, setShowFilterPanel] = useState(false)

    const loadData = useCallback(async () => {
        if (!user || !id) return
        setLoading(true)

        try {
            // 1. Fetch form
            const { data: formData, error: formErr } = await supabase
                .from("forms")
                .select("id, title, creator_id")
                .eq("id", id)
                .single()

            if (formErr || !formData) {
                showAlert("Form tidak ditemukan.", "error")
                navigate("/creator")
                return
            }
            setFormTitle(formData.title)

            // 2. Fetch questions
            const { data: qData, error: qErr } = await supabase
                .from("questions")
                .select(`
                    id, question_text, question_type, order_index, score_value,
                    question_options ( id, option_text, is_correct )
                `)
                .eq("form_id", id)
                .order("order_index", { ascending: true })

            if (qErr) throw qErr
            const loadedQuestions = (qData as Question[]) || []
            setQuestions(loadedQuestions)

            // 3. Fetch submissions
            const { data: subData, error: subErr } = await supabase
                .from("submissions")
                .select(`
                    id, total_score, status, started_at, submitted_at,
                    user:user_id ( name, email ),
                    token:token_id ( token_code )
                `)
                .eq("form_id", id)
                .order("submitted_at", { ascending: false })

            if (subErr) throw subErr
            const loadedSubs = (subData as unknown as Submission[]) || []
            setSubmissions(loadedSubs)

            // 4. Fetch answers if submissions exist
            const subIds = loadedSubs.map((s) => s.id)
            if (subIds.length > 0) {
                const { data: ansData, error: ansErr } = await supabase
                    .from("answers")
                    .select("submission_id, question_id, selected_option_id, selected_options, answer_text, score_obtained")
                    .in("submission_id", subIds)

                if (ansErr) throw ansErr
                setAnswers((ansData as AnswerRecord[]) || [])
            } else {
                setAnswers([])
            }
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal memuat data responden.", "error")
        } finally {
            setLoading(false)
        }
    }, [user, id, navigate])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Tutup modal filter saat tekan Escape.
    useEffect(() => {
        if (!showFilterPanel) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowFilterPanel(false)
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [showFilterPanel])

    // Map: submission_id -> Map<question_id, AnswerRecord>
    const submissionAnswersMap = useMemo(() => {
        const map = new Map<string, Map<string, AnswerRecord>>()
        for (const ans of answers) {
            if (!map.has(ans.submission_id)) {
                map.set(ans.submission_id, new Map())
            }
            map.get(ans.submission_id)!.set(ans.question_id, ans)
        }
        return map
    }, [answers])

    // Map: question_id -> Question
    const questionsMap = useMemo(() => {
        const map = new Map<string, Question>()
        for (const q of questions) {
            map.set(q.id, q)
        }
        return map
    }, [questions])

    const handleAddQuestionFilter = () => {
        if (!selectedQuestionId || !selectedOptionId) return

        setActiveQuestionFilters((prev) => {
            // Replace if same question is already filtered
            const filtered = prev.filter((f) => f.questionId !== selectedQuestionId)
            return [...filtered, { questionId: selectedQuestionId, optionId: selectedOptionId }]
        })

        setSelectedQuestionId("")
        setSelectedOptionId("")
    }

    const handleRemoveQuestionFilter = (questionId: string) => {
        setActiveQuestionFilters((prev) => prev.filter((f) => f.questionId !== questionId))
    }

    const handleResetAllFilters = () => {
        setStatusFilter("all")
        setSearchQuery("")
        setActiveQuestionFilters([])
        setSelectedQuestionId("")
        setSelectedOptionId("")
    }

    // Filter submissions based on all criteria
    const filteredSubmissions = useMemo(() => {
        return submissions.filter((sub) => {
            // Status filter
            if (statusFilter !== "all" && sub.status !== statusFilter) {
                return false
            }

            // Search query filter (name or email)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim()
                const name = (sub.user?.name || "").toLowerCase()
                const email = (sub.user?.email || "").toLowerCase()
                if (!name.includes(query) && !email.includes(query)) {
                    return false
                }
            }

            // Answer filters
            if (activeQuestionFilters.length > 0) {
                const userAns = submissionAnswersMap.get(sub.id)
                if (!userAns) return false

                for (const filter of activeQuestionFilters) {
                    const record = userAns.get(filter.questionId)
                    if (!record) return false

                    const q = questionsMap.get(filter.questionId)
                    if (!q) return false

                    if (q.question_type === "multiple_choice") {
                        const opts = record.selected_options || []
                        if (!opts.includes(filter.optionId)) return false
                    } else {
                        if (record.selected_option_id !== filter.optionId) return false
                    }
                }
            }

            return true
        })
    }, [submissions, statusFilter, searchQuery, activeQuestionFilters, submissionAnswersMap, questionsMap])

    const handleExport = async () => {
        if (!id) return
        setExporting(true)
        try {
            await exportFormXlsx({
                formId: id,
                formTitle: formTitle || "form",
                data: filteredSubmissions as ExportRespondentItem[],
            })
            showAlert("Data responden terfilter berhasil diexport.", "success")
        } catch (e) {
            showAlert(e instanceof Error ? e.message : "Gagal mengexport data.", "error")
        } finally {
            setExporting(false)
        }
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

    const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)
    const hasActiveFilters = statusFilter !== "all" || !!searchQuery.trim() || activeQuestionFilters.length > 0
    const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (searchQuery.trim() ? 1 : 0) + activeQuestionFilters.length

    return (
        <>
            <Loading show={loading}/>
            {!loading && (
                <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
                    <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                        <BackButton to={`/creator/forms/${id}/submissions`} showOnDesktop/>

                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold font-display text-darks flex items-center gap-2.5">
                                    Filter Responden
                                </h1>
                                <p className="text-sm text-tinted mt-1">
                                    Filter dan cari responden berdasarkan jawaban spesifik yang mereka pilih pada setiap soal.
                                </p>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={exporting || filteredSubmissions.length === 0}
                                className="btn bg-darks text-base border-none rounded-full h-10 min-h-0 px-5 hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shrink-0 self-start sm:self-auto"
                            >
                                {exporting ? <Spinner size={16} /> : <Download className="h-4 w-4" />}
                                Export Data Responden ({filteredSubmissions.length})
                            </button>
                        </div>

                        {/* Google Forms-style toolbar: search + filter button */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama atau email responden..."
                                    className="input input-sm w-full pl-10 bg-white border-second rounded-full text-sm h-10 focus:outline-none focus:border-darks/40 transition-colors"
                                />
                            </div>

                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowFilterPanel((v) => !v)}
                                    className={`btn btn-sm h-10 min-h-0 rounded-full border px-4 gap-2 text-sm transition-all duration-200 ${
                                        showFilterPanel
                                            ? "bg-darks text-white border-darks"
                                            : "bg-white text-darks border-second hover:bg-base"
                                    }`}
                                >
                                    <ListFilter className="h-4 w-4" />
                                    Filter Tanggapan
                                    {activeFilterCount > 0 && (
                                        <span className={`badge badge-sm rounded-full border-none px-1.5 ${showFilterPanel ? "bg-white text-darks" : "bg-darks text-white"}`}>
                                            {activeFilterCount}
                                        </span>
                                    )}
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? "rotate-180" : ""}`} />
                                </button>
                            </div>
                        </div>

                        {/* Filter modal popup */}
                        <AnimatePresence>
                            {showFilterPanel && (
                                <ModalPortal key="filter-responden-modal">
                                    <motion.div
                                        variants={modalBackdrop}
                                        initial="hidden"
                                        animate="show"
                                        exit="exit"
                                        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3.5 pt-16 sm:pt-0"
                                        role="dialog"
                                        aria-modal="true"
                                    >
                                        <div
                                            className="absolute inset-0 bg-darks/50"
                                            onClick={() => setShowFilterPanel(false)}
                                        />
                                        <motion.div
                                            variants={modalPanel}
                                            className="relative bg-white border border-second rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                                                        <ListFilter className="h-4 w-4 text-darks" />
                                                    </div>
                                                    <h3 className="text-base font-bold text-darks">Filter Tanggapan</h3>
                                                    {activeFilterCount > 0 && (
                                                        <span className="badge badge-sm rounded-full border-none bg-darks text-white px-2">{activeFilterCount}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setShowFilterPanel(false)}
                                                    className="text-tinted hover:text-darks transition-colors p-1"
                                                    aria-label="Tutup"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {/* Status */}
                                                <div>
                                                    <label className="block text-xs font-medium text-tinted mb-1">Status Pengerjaan</label>
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="select select-sm w-full bg-base border-second rounded-lg text-xs focus:outline-none focus:border-darks/40 transition-colors"
                                                    >
                                                        <option value="all">Semua Status</option>
                                                        <option value="SUBMITTED">Selesai</option>
                                                        <option value="IN_PROGRESS">Sedang Dikerjakan</option>
                                                    </select>
                                                </div>

                                                {/* Select Question */}
                                                <div>
                                                    <label className="block text-xs font-medium text-tinted mb-1">Pertanyaan</label>
                                                    <select
                                                        value={selectedQuestionId}
                                                        onChange={(e) => {
                                                            setSelectedQuestionId(e.target.value)
                                                            setSelectedOptionId("")
                                                        }}
                                                        className="select select-sm w-full bg-base border-second rounded-lg text-xs focus:outline-none focus:border-darks/40 transition-colors"
                                                    >
                                                        <option value="">-- Pilih pertanyaan --</option>
                                                        {questions
                                                            .filter((q) => q.question_type !== "text")
                                                            .map((q, idx) => (
                                                                <option key={q.id} value={q.id}>
                                                                    Soal {idx + 1}: {richTextToPlain(q.question_text).slice(0, 45)}
                                                                    {richTextToPlain(q.question_text).length > 45 ? "..." : ""}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Option Selector when a question is selected — Google Forms style answer chips */}
                                            {selectedQuestion && (
                                                <div className="p-3.5 bg-base/80 border border-second rounded-xl space-y-2.5 mt-3">
                                                    <p className="text-xs font-semibold text-darks">
                                                        Jawaban: <span className="text-tinted font-normal">{richTextToPlain(selectedQuestion.question_text)}</span>
                                                    </p>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {selectedQuestion.question_options?.map((opt, oIdx) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setSelectedOptionId(opt.id)}
                                                                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                                                    selectedOptionId === opt.id
                                                                        ? "bg-darks text-white border-darks"
                                                                        : "bg-white text-darks border-second hover:bg-second"
                                                                }`}
                                                            >
                                                                {String.fromCharCode(65 + oIdx)}. {richTextToPlain(opt.option_text)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-dashed border-second">
                                                <button
                                                    type="button"
                                                    onClick={handleResetAllFilters}
                                                    disabled={!hasActiveFilters}
                                                    className="btn btn-sm btn-ghost text-xs text-tinted hover:text-wrong hover:bg-wrong/10 rounded-full disabled:opacity-40 transition-colors"
                                                >
                                                    Hapus Semua
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleAddQuestionFilter()
                                                        setShowFilterPanel(false)
                                                    }}
                                                    disabled={!selectedQuestionId || !selectedOptionId}
                                                    className="btn btn-sm bg-darks text-white border-none rounded-full px-4 hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 text-xs"
                                                >
                                                    Terapkan
                                                </button>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </ModalPortal>
                            )}
                        </AnimatePresence>

                        {/* Active filter chips — shown under the toolbar like Google Forms */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {statusFilter !== "all" && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-base text-darks border border-second">
                                        Status: {statusFilter === "SUBMITTED" ? "Selesai" : "Proses"}
                                        <button
                                            onClick={() => setStatusFilter("all")}
                                            className="text-tinted hover:text-wrong transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}

                                {searchQuery.trim() && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-base text-darks border border-second">
                                        Cari: "{searchQuery}"
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="text-tinted hover:text-wrong transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}

                                {activeQuestionFilters.map((af) => {
                                    const q = questionsMap.get(af.questionId)
                                    const qIdx = questions.findIndex((item) => item.id === af.questionId)
                                    const opt = q?.question_options.find((o) => o.id === af.optionId)
                                    const optIdx = q?.question_options.findIndex((o) => o.id === af.optionId) ?? 0
                                    return (
                                        <span
                                            key={af.questionId}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-done/10 text-done border border-done/20 font-medium"
                                        >
                                            Soal {qIdx + 1} = Opsi {String.fromCharCode(65 + optIdx)} ({richTextToPlain(opt?.option_text || "").slice(0, 20)})
                                            <button
                                                onClick={() => handleRemoveQuestionFilter(af.questionId)}
                                                className="hover:text-wrong transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    )
                                })}

                                <button
                                    onClick={handleResetAllFilters}
                                    className="text-xs text-tinted hover:text-wrong underline underline-offset-2 transition-colors ml-1"
                                >
                                    Hapus semua filter
                                </button>
                            </div>
                        )}

                        {/* Summary Bar */}
                        <div className="bg-white border border-second p-4 rounded-xl shadow-sm mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-tinted">Hasil Pencarian & Filter</p>
                                <p className="text-lg font-bold text-darks">
                                    {filteredSubmissions.length} <span className="text-xs font-normal text-tinted">dari {submissions.length} total responden</span>
                                </p>
                            </div>

                            <span
                                className={`badge rounded-full px-3 py-1 text-xs font-semibold ${
                                    filteredSubmissions.length > 0
                                        ? "bg-done/10 text-done border-none"
                                        : "bg-wrong/10 text-wrong border-none"
                                }`}
                            >
                                {filteredSubmissions.length > 0 ? "Responden Ditemukan" : "Tidak Ada Kecocokan"}
                            </span>
                        </div>

                        {/* Respondent Cards List */}
                        {submissions.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-second shadow-sm rounded-xl">
                                <User className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                                <p className="text-tinted font-medium">Belum ada responden yang mengisi formulir ini.</p>
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-second shadow-sm rounded-xl">
                                <ListFilter className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                                <p className="text-darks font-semibold">Tidak ada responden yang cocok dengan kriteria filter.</p>
                                <p className="text-xs text-tinted mt-1">Coba ubah opsi jawaban atau reset filter di atas.</p>
                                <button
                                    onClick={handleResetAllFilters}
                                    className="btn btn-sm bg-darks text-white border-none rounded-full mt-4 px-4 hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSubmissions.map((sub, index) => {
                                    const subAnswers = submissionAnswersMap.get(sub.id)
                                    return (
                                        <motion.div
                                            key={sub.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25, ease: easeOutExpo, delay: Math.min(index * 0.04, 0.3) }}
                                            className="bg-white border border-second rounded-xl p-4 sm:p-5 shadow-sm hover:border-darks/30 transition-all duration-200"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dashed border-second">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-bold text-base text-darks truncate">
                                                            {sub.user?.name || "Pengguna"}
                                                        </h3>
                                                        <span
                                                            className={`badge rounded-full text-xs ${
                                                                sub.status === "SUBMITTED"
                                                                    ? "bg-done/10 text-done border-none"
                                                                    : "badge-ghost text-tinted"
                                                            }`}
                                                        >
                                                            {sub.status === "SUBMITTED" ? "Selesai" : "Proses"}
                                                        </span>
                                                    </div>
                                                    {sub.user?.email && (
                                                        <p className="text-xs text-tinted mt-0.5">{sub.user.email}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 self-end sm:self-center">
                                                    <div className="text-right">
                                                        <p className="text-[10px] uppercase text-tinted font-bold">Skor</p>
                                                        <p className="text-xl font-extrabold text-darks leading-none">
                                                            {sub.total_score != null ? sub.total_score : "-"}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate(`/creator/forms/${id}/submissions/${sub.id}`)}
                                                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second rounded-full px-3.5 transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> Lihat Detail
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details of answers for active filtered questions */}
                                            {activeQuestionFilters.length > 0 && (
                                                <div className="mt-3 pt-1 space-y-2">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-tinted">
                                                        Jawaban pada Soal Terfilter:
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {activeQuestionFilters.map((af) => {
                                                            const q = questionsMap.get(af.questionId)
                                                            const qIdx = questions.findIndex((item) => item.id === af.questionId)
                                                            const record = subAnswers?.get(af.questionId)
                                                            const chosenOptId = record?.selected_option_id || record?.selected_options?.[0]
                                                            const opt = q?.question_options.find((o) => o.id === chosenOptId)
                                                            const optIdx = q?.question_options.findIndex((o) => o.id === chosenOptId) ?? 0

                                                            return (
                                                                <div
                                                                    key={af.questionId}
                                                                    className="p-2.5 bg-base/60 border border-second rounded-xl text-xs"
                                                                >
                                                                    <p className="font-semibold text-darks truncate">
                                                                        Soal {qIdx + 1}: {richTextToPlain(q?.question_text || "")}
                                                                    </p>
                                                                    <p className="text-tinted mt-1">
                                                                        Jawaban:{" "}
                                                                        <span className="font-bold text-done">
                                                                            Opsi {String.fromCharCode(65 + optIdx)} - {richTextToPlain(opt?.option_text || "-")}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinted pt-2 border-t border-second/50">
                                                <span>Token: <span className="font-mono text-darks">{sub.token?.token_code || "-"}</span></span>
                                                <span>Dikirim: <span className="text-darks">{fmtDate(sub.submitted_at)}</span></span>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default CreatorFilterResponden