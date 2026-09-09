import { useEffect, useState, useCallback, useMemo, useRef, type DragEvent } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Plus, Pencil, Trash2, Save, X, Check, GripVertical, ImageIcon, CheckCircle, ListChecks } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import QuestionImportModal from "../../components/creator/QuestionImportModal"
import CreateButton from "../../components/creator/createButton"
import MediaUpload from "../../components/MediaUpload"
import QuestionMedia from "../../components/QuestionMedia"
import {
    extractQuestionConfig,
    embedQuestionConfig,
    FILE_UPLOAD_DEFAULTS,
    type QuestionConfig,
    type DateTimeVariant,
} from "../../lib/questionConfig"
import RichTextEditor, { RichText } from "../../components/richText"
import { richTextToPlain } from "../../lib/richtext"
import { alertSaveSuccess, confirmDelete, showAlert } from "../../lib/alerts"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo } from "../../lib/motion"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import { Spinner } from "../../components/loading"

const TYPES_WITH_OPTIONS = ["single_choice", "multiple_choice", "dropdown"]
const TYPES_NO_OPTIONS = ["text", "file_upload", "date_time"]

// Kunci cache draft editor soal. Draft disimpan ke sessionStorage (via pageCache)
// setiap kali editor ditutup lewat navigasi (pindah tab/keluar) sebelum disimpan,
// supaya soal & media yang sudah di-upload tidak hilang saat kembali ke halaman ini.
function questionDraftKey(userId: string | undefined, formId: string | undefined) {
    return userId && formId ? `questions:draft:${userId}:${formId}` : null
}

/** Snapshot state editor yang bisa dipulihkan saat kembali ke halaman soal. */
interface QuestionDraft {
    editingId: string | null
    questionText: string
    questionType: string
    scoreValue: number
    orderIndex: number
    imageQuestion: string
    mediaUrl: string | null
    isRequired: boolean
    options: Option[]
    removedOptionIds: string[]
    dateTimeVariant: DateTimeVariant
}

interface Option {
    id: string | null
    option_text: string
    is_correct: boolean
    /** TODO(backend): kolom question_options.media_url menyusul lewat migration. */
    media_url?: string | null
}

interface Question {
    id: string
    question_text: string
    question_type: string
    score_value: number
    order_index: number
    image_question: string | null
    media_url: string | null
    is_required: boolean
    question_options: Option[]
    config?: QuestionConfig | null
}

function Questions({ embedded = false }: { embedded?: boolean }) {
    const { id } = useParams()
    const { user } = useAuth()

    // Cache daftar soal per form supaya kembali ke halaman ini cukup fade-in
    // tanpa overlay loading lagi; data tetap di-refresh diam-diam.
    // Dibaca sekali lewat state initializer supaya identitasnya stabil; membaca
    // langsung dari pageGet tiap render membuat loadAll (useCallback) selalu
    // baru dan useEffect akan memicu fetch terus-menerus.
    const [cached] = useState<{ formTitle: string; questions: Question[] } | undefined>(() =>
        user && id ? pageGet<{ formTitle: string; questions: Question[] }>(`questions:${user.id}:${id}`) : undefined
    )
    const [questions, setQuestions] = useState<Question[]>(cached?.questions ?? [])
    const [loading, setLoading] = useState(!cached)

    // Restore draft editor yang belum tersimpan (mis. media sudah di-upload tapi
    // soal belum di-save lalu pindah tab/keluar halaman). Dibaca sekali lewat
    // state initializer supaya identitasnya stabil, sama seperti `cached`.
    const [savedDraft] = useState<QuestionDraft | null>(() => {
        const key = questionDraftKey(user?.id, id)
        return key ? (pageGet<QuestionDraft>(key) ?? null) : null
    })

    const [showEditor, setShowEditor] = useState(!!savedDraft)
    const [editingId, setEditingId] = useState<string | null>(savedDraft?.editingId ?? null)
    const [questionText, setQuestionText] = useState(savedDraft?.questionText ?? "")
    const [questionType, setQuestionType] = useState(savedDraft?.questionType ?? "single_choice")
    const [scoreValue, setScoreValue] = useState(savedDraft?.scoreValue ?? 0)
    const [orderIndex, setOrderIndex] = useState(savedDraft?.orderIndex ?? 0)
    const [imageQuestion, setImageQuestion] = useState(savedDraft?.imageQuestion ?? "")
    const [mediaUrl, setMediaUrl] = useState<string | null>(savedDraft?.mediaUrl ?? null)
    const [isRequired, setIsRequired] = useState(savedDraft?.isRequired ?? false)
    const [options, setOptions] = useState<Option[]>(savedDraft?.options ?? [])
    const [removedOptionIds, setRemovedOptionIds] = useState<string[]>(savedDraft?.removedOptionIds ?? [])
    const [dateTimeVariant, setDateTimeVariant] = useState<DateTimeVariant>(savedDraft?.dateTimeVariant ?? "date_and_time")
    const [optionMediaOpen, setOptionMediaOpen] = useState<Record<number, boolean>>({})
    const [saving, setSaving] = useState(false)
    const [mediaUploading, setMediaUploading] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [dragId, setDragId] = useState<string | null>(null)
    const [orderIds, setOrderIds] = useState<string[] | null>(null)

    // Pantau state editor terbaru lewat ref (bukan lewat dependency array yang
    // panjang), supaya saat komponen unmount (pindah tab/keluar) kita bisa
    // menyimpan snapshot editor yang benar-benar terakhir di-render.
    const editorStateRef = useRef<{ showEditor: boolean; draft: QuestionDraft }>({
        showEditor,
        draft: {
            editingId,
            questionText,
            questionType,
            scoreValue,
            orderIndex,
            imageQuestion,
            mediaUrl,
            isRequired,
            options,
            removedOptionIds,
            dateTimeVariant,
        },
    })
    useEffect(() => {
        editorStateRef.current = {
            showEditor,
            draft: {
                editingId,
                questionText,
                questionType,
                scoreValue,
                orderIndex,
                imageQuestion,
                mediaUrl,
                isRequired,
                options,
                removedOptionIds,
                dateTimeVariant,
            },
        }
    })

    // Simpan draft saat keluar halaman. Kalau editor sedang terbuka, snapshot
    // dipertahankan supaya tidak hilang (termasuk media yang sudah di-upload
    // tapi soal belum di-save); kalau editor ditutup/tidak aktif, hapus draft.
    useEffect(() => {
        return () => {
            const key = questionDraftKey(user?.id, id)
            if (!key) return
            const current = editorStateRef.current
            if (current.showEditor) {
                pageSet<QuestionDraft>(key, current.draft)
            } else if (pageGet<QuestionDraft>(key) !== undefined) {
                pageSet(key, undefined)
            }
        }
    }, [user?.id, id])

    const loadAll = useCallback(async () => {
        if (!user || !id) return
        if (!cached) setLoading(true)

        let newTitle = ""
        let newQuestions: Question[] = []

        const { data: form } = await supabase
            .from("forms")
            .select("title")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()
        if (form) {
            newTitle = form.title
        }

        const { data: qs } = await supabase
            .from("questions")
            .select(`
                id, question_text, question_type, score_value, order_index, image_question, media_url, is_required,
                question_options ( id, option_text, is_correct, order_index )
            `)
            .eq("form_id", id)
            .order("order_index", { ascending: true })
        if (qs) {
            const withConfig = (qs as unknown as Question[]).map((q) => {
                const { html, config } = extractQuestionConfig(q.question_text)
                return { ...q, question_text: html, config }
            })
            setQuestions(withConfig)
            newQuestions = withConfig
        }

        if (user && id) {
            pageSet(`questions:${user.id}:${id}`, { formTitle: newTitle, questions: newQuestions })
        }
        setLoading(false)
    }, [user, id, cached])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    const resetEditor = () => {
        // Tahan modal selama media masih di-upload: menutup di tengah proses
        // berisiko menghilangkan referensi file yang belum selesai tersimpan.
        if (mediaUploading) {
            showAlert("Tunggu sampai upload media selesai.", "warning")
            return
        }
        setEditingId(null)
        setQuestionText("")
        setQuestionType("single_choice")
        setScoreValue(0)
        setOrderIndex(questions.length)
        setImageQuestion("")
        setMediaUrl(null)
        setIsRequired(false)
        setOptions([])
        setRemovedOptionIds([])
        setDateTimeVariant("date_and_time")
        setOptionMediaOpen({})
        setShowEditor(false)
        // Editor sengaja ditutup / soal sudah disimpan: bersihkan draft agar
        // tidak muncul lagi saat kembali ke halaman ini.
        const key = questionDraftKey(user?.id, id)
        if (key) pageSet(key, undefined)
    }

    const startAdd = () => {
        resetEditor()
        setOrderIndex(questions.length)
        setShowEditor(true)
    }

    const downloadTemplate = () => {
        const a = document.createElement("a")
        a.href = "/template-soal.docx"
        a.download = "template-soal.docx"
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const startEdit = (q: Question) => {
        resetEditor()
        setEditingId(q.id)
        setQuestionText(q.question_text)
        setQuestionType(q.question_type)
        setScoreValue(Number(q.score_value) || 0)
        setOrderIndex(q.order_index || 0)
        setImageQuestion(q.image_question || "")
        setMediaUrl(q.media_url)
        setIsRequired(!!q.is_required)
        setOptions((q.question_options || []).map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct, media_url: o.media_url || null })))
        if (q.config?.dateTimeVariant) setDateTimeVariant(q.config.dateTimeVariant)
        setShowEditor(true)
    }

    const addOption = () => {
        setOptions([...options, { id: null, option_text: "", is_correct: false, media_url: null }])
    }

    const updateOption = (index: number, patch: Partial<Option>) => {
        setOptions(options.map((o, i) => (i === index ? { ...o, ...patch } : o)))
    }

    const removeOption = (index: number) => {
        const opt = options[index]
        if (opt?.id) setRemovedOptionIds([...removedOptionIds, opt.id])
        setOptions(options.filter((_, i) => i !== index))
        setOptionMediaOpen((prev) => {
            const next = { ...prev }
            delete next[index]
            return next
        })
    }

    // Saat ganti ke tipe tanpa opsi, bersihkan pilihan yang tersisa supaya tidak
    // ikut tersimpan (file_upload & date_time tidak memakai question_options).
    const handleTypeChange = (t: string) => {
        setQuestionType(t)
        if (TYPES_NO_OPTIONS.includes(t)) {
            setOptions([])
            setRemovedOptionIds((prev) => [...prev, ...options.map((o) => o.id || "").filter(Boolean)])
            setOptionMediaOpen({})
        }
    }

    const handleSave = async () => {
        if (!id) return
        if (mediaUploading) {
            showAlert("Tunggu sampai upload media selesai.", "warning")
            return
        }
        if (!richTextToPlain(questionText).trim()) {
            showAlert("Soal tidak boleh kosong.", "error")
            return
        }
        if (TYPES_WITH_OPTIONS.includes(questionType) && options.length === 0) {
            showAlert("Tambahkan minimal satu pilihan jawaban.", "error")
            return
        }

        setSaving(true)

        // TODO(backend): kolom config per soal (mis. date_timeVariant, batas file)
        // menyusul lewat migration. Sementara disisipkan ke question_text supaya
        // sub-tipe soal tetap bertahan & terbaca di halaman responden.
        const finalQuestionText = embedQuestionConfig(
            questionText,
            questionType === "date_time" ? { dateTimeVariant } : null,
        )

        // Panggil fungsi RPC yang sudah dibuat di database
        const { error: rpcErr } = await supabase.rpc("save_question_with_options", {
            p_question_id: editingId || null,
            p_form_id: id,
            // TODO(backend): kolom question_options.media_url belum ada, jadi
            // media opsi hanya disimpan di state frontend sampai migration jalan.
            p_question_text: finalQuestionText,
            p_question_type: questionType,
            p_score_value: scoreValue,
            p_order_index: orderIndex,
            p_image_question: imageQuestion || null,
            p_is_required: isRequired,
            p_options: options.map((o, idx) => ({
                id: o.id || null,
                option_text: o.option_text,
                is_correct: o.is_correct,
                order_index: idx,
            })),
            p_removed_option_ids: removedOptionIds,
        })

        setSaving(false)

        if (rpcErr) {
            // Cek jika error disebabkan oleh Foreign Key (opsi sudah dipilih siswa)
            if (rpcErr.message.includes("violates foreign key constraint")) {
                showAlert("Opsi jawaban ini tidak bisa dihapus karena sudah pernah dipilih oleh siswa yang mengerjakan.", "error")
            } else {
                showAlert("Gagal menyimpan soal: " + rpcErr.message, "error")
            }
            return
        }

        // RPC save_question_with_options tidak menangani media_url, dan kolom
        // questions.media_url tidak bisa di-update langsung oleh client (RLS).
        // Persist media_url lewat RPC terpisah set_question_media (SECURITY
        // DEFINER). Untuk soal baru (editingId null) kita ambil soal terbaru
        // pada form ini sebagai target, karena RPC tersebut tidak mengembalikan id.
        let mediaTargetId: string | null = editingId
        if (!mediaTargetId) {
            const { data: newest } = await supabase
                .from("questions")
                .select("id")
                .eq("form_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
            if (newest && newest[0]) mediaTargetId = newest[0].id
        }
        if (mediaTargetId) {
            const { error: mediaErr } = await supabase.rpc("set_question_media", {
                p_question_id: mediaTargetId,
                p_media_url: mediaUrl,
            })
            if (mediaErr && !/does not exist|not found|PGRST202/i.test(mediaErr.message)) {
                showAlert("Gagal menyimpan media soal: " + mediaErr.message, "error")
            }
        }

        // Jaminan posisi tersimpan di database: RPC lama bisa saja mengabaikan
        // p_order_index, jadi posisi final di-update langsung untuk soal lama.
        if (editingId) {
            const { error: orderErr } = await supabase
                .from("questions")
                .update({ order_index: orderIndex })
                .eq("id", editingId)
            if (orderErr) {
                showAlert("Gagal menyimpan urutan soal: " + orderErr.message, "error")
            }
        }

        resetEditor()
        loadAll()
        alertSaveSuccess(editingId ? "Soal berhasil diperbarui." : "Soal berhasil ditambahkan.")
    }

    const handleDelete = async (q: Question) => {
        confirmDelete({
            title: "Hapus soal ini?",
            description: "Pilihan jawaban pada soal ini akan ikut terhapus.",
            onConfirm: async () => {
                const { error } = await supabase.rpc("delete_question", { p_question_id: q.id })
                if (error) {
                    // RPC belum tersedia di database -> fallback ke DELETE langsung.
                    if (/does not exist|not found|PGRST202/i.test(error.message)) {
                        const { error: optionError } = await supabase.from("question_options").delete().eq("question_id", q.id)
                        if (optionError) throw new Error(optionError.message)
                        const { error: questionError } = await supabase.from("questions").delete().eq("id", q.id)
                        if (questionError) throw new Error(questionError.message)
                    } else {
                        throw new Error(error.message)
                    }
                }
                await loadAll()
            },
        })
    }

    const persistOrder = async (list: Question[]) => {
        let failed = false
        for (let i = 0; i < list.length; i++) {
            if (list[i].order_index !== i) {
                const { error } = await supabase.from("questions").update({ order_index: i }).eq("id", list[i].id)
                if (error) failed = true
            }
        }
        if (failed) showAlert("Sebagian urutan soal gagal disimpan ke database.", "error")
    }

    const handleDragStart = (e: DragEvent, id: string) => {
        setDragId(id)
        setOrderIds(questions.map((q) => q.id))
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", id)

        // Gambar drag custom: pil kecil "Soal N" menggantikan screenshot kartu
        // penuh bawaan browser yang besar & buram. Elemen diletakkan di luar
        // viewport agar tidak terlihat, cukup untuk direkam setDragImage.
        const srcIdx = questions.findIndex((q) => q.id === id)
        const ghost = document.createElement("div")
        ghost.textContent = `Soal ${srcIdx + 1}`
        ghost.style.cssText =
            "position:fixed;top:-200px;left:-200px;padding:7px 16px;border-radius:9999px;" +
            "background:#393E46;color:#F7F7F7;font-size:13px;font-weight:600;line-height:1;" +
            "font-family:'Funnel Display','DM Sans',ui-sans-serif,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.3);"
        document.body.appendChild(ghost)
        e.dataTransfer.setDragImage(ghost, 20, 20)
        window.setTimeout(() => ghost.remove(), 0)
    }

    // Selama drag, urutan kartu diperbarui mengikuti posisi kursor sehingga
    // kreator melihat preview lokasi drop secara langsung sebelum melepas soal.
    // Insertion memakai garis tengah kartu sebagai ambang agar urutan tidak
    // bolak-balik (flicker) saat kursor tepat berada di batas dua kartu.
    const handleDragOver = (e: DragEvent, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!dragId || !orderIds) return
        const from = orderIds.indexOf(dragId)
        if (from === -1 || from === index) return

        const rect = e.currentTarget.getBoundingClientRect()
        const pastMid = e.clientY > rect.top + rect.height / 2
        const target = from < index ? (pastMid ? index : index - 1) : pastMid ? index + 1 : index
        if (target < 0 || target >= orderIds.length) return

        setOrderIds((prev) => {
            if (!prev || prev[index] === undefined) return prev
            const curFrom = prev.indexOf(dragId)
            if (curFrom === -1 || curFrom === target) return prev
            const next = [...prev]
            next.splice(curFrom, 1)
            next.splice(target, 0, dragId)
            return next
        })
    }

    const finishDrag = () => {
        if (dragId && orderIds && questions.some((q, i) => q.id !== orderIds[i])) {
            const byId = new Map(questions.map((q) => [q.id, q]))
            const next = orderIds.map((qid) => byId.get(qid)).filter((q): q is Question => Boolean(q))
            setQuestions(next)
            persistOrder(next)
        }
        setDragId(null)
        setOrderIds(null)
    }

    const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        finishDrag()
    }

    const handleDragEnd = () => {
        finishDrag()
    }

    const previewQuestions = useMemo(() => {
        if (!dragId || !orderIds || orderIds.length !== questions.length) return questions
        const byId = new Map(questions.map((q) => [q.id, q]))
        return orderIds.map((qid) => byId.get(qid)).filter((q): q is Question => Boolean(q))
    }, [questions, dragId, orderIds])

    const typeLabel = (t: string) => {
        if (t === "multiple_choice") return "Pilihan Ganda"
        if (t === "text") return "Isian"
        if (t === "dropdown") return "Dropdown"
        if (t === "file_upload") return "Upload File"
        if (t === "date_time") return "Tanggal & Jam"
        return "Pilihan Tunggal"
    }

    const renderEditor = () => (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
            {/* Overlay gelap; klik di luar menutup editor */}
            <motion.div
                className="absolute inset-0 bg-darks/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={resetEditor}
            />

            <motion.div
                key="question-editor"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                className="relative w-full sm:max-w-3xl max-h-[88vh] sm:max-h-[85vh] overflow-y-auto bg-white border border-second shadow-2xl rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-8"
            >
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="font-semibold text-darks text-lg">{editingId ? "Edit Soal" : "Tambah Soal"}</h2>
                        <p className="text-sm text-tinted mt-0.5">
                            {editingId ? "Perbarui detail soal ini." : "Lengkapi detail soal di bawah ini."}
                        </p>
                    </div>
                    <button onClick={resetEditor} className="btn btn-sm btn-ghost text-tinted -mt-1 -mr-1">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Media soal tampil paling atas dengan UI ringkas */}
                    <MediaUpload
                        compact
                        value={mediaUrl}
                        onChange={setMediaUrl}
                        onUploadingChange={setMediaUploading}
                        label="Media Soal"
                        helpText="Gambar/video/audio pendukung yang tampil bersama soal."
                    />

                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Soal</label>
                        <RichTextEditor
                            value={questionText}
                            onChange={setQuestionText}
                            placeholder="Tulis soal di sini..."
                        />
                    </div>

                    <div className="rounded-xl border border-second bg-base/60 p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Tipe</label>
                                <select
                                    className="select w-full bg-white border-second focus:border-done focus:outline-none rounded-xl"
                                    value={questionType}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                >
                                    <option value="single_choice">Pilihan Tunggal</option>
                                    <option value="multiple_choice">Pilihan Ganda</option>
                                    <option value="dropdown">Dropdown / Select</option>
                                    <option value="file_upload">Upload File sebagai Jawaban</option>
                                    <option value="date_time">Tanggal & Jam</option>
                                    <option value="text">Isian</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Skor</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="input w-full bg-white border-second focus:border-done focus:outline-none"
                                    value={scoreValue}
                                    onChange={(e) => setScoreValue(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Urutan</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input w-full bg-white border-second focus:border-done focus:outline-none"
                                    value={orderIndex}
                                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-second/70">
                            <div className="pt-3">
                                <span className="text-sm font-medium text-darks">Wajib dijawab</span>
                                <p className="text-xs text-tinted mt-0.5">Responden harus mengisi soal ini sebelum lanjut.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRequired(!isRequired)}
                                role="switch"
                                aria-checked={isRequired}
                                aria-label="Tandai sebagai wajib dijawab"
                                className={`relative shrink-0 h-6 w-11 rounded-full mt-3 transition-colors ${
                                    isRequired ? "bg-darks" : "bg-second"
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                        isRequired ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {questionType === "date_time" && (
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Jenis Jawaban</label>
                            <select
                                className="select w-full bg-base border-second focus:border-done focus:outline-none rounded-xl"
                                value={dateTimeVariant}
                                onChange={(e) => setDateTimeVariant(e.target.value as DateTimeVariant)}
                            >
                                <option value="date_and_time">Tanggal & Jam</option>
                                <option value="date_only">Tanggal saja</option>
                                <option value="time_only">Jam saja</option>
                            </select>
                            {/* TODO(backend): pilihan sub-tipe ini sementara disisipkan ke
                                question_text via embedQuestionConfig sampai kolom config permanen ada. */}
                        </div>
                    )}

                    {questionType === "file_upload" && (
                        <div className="rounded-xl bg-base border border-second px-4 py-3 text-sm text-tinted">
                            Responden mengunggah file sebagai jawaban.
                            Batas maksimal <span className="font-semibold text-darks">{FILE_UPLOAD_DEFAULTS.maxMB} MB</span> dengan tipe{" "}
                            <span className="font-semibold text-darks">{FILE_UPLOAD_DEFAULTS.types.join(", ")}</span>.
                            <p className="text-xs text-tinted/80 mt-1">
                                TODO(backend): penyimpanan jawaban file &amp; kolom URL jawaban menyusul; untuk sekarang jawaban disimpan di state lokal saat pengerjaan.
                            </p>
                        </div>
                    )}

                    {TYPES_WITH_OPTIONS.includes(questionType) && (
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1 ml-1 mr-1">
                                <label className="text-sm font-medium text-darks">
                                    Pilihan Jawaban
                                    {options.length > 0 && (
                                        <span className="ml-2 text-xs text-tinted font-normal">({options.length})</span>
                                    )}
                                </label>
                                <button onClick={addOption} className="btn btn-sm bg-white text-darks border border-second hover:bg-second">
                                    <Plus className="h-3.5 w-3.5" /> Tambah Pilihan
                                </button>
                            </div>
                            <p className="flex items-center gap-1.5 ml-1 text-xs text-tinted mb-3">
                                <CheckCircle className="h-3.5 w-3.5 text-done shrink-0" />
                                {questionType === "multiple_choice"
                                    ? "Tandai kotak di kiri untuk menetapkan jawaban benar — boleh lebih dari satu."
                                    : "Tandai lingkaran di kiri untuk menetapkan jawaban benar (kunci)."}
                            </p>

                            {options.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-second px-4 py-8 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-base border border-second">
                                        <ListChecks className="h-5 w-5 text-tinted" />
                                    </div>
                                    <p className="text-sm text-tinted">Belum ada pilihan jawaban.</p>
                                    <button onClick={addOption} className="btn btn-sm btn-ghost text-done hover:bg-done/10">
                                        <Plus className="h-3.5 w-3.5" /> Tambah pilihan pertama
                                    </button>
                                </div>
                            ) : (
                            <div className="space-y-2">
                                {options.map((opt, index) => {
                                    const isSingle = questionType === "single_choice" || questionType === "dropdown"
                                    const isCorrect = !!opt.is_correct
                                    return (
                                    <div
                                        key={index}
                                        className={`rounded-xl border transition-colors ${
                                            isCorrect
                                                ? "border-done/60 bg-done/5"
                                                : "border-second bg-white hover:border-done/40 hover:bg-base/40"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 p-2.5 pr-1.5">
                                        {/* Indikator kunci: radio untuk single/dropdown, checkbox untuk multiple */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isSingle && !isCorrect) {
                                                    setOptions(
                                                        options.map((o, i) => (i === index ? { ...o, is_correct: true } : { ...o, is_correct: false }))
                                                    )
                                                } else {
                                                    updateOption(index, { is_correct: !isCorrect })
                                                }
                                            }}
                                            role={isSingle ? "radio" : "checkbox"}
                                            aria-checked={isCorrect}
                                            title={isCorrect ? "Jawaban benar" : "Tandai sebagai jawaban benar"}
                                            aria-label={`Tandai pilihan ${index + 1} sebagai jawaban benar`}
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all ${
                                                isSingle ? "rounded-full" : "rounded-[5px]"
                                            } ${
                                                isCorrect
                                                    ? "border-done bg-done text-base shadow-sm"
                                                    : "border-tinted/40 bg-white text-transparent hover:border-done/70"
                                            }`}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={3.5} />
                                        </button>

                                        <RichTextEditor
                                            compact
                                            className="flex-1 min-w-0"
                                            value={opt.option_text}
                                            onChange={(v) => updateOption(index, { option_text: v })}
                                            placeholder={`Pilihan ${index + 1}`}
                                        />

                                        {/* Aksi ringkas: media & hapus */}
                                        <div className="flex shrink-0 items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setOptionMediaOpen((prev) => ({ ...prev, [index]: !prev[index] }))}
                                                aria-pressed={!!opt.media_url}
                                                title={opt.media_url ? "Media opsi aktif" : "Tambah media pada opsi"}
                                                className={`rounded-lg p-2 transition-colors ${
                                                    opt.media_url
                                                        ? "bg-darks text-base"
                                                        : "text-tinted hover:bg-base hover:text-darks"
                                                }`}
                                            >
                                                <ImageIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                title="Hapus pilihan"
                                                className="rounded-lg p-2 text-tinted transition-colors hover:bg-wrong/10 hover:text-wrong"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        </div>

                                        {optionMediaOpen[index] && (
                                            <div className="mx-2.5 pb-2.5 border-t border-second/60 pt-2">
                                                {/* TODO(backend): media opsi baru tersimpan penuh ke
                                                    question_options.media_url setelah kolom + RPC dimigrasi. */}
                                                <MediaUpload
                                                    compact
                                                    value={opt.media_url}
                                                    onChange={(url) => updateOption(index, { media_url: url })}
                                                    onUploadingChange={setMediaUploading}
                                                    label={`Media Opsi ${index + 1}`}
                                                    helpText="Gambar/audio/video yang tampil bersama teks opsi."
                                                />
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || mediaUploading}
                    className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 mt-6"
                >
                    {saving ? <Spinner size={16} /> : mediaUploading ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                    {saving ? "Menyimpan..." : mediaUploading ? "Mengupload media..." : "Simpan Soal"}
                </button>
            </motion.div>
        </div>
    )

    return (
        <div className={embedded ? "w-full min-w-0 pb-8" : "flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10"}>
            {!loading && (
            <div className={embedded ? "" : "w-full xl:max-w-7xl lg:max-w-5xl"}>
                {!embedded && (
                    <>
                        <BackButton to="/creator" />

                        <FormTabs id={id} active="questions" />
                    </>
                )}

                <div className={`flex justify-between px-3 gap-2 my-auto ${embedded ? "mb-3" : "mb-4"}`}>
                    <h1 className="text text-darks text-4xl font-default font-bold">Soal</h1>
                    {!showEditor && (
                        <CreateButton onCreate={startAdd} onImport={() => setShowImport(true)} onDownload={downloadTemplate} />
                    )}
                </div>

                {questions.length === 0 && !showEditor ? (
                    <div className="text-center py-16">
                        <p className="text-tinted mb-4">Belum ada soal.</p>
                    </div>
                ) : previewQuestions.length > 0 && (
                    <div className="space-y-3 pb-8">
                        {previewQuestions.map((q, idx) => {
                            const isDragging = dragId === q.id
                            return (
                            <AnimatePresence key={q.id} initial={false}>
                            <motion.div
                                // Kartu pengganti hanya meluncur (posisi saja, ukuran tetap);
                                // kartu yang di-drag snap langsung agar tidak "menumpuk" dengan ghost.
                                layout={isDragging ? false : "position"}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{
                                    layout: { type: "spring", stiffness: 420, damping: 40 },
                                    opacity: { duration: 0.25, ease: easeOutExpo, delay: dragId ? 0 : Math.min(idx * 0.05, 0.3) },
                                    y: { duration: 0.3, ease: easeOutExpo, delay: dragId ? 0 : Math.min(idx * 0.05, 0.3) },
                                }}
                            >
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, q.id)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                className={
                                    isDragging
                                        ? "bg-done/5 border border-done/60 border-dashed p-5 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
                                        : `bg-white border border-second p-5 shadow-sm rounded-xl cursor-grab active:cursor-grabbing transition-colors ${
                                            dragId ? "opacity-60" : "hover:bg-base-200"
                                        }`
                                }
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex gap-3 min-w-0">
                                        <GripVertical className="h-5 w-5 text-tinted shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                            <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(q.question_type)}</span>
                                            {q.is_required && <span className="badge badge-ghost text-wrong border-wrong/30 rounded-full text-xs">Wajib</span>}
                                            {Number(q.score_value) > 0 && <span className="badge badge-ghost text-tinted rounded-full text-xs">{q.score_value} poin</span>}
                                        </div>
                                        <div className="text-sm text-darks"><RichText html={q.question_text} /></div>
                                        {q.image_question && (
                                            <img src={q.image_question} alt="Soal" className="max-h-40 object-contain mt-2 border border-second rounded-lg" />
                                        )}
                                        {q.media_url && (
                                            <div className="mt-2">
                                                <QuestionMedia url={q.media_url} className="mt-2 border border-second rounded-lg" />
                                            </div>
                                        )}
                                        {TYPES_WITH_OPTIONS.includes(q.question_type) && q.question_options?.length > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                {q.question_options.map((o) => (
                                                    <div key={o.id} className="flex items-center gap-2 text-sm text-tinted">
                                                        <span
                                                            className={`inline-block w-2 h-2 rounded-full ${
                                                                o.is_correct ? "bg-done" : "bg-tinted/40"
                                                            }`}
                                                        />
                                                        {o.media_url && (
                                                            <span className="shrink-0">
                                                                <QuestionMedia url={o.media_url} maxHeight="max-h-14" className="rounded-md border border-second" />
                                                            </span>
                                                        )}
                                                        <RichText as="span" html={o.option_text} />
                                                        {o.is_correct && <span className="text-xs text-done font-medium">(kunci)</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.question_type === "date_time" && (
                                            <p className="mt-3 text-xs text-tinted bg-base border border-second rounded-lg px-3 py-1.5 w-fit">
                                                Jawaban:{" "}
                                                {q.config?.dateTimeVariant === "date_only"
                                                    ? "Tanggal saja"
                                                    : q.config?.dateTimeVariant === "time_only"
                                                        ? "Jam saja"
                                                        : "Tanggal & Jam"}
                                            </p>
                                        )}
                                        {q.question_type === "file_upload" && (
                                            <p className="mt-3 text-xs text-tinted bg-base border border-second rounded-lg px-3 py-1.5 w-fit">
                                                Jawaban berupa unggahan file (maks {FILE_UPLOAD_DEFAULTS.maxMB} MB)
                                            </p>
                                        )}
                                    </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => startEdit(q)} className="btn btn-sm btn-ghost text-darks">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(q)} className="btn btn-sm btn-ghost text-wrong">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                             </div>
                             </motion.div>
                         </AnimatePresence>
                            )
                        })}
                        </div>
                )}
                <AnimatePresence>
                {showImport && id && (
                    <QuestionImportModal
                        formId={id}
                        startingOrder={questions.length}
                        onClose={() => setShowImport(false)}
                        onImported={(summary) => {
                            setShowImport(false)
                            showAlert(summary, "success")
                            loadAll()
                        }}
                    />
                )}
                </AnimatePresence>
                <AnimatePresence>
                {showEditor && renderEditor()}
                </AnimatePresence>
            </div>
            )}
        </div>
    )
}

export default Questions