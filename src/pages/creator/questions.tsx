import { useEffect, useState, useCallback, useMemo, useRef, type DragEvent } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Plus, Pencil, Trash2, Save, X, Check, GripVertical, ImageIcon, CheckCircle, ListChecks, LayoutList } from "lucide-react"
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
import { deleteStoredMedia } from "../../lib/mediaStorage"
import { collectQuestionMediaUrls } from "../../lib/mediaCleanup"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo } from "../../lib/motion"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import { Spinner } from "../../components/loading"
import {
    fetchPagesWithQuestions,
    createPage,
    renamePage,
    deletePage,
    moveQuestionToPage,
    reorderQuestions,
    isQuizMode,
    isStandardMode,
    defaultPageTitle,
    type FormPage,
} from "../../lib/formPages"

const TYPES_WITH_OPTIONS = ["single_choice", "multiple_choice", "dropdown"]
const TYPES_NO_OPTIONS = ["text", "file_upload", "date_time"] as const

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
    targetPageId: string | null
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
    page_id?: string | null
}

interface PageWithQuestions extends FormPage {
    questions: Question[]
}

interface FormCacheData {
    formTitle: string
    layoutMode: string | null
    pages: PageWithQuestions[]
}

// Opsi penghapusan section: soal dipindah ke section lain, atau ikut dihapus.
type DeleteSectionChoice =
    | { page: PageWithQuestions; mode: "move" | "delete"; moveToId: string | null; deleting: boolean }
    | null

function Questions({ embedded = false }: { embedded?: boolean }) {
    const { id } = useParams()
    const { user } = useAuth()

    // Cache daftar soal per form supaya kembali ke halaman ini cukup fade-in
    // tanpa overlay loading lagi; data tetap di-refresh diam-diam.
    const [cached] = useState<FormCacheData | undefined>(() =>
        user && id ? pageGet<FormCacheData>(`questions:${user.id}:${id}`) : undefined
    )
    const [pages, setPages] = useState<PageWithQuestions[]>(cached?.pages ?? [])
    const [formLayout, setFormLayout] = useState<string | null>(cached?.layoutMode ?? null)
    const [loading, setLoading] = useState(!cached)

    // Section yang sedang aktif (mode standard) — soal baru dimasukkan ke sini.
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

    // Restore draft editor yang belum tersimpan (mis. media sudah di-upload tapi
    // soal belum di-save lalu pindah tab/keluar halaman).
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
    const [targetPageId, setTargetPageId] = useState<string | null>(savedDraft?.targetPageId ?? null)
    const [optionMediaOpen, setOptionMediaOpen] = useState<Record<number, boolean>>({})
    const [saving, setSaving] = useState(false)
    const [mediaUploading, setMediaUploading] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [dragId, setDragId] = useState<string | null>(null)
    const [orderIds, setOrderIds] = useState<string[] | null>(null)
    // Drag dalam satu section (mode standard)
    const [sectionDrag, setSectionDrag] = useState<{ dragId: string; pageId: string } | null>(null)
    const [sectionOrder, setSectionOrder] = useState<string[] | null>(null)
    // Modal hapus section
    const [deleteSectionChoice, setDeleteSectionChoice] = useState<DeleteSectionChoice>(null)

    const isStandard = isStandardMode(formLayout)

    // Pantau state editor terbaru lewat ref agar snapshot saat unmount akurat.
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
            targetPageId,
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
                targetPageId,
            },
        }
    })

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
        let newLayout: string | null = null
        let newPages: PageWithQuestions[] = []

        const { data: form } = await supabase
            .from("forms")
            .select("title, layout_mode")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()
        if (form) {
            newTitle = form.title
            newLayout = (form as { layout_mode?: string }).layout_mode ?? null
        }

        const pagesWithQuestions = await fetchPagesWithQuestions(id)
        newPages = pagesWithQuestions.map((p) => ({
            ...p,
            questions: p.questions.map((q) => {
                const { html, config } = extractQuestionConfig(q.question_text)
                return { ...q, question_text: html, config }
            }),
        }))

        setFormLayout(newLayout)
        setPages(newPages)
        setActiveSectionId((prev) => {
            if (prev && newPages.some((p) => p.id === prev)) return prev
            return newPages[0]?.id ?? null
        })

        if (user && id) {
            pageSet<FormCacheData>(`questions:${user.id}:${id}`, {
                formTitle: newTitle,
                layoutMode: newLayout,
                pages: newPages,
            })
        }
        setLoading(false)
    }, [user, id, cached])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    // Daftar soal flat (mode quiz) = gabungan urutan section 1:1.
    const questions = useMemo(() => pages.flatMap((p) => p.questions), [pages])

    const resetEditor = () => {
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
        setTargetPageId(null)
        setOptionMediaOpen({})
        setShowEditor(false)
        const key = questionDraftKey(user?.id, id)
        if (key) pageSet(key, undefined)
    }

    // Section tujuan untuk soal baru. Di mode quiz dibuat halaman baru saat
    // disimpan; di mode standard pakai section aktif (atau buat section pertama).
    const startAdd = (sectionId?: string) => {
        resetEditor()
        setOrderIndex(questions.length)
        if (isStandard && sectionId) setTargetPageId(sectionId)
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
        setTargetPageId(q.page_id ?? null)
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
        if (opt?.media_url) {
            deleteStoredMedia([opt.media_url])
        }
        if (opt?.id) setRemovedOptionIds([...removedOptionIds, opt.id])
        setOptions(options.filter((_, i) => i !== index))
        setOptionMediaOpen((prev) => {
            const next = { ...prev }
            delete next[index]
            return next
        })
    }

    const handleTypeChange = (t: string) => {
        setQuestionType(t)
        if ((TYPES_NO_OPTIONS as readonly string[]).includes(t)) {
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

        const finalQuestionText = embedQuestionConfig(
            questionText,
            questionType === "date_time" ? { dateTimeVariant } : null,
        )

        // Untuk mode quiz, soal baru otomatis dibuatkan halaman baru sendiri.
        let newPageId: string | null = null
        if (!editingId && isQuizMode(formLayout)) {
            const pos = pages.length
            newPageId = await createPage(id, defaultPageTitle(pos, formLayout), pos)
            if (!newPageId) {
                setSaving(false)
                showAlert("Gagal membuat halaman baru untuk soal.", "error")
                return
            }
        }

        const { error: rpcErr } = await supabase.rpc("save_question_with_options", {
            p_question_id: editingId || null,
            p_form_id: id,
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
            if (rpcErr.message.includes("violates foreign key constraint")) {
                showAlert("Opsi jawaban ini tidak bisa dihapus karena sudah pernah dipilih oleh siswa yang mengerjakan.", "error")
            } else {
                showAlert("Gagal menyimpan soal: " + rpcErr.message, "error")
            }
            return
        }

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

        // Persist media_url + page_id + order_index untuk soal target.
        if (mediaTargetId) {
            const pageIdForQuestion = editingId ? targetPageId : (
                isStandard
                    ? (targetPageId ?? activeSectionId ?? null)
                    : newPageId
            )
            const { error: mediaErr } = await supabase.rpc("set_question_media", {
                p_question_id: mediaTargetId,
                p_media_url: mediaUrl,
            })
            if (mediaErr && !/does not exist|not found|PGRST202/i.test(mediaErr.message)) {
                showAlert("Gagal menyimpan media soal: " + mediaErr.message, "error")
            }

            if (pageIdForQuestion) {
                await supabase
                    .from("questions")
                    .update({ page_id: pageIdForQuestion, order_index: editingId ? orderIndex : orderIndex })
                    .eq("id", mediaTargetId)
            } else if (editingId) {
                const { error: orderErr } = await supabase
                    .from("questions")
                    .update({ order_index: orderIndex })
                    .eq("id", editingId)
                if (orderErr) {
                    showAlert("Gagal menyimpan urutan soal: " + orderErr.message, "error")
                }
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
                const urls = await collectQuestionMediaUrls(q.id)
                const { error } = await supabase.rpc("delete_question", { p_question_id: q.id })
                if (error) {
                    if (/does not exist|not found|PGRST202/i.test(error.message)) {
                        const { error: optionError } = await supabase.from("question_options").delete().eq("question_id", q.id)
                        if (optionError) throw new Error(optionError.message)
                        const { error: questionError } = await supabase.from("questions").delete().eq("id", q.id)
                        if (questionError) throw new Error(questionError.message)
                    } else {
                        throw new Error(error.message)
                    }
                }
                await deleteStoredMedia(urls)
                await loadAll()
            },
        })
    }

    // ---- DRAG & DROP MODE QUIZ (1 soal per halaman, urutan flat global) ----

    const persistQuizOrder = async (orderedIds: string[]) => {
        const pageByQid = new Map<string, FormPage>()
        for (const p of pages) {
            for (const q of p.questions) pageByQid.set(q.id, p)
        }
        // Susun ulang posisi halaman mengikuti urutan soal flat.
        let failed = false
        for (let i = 0; i < orderedIds.length; i++) {
            const page = pageByQid.get(orderedIds[i])
            if (page && page.position !== i) {
                const { error } = await supabase.from("form_pages").update({ position: i }).eq("id", page.id)
                if (error) failed = true
            }
            const q = pages.flatMap((p) => p.questions).find((qq) => qq.id === orderedIds[i])
            if (q && q.order_index !== i) {
                const { error } = await supabase.from("questions").update({ order_index: i }).eq("id", orderedIds[i])
                if (error) failed = true
            }
        }
        if (failed) showAlert("Sebagian urutan soal gagal disimpan ke database.", "error")
    }

    const handleDragStart = (e: DragEvent, question: Question) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", question.id)
        setDragId(question.id)
        setOrderIds(questions.map((q) => q.id))

        const srcIdx = questions.findIndex((q) => q.id === question.id)
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

    const handleDragOver = (e: DragEvent, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!dragId || !orderIds) return
        const flat = questions
        const from = orderIds.indexOf(dragId)
        if (from === -1 || from === index) return

        const rect = e.currentTarget.getBoundingClientRect()
        const pastMid = e.clientY > rect.top + rect.height / 2
        const target = from < index ? (pastMid ? index : index - 1) : pastMid ? index + 1 : index
        if (target < 0 || target >= flat.length) return

        setOrderIds((prev) => {
            if (!prev || prev[target] === undefined) return prev
            const curFrom = prev.indexOf(dragId)
            if (curFrom === -1 || curFrom === target) return prev
            const next = [...prev]
            next.splice(curFrom, 1)
            next.splice(target, 0, dragId)
            return next
        })
    }

    const finishDrag = () => {
        if (dragId && orderIds) {
            const prevIds = questions.map((q) => q.id)
            if (prevIds.some((sid, i) => sid !== orderIds[i])) {
                const byId = new Map(questions.map((q) => [q.id, q]))
                const next = orderIds.map((qid) => byId.get(qid)).filter((q): q is Question => Boolean(q))
                // Reorder pages state menyesuaikan urutan soal flat
                const pageByQid = new Map<string, PageWithQuestions>()
                for (const p of pages) for (const q of p.questions) pageByQid.set(q.id, p)
                const nextPages = next.map((q) => pageByQid.get(q.id)).filter((p): p is PageWithQuestions => Boolean(p))
                setPages((cur) => {
                    const curById = new Map(cur.map((p) => [p.id, p]))
                    return nextPages.map((p) => ({ ...p, ...curById.get(p.id) }))
                })
                persistQuizOrder(next.map((q) => q.id))
            }
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

    // ---- DRAG & DROP MODE STANDARD (dalam satu section) ----

    const sectionQuestions = (pageId: string) => {
        return pages.find((p) => p.id === pageId)?.questions ?? []
    }

    const handleSectionDragStart = (e: DragEvent, pageId: string, q: Question) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", q.id)
        setSectionDrag({ dragId: q.id, pageId })
        setSectionOrder(sectionQuestions(pageId).map((x) => x.id))

        const ghost = document.createElement("div")
        ghost.textContent = `Soal ${q.id.slice(0, 4)}`
        ghost.style.cssText =
            "position:fixed;top:-200px;left:-200px;padding:7px 16px;border-radius:9999px;" +
            "background:#393E46;color:#F7F7F7;font-size:13px;font-weight:600;line-height:1;" +
            "font-family:'Funnel Display','DM Sans',ui-sans-serif,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.3);"
        document.body.appendChild(ghost)
        e.dataTransfer.setDragImage(ghost, 20, 20)
        window.setTimeout(() => ghost.remove(), 0)
    }

    const handleSectionDragOver = (e: DragEvent, pageId: string, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!sectionDrag || sectionDrag.pageId !== pageId || !sectionOrder) return
        const from = sectionOrder.indexOf(sectionDrag.dragId)
        if (from === -1 || from === index) return

        const rect = e.currentTarget.getBoundingClientRect()
        const pastMid = e.clientY > rect.top + rect.height / 2
        const target = from < index ? (pastMid ? index : index - 1) : pastMid ? index + 1 : index
        const current = sectionQuestions(pageId)
        if (target < 0 || target >= current.length) return

        setSectionOrder((prev) => {
            if (!prev || prev[target] === undefined) return prev
            const curFrom = prev.indexOf(sectionDrag.dragId)
            if (curFrom === -1 || curFrom === target) return prev
            const next = [...prev]
            next.splice(curFrom, 1)
            next.splice(target, 0, sectionDrag.dragId)
            return next
        })
    }

    const finishSectionDrag = (pageId: string) => {
        if (sectionDrag && sectionDrag.pageId === pageId && sectionOrder) {
            const current = sectionQuestions(pageId)
            const prevIds = current.map((q) => q.id)
            if (prevIds.some((sid, i) => sid !== sectionOrder[i])) {
                setPages((cur) =>
                    cur.map((p) => {
                        if (p.id !== pageId) return p
                        const byId = new Map(p.questions.map((q) => [q.id, q]))
                        const nextQ = sectionOrder.map((qid) => byId.get(qid)).filter((q): q is Question => Boolean(q))
                        return { ...p, questions: nextQ }
                    })
                )
                reorderQuestions(sectionOrder)
            }
        }
        setSectionDrag(null)
        setSectionOrder(null)
    }

    const handleSectionDrop = (e: DragEvent, pageId: string) => {
        e.preventDefault()
        finishSectionDrag(pageId)
    }

    // ---- OPERASI SECTION ----

    const handleAddSection = async () => {
        if (!id) return
        const pos = pages.length
        const newId = await createPage(id, defaultPageTitle(pos, formLayout), pos)
        if (newId) {
            setActiveSectionId(newId)
            loadAll()
        } else {
            showAlert("Gagal membuat section.", "error")
        }
    }

    const handleRenameSection = async (pageId: string, title: string) => {
        const trimmed = title.trim()
        if (!trimmed) return
        await renamePage(pageId, trimmed)
        loadAll()
    }

    // Pindahkan satu soal ke section lain (mode standard).
    const handleMoveQuestion = async (q: Question, fromPageId: string, toPageId: string) => {
        if (toPageId === fromPageId) return
        const target = sectionQuestions(toPageId)
        const ok = await moveQuestionToPage(q.id, toPageId, target.length)
        if (ok) {
            // Reindex sumber + muat ulang.
            const source = sectionQuestions(fromPageId).filter((x) => x.id !== q.id)
            await reorderQuestions(source.map((x) => x.id))
            loadAll()
        } else {
            showAlert("Gagal memindahkan soal ke section lain.", "error")
        }
    }

    const handleDeleteSection = async () => {
        const choice = deleteSectionChoice
        if (!choice || choice.deleting || !id) return

        // Pemindahan soal ke section lain membutuhkan target terpilih.
        if (choice.mode === "move" && choice.page.questions.length > 0 && !choice.moveToId) {
            showAlert("Pilih section tujuan untuk memindahkan soal.", "warning")
            return
        }

        const newChoice: DeleteSectionChoice = { ...choice, deleting: true }
        setDeleteSectionChoice(newChoice)

        try {
            if (choice.mode === "move") {
                const target = sectionQuestions(choice.moveToId!)
                let idx = target.length
                for (const q of choice.page.questions) {
                    await moveQuestionToPage(q.id, choice.moveToId!, idx++)
                }
            } else {
                // Hapus soal di section ini beserta media-nya.
                for (const q of choice.page.questions) {
                    const urls = await collectQuestionMediaUrls(q.id)
                    const { error } = await supabase.rpc("delete_question", { p_question_id: q.id })
                    if (error) {
                        if (/does not exist|not found|PGRST202/i.test(error.message)) {
                            await supabase.from("question_options").delete().eq("question_id", q.id)
                            await supabase.from("questions").delete().eq("id", q.id)
                        } else {
                            throw new Error(error.message)
                        }
                    }
                    await deleteStoredMedia(urls)
                }
            }
            await deletePage(choice.page.id)
            setDeleteSectionChoice(null)
            await loadAll()
            showAlert(choice.mode === "move" ? "Section dihapus, soal dipindahkan." : "Section beserta soal dihapus.", "success")
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal menghapus section.", "error")
            setDeleteSectionChoice({ ...choice, deleting: false })
        }
    }

    const typeLabel = (t: string) => {
        if (t === "multiple_choice") return "Checkbox"
        if (t === "text") return "Isian"
        if (t === "dropdown") return "Dropdown"
        if (t === "file_upload") return "Upload File"
        if (t === "date_time") return "Tanggal & Jam"
        return "Pilihan Ganda"
    }

    const renderEditor = () => (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
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

                {/* Pilihan section tujuan untuk soal baru di mode standard */}
                {!editingId && isStandard && pages.length > 0 && (
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Masukkan ke Section</label>
                        <select
                            className="select w-full bg-white border-second focus:border-done focus:outline-none rounded-xl"
                            value={targetPageId ?? activeSectionId ?? pages[0].id}
                            onChange={(e) => setTargetPageId(e.target.value)}
                        >
                            {pages.map((p) => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-6">
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

    // Kartu soal tunggal — dipakai mode quiz (flat) dan mode standard (dalam section).
    const renderQuestionCard = (q: Question, idx: number, opts?: { pageId?: string; layout?: boolean }) => {
        const isDragging = sectionDrag?.dragId === q.id || dragId === q.id
        const pageId = opts?.pageId
        // Dalam mode quiz: index global. Mode standard: index lokal.
        const labelIdx = idx
        return (
            <div
                draggable
                onDragStart={(e) => {
                    if (pageId) {
                        handleSectionDragStart(e, pageId, q)
                    } else {
                        handleDragStart(e, q)
                    }
                }}
                onDragOver={(e) => {
                    if (pageId) {
                        handleSectionDragOver(e, pageId, idx)
                    } else {
                        handleDragOver(e, idx)
                    }
                }}
                onDrop={(e) => {
                    if (pageId) {
                        handleSectionDrop(e, pageId)
                    } else {
                        handleDrop(e)
                    }
                }}
                onDragEnd={() => {
                    if (pageId) {
                        finishSectionDrag(pageId)
                    } else {
                        handleDragEnd()
                    }
                }}
                className={
                    isDragging
                        ? "bg-done/5 border border-done/60 border-dashed p-5 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
                        : `border border-second p-5 shadow-sm rounded-xl cursor-grab active:cursor-grabbing transition-colors ${
                            (dragId || sectionDrag) ? "opacity-60" : "hover:bg-base-200"
                        }`
                }
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-3 min-w-0">
                        <GripVertical className="h-5 w-5 text-tinted shrink-0 mt-0.5" />
                        <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-darks">Soal {labelIdx + 1}</span>
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
                    <div className="flex gap-1 shrink-0 flex-col sm:flex-row sm:items-center">
                        {isStandard && opts?.pageId && (
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) handleMoveQuestion(q, opts.pageId!, e.target.value)
                                }}
                                className="select select-xs select-bordered bg-white border-second text-tinted h-8 min-h-0 max-w-[8.5rem] w-full"
                                title="Pindah ke section lain"
                            >
                                <option value="">Pindah ke...</option>
                                {pages.filter((p) => p.id !== opts.pageId).map((p) => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={() => startEdit(q)} className="btn btn-sm btn-ghost text-darks">
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(q)} className="btn btn-sm btn-ghost text-wrong">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Header + daftar soal dalam satu section (mode standard).
    const renderSectionCard = (page: PageWithQuestions, sectionIdx: number) => {
        const isActive = activeSectionId === page.id
        return (
            <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: easeOutExpo, delay: Math.min(sectionIdx * 0.05, 0.3) }}
                className={`bg-white border border-second shadow-sm rounded-xl overflow-hidden ${
                    isActive ? "ring-1 ring-done/30" : ""
                }`}
            >
                <div
                    className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-second/70 bg-base/40"
                    onClick={() => setActiveSectionId(page.id)}
                >
                    <div className="flex gap-2.5 items-center min-w-0">
                        <LayoutList className="h-4 w-4 text-done shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <input
                                defaultValue={page.title}
                                key={page.title}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleRenameSection(page.id, e.currentTarget.value)
                                        ;(e.currentTarget as HTMLInputElement).blur()
                                    }
                                }}
                                onBlur={(e) => handleRenameSection(page.id, e.currentTarget.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border border-transparent hover:border-second focus:border-done focus:bg-white rounded-md px-1.5 py-0.5 text-sm font-semibold text-darks w-40 sm:w-64 focus:outline-none transition-colors"
                                title="Klik untuk ganti nama section"
                            />
                            <p className="text-xs text-tinted mt-0.5">
                                {page.questions.length} soal
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                startAdd(page.id)
                            }}
                            className="btn btn-sm btn-ghost text-done"
                            title="Tambah soal di section ini"
                        >
                            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Soal</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setDeleteSectionChoice({ page, mode: "delete", moveToId: null, deleting: false })
                            }}
                            className="btn btn-sm btn-ghost text-wrong"
                            title="Hapus section"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-3 sm:p-4">
                    {page.questions.length === 0 ? (
                        <div className="text-center py-6 text-sm text-tinted border border-dashed border-second/70 rounded-lg">
                            Section ini kosong. Klik <span className="text-done font-medium">+ Soal</span> untuk menambahkan.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {page.questions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    onDragOver={(e) => {
                                        if (!sectionDrag || sectionDrag.pageId !== page.id) return
                                        e.preventDefault()
                                        e.dataTransfer.dropEffect = "move"
                                    }}
                                >
                                    {renderQuestionCard(q, idx, { pageId: page.id })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        )
    }

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
                        <div className="flex items-center gap-2">
                            {isStandard && (
                                <button
                                    onClick={handleAddSection}
                                    className="btn bg-base border border-second text-darks rounded-full h-9 min-h-0"
                                    title="Tambah section baru"
                                >
                                    <LayoutList className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Bagian</span>
                                    <span className="sm:hidden">Bagian</span>
                                </button>
                            )}
                            <CreateButton
                                onCreate={() => startAdd(isStandard ? (activeSectionId ?? undefined) : undefined)}
                                onImport={() => setShowImport(true)}
                                onDownload={downloadTemplate}
                            />
                        </div>
                    )}
                </div>

                {isStandard ? (
                    <>
                        {/* Navigasi antar section */}
                        {pages.length > 0 && (
                            <div className="flex gap-2 px-3 mb-4 overflow-x-auto pb-1">
                                {pages.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setActiveSectionId(p.id)
                                            document.getElementById(`section-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                                        }}
                                        className={`btn btn-sm rounded-full shrink-0 ${
                                            activeSectionId === p.id
                                                ? "bg-darks text-base border-none"
                                                : "bg-white text-darks border border-second"
                                        }`}
                                    >
                                        {p.title}
                                    </button>
                                ))}
                            </div>
                        )}

                        {pages.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-tinted mb-4">Belum ada section. Buat bagian pertama untuk mulai menambah soal.</p>
                                <button onClick={handleAddSection} className="btn bg-darks text-base border-none rounded-full">
                                    <LayoutList className="h-4 w-4" /> Tambah Bagian
                                </button>
                            </div>
                        ) : (
                            <div id="section-list" className="space-y-5 pb-8">
                                {pages.map((p, i) => (
                                    <div key={p.id} id={`section-${p.id}`} className="scroll-mt-24">
                                        {renderSectionCard(p, i)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : questions.length === 0 && !showEditor ? (
                    <div className="text-center py-16">
                        <p className="text-tinted mb-4">Belum ada soal.</p>
                    </div>
                ) : previewQuestions.length > 0 && (
                    <div className="space-y-3 pb-8">
                        {previewQuestions.map((q, idx) => (
                            <AnimatePresence key={q.id} initial={false}>
                            <motion.div
                                layout={dragId === q.id ? false : "position"}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{
                                    layout: { type: "spring", stiffness: 420, damping: 40 },
                                    opacity: { duration: 0.25, ease: easeOutExpo, delay: dragId ? 0 : Math.min(idx * 0.05, 0.3) },
                                    y: { duration: 0.3, ease: easeOutExpo, delay: dragId ? 0 : Math.min(idx * 0.05, 0.3) },
                                }}
                            >
                                <div className={dragId === q.id ? "bg-done/5 border border-done/60 border-dashed rounded-xl" : "bg-white border border-second rounded-xl"}>
                                    {renderQuestionCard(q, idx)}
                                </div>
                            </motion.div>
                            </AnimatePresence>
                        ))}
                    </div>
                )}
                <AnimatePresence>
                {showImport && id && (
                    <QuestionImportModal
                        formId={id}
                        startingOrder={questions.length}
                        fallbackPageId={isStandard ? (activeSectionId ?? undefined) : undefined}
                        oneQuestionPerPage={isQuizMode(formLayout)}
                        onClose={() => setShowImport(false)}
                        onImported={(summary) => {
                            setShowImport(false)
                            showAlert(summary, "success")
                            loadAll()
                        }}
                    />
                )}
                </AnimatePresence>

                {/* Modal Hapus Section */}
                <AnimatePresence>
                {deleteSectionChoice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6">
                        <motion.div
                            className="absolute inset-0 bg-darks/60"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deleteSectionChoice.deleting && setDeleteSectionChoice(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: easeOutExpo }}
                            className="relative w-full sm:max-w-md bg-white border border-second shadow-2xl rounded-2xl p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="font-semibold text-darks text-lg">Hapus Section</h2>
                            <p className="text-sm text-tinted mt-1">
                                "{deleteSectionChoice.page.title}" berisi {deleteSectionChoice.page.questions.length} soal. Pilih cara menghapus:
                            </p>

                            <div className="mt-4 space-y-2">
                                {deleteSectionChoice.page.questions.length > 0 && (
                                    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${deleteSectionChoice.mode === "move" ? "border-done bg-done/5" : "border-second hover:border-done/40"}`}>
                                        <input
                                            type="radio"
                                            name="deleteSectionChoice"
                                            className="radio radio-sm mt-0.5"
                                            checked={deleteSectionChoice.mode === "move"}
                                            onChange={() => setDeleteSectionChoice((prev) => prev ? { ...prev, mode: "move" } : prev)}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-darks">Pindahkan soal ke section lain</p>
                                            <select
                                                className="select select-sm select-bordered w-full mt-1.5 bg-white border-second"
                                                value={deleteSectionChoice.moveToId ?? ""}
                                                disabled={deleteSectionChoice.mode !== "move"}
                                                onChange={(e) => setDeleteSectionChoice((prev) => prev ? { ...prev, moveToId: e.target.value || null } : prev)}
                                            >
                                                <option value="">Pilih section tujuan...</option>
                                                {pages.filter((p) => p.id !== deleteSectionChoice.page.id).map((p) => (
                                                    <option key={p.id} value={p.id}>{p.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </label>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDeleteSectionChoice((prev) => prev ? { ...prev, mode: "delete", moveToId: null } : prev)}
                                    className={`flex items-center gap-3 rounded-xl border p-3 w-full text-left transition-colors ${deleteSectionChoice.mode === "delete" ? "border-done bg-done/5" : "border-second hover:border-done/40"}`}
                                >
                                    <input
                                        type="radio"
                                        name="deleteSectionChoice"
                                        className="radio radio-sm"
                                        checked={deleteSectionChoice.mode === "delete"}
                                        onChange={() => setDeleteSectionChoice((prev) => prev ? { ...prev, mode: "delete", moveToId: null } : prev)}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-darks">Hapus soal ikut terhapus</p>
                                        <p className="text-xs text-tinted">Section dan {deleteSectionChoice.page.questions.length} soal di dalamnya akan dihapus permanen.</p>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-5 flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteSectionChoice(null)}
                                    disabled={deleteSectionChoice.deleting}
                                    className="btn rounded-xl border border-second bg-base text-darks hover:bg-second disabled:opacity-60"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDeleteSection}
                                    disabled={deleteSectionChoice.deleting}
                                    className="btn rounded-xl border border-wrong bg-wrong text-base hover:bg-wrong/90 disabled:opacity-60"
                                >
                                    {deleteSectionChoice.deleting ? <Spinner size={16} /> : <Trash2 className="h-4 w-4" />}
                                    Hapus Section
                                </button>
                            </div>
                        </motion.div>
                    </div>
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