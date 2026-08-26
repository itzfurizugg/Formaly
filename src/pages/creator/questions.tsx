import { useEffect, useState, useCallback, useMemo, type DragEvent } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Plus, Pencil, Trash2, Save, X, Loader2, Check, GripVertical } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import QuestionImportModal from "../../components/creator/QuestionImportModal"
import CreateButton from "../../components/creator/createButton"
import ImageUrlInput from "../../components/creator/imageUrlInput"
import { isValidImageUrl } from "../../lib/imageUrl"
import RichTextEditor, { RichText } from "../../components/richText"
import { richTextToPlain } from "../../lib/richtext"
import { alertSaveSuccess, confirmDelete, showAlert } from "../../lib/alerts"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo, panelSlide } from "../../lib/motion"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import Loading from "../../components/loading"

interface Option {
    id: string | null
    option_text: string
    is_correct: boolean
}

interface Question {
    id: string
    question_text: string
    question_type: string
    score_value: number
    order_index: number
    image_question: string | null
    is_required: boolean
    question_options: Option[]
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

    const [showEditor, setShowEditor] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [questionText, setQuestionText] = useState("")
    const [questionType, setQuestionType] = useState("single_choice")
    const [scoreValue, setScoreValue] = useState(0)
    const [orderIndex, setOrderIndex] = useState(0)
    const [imageQuestion, setImageQuestion] = useState("")
    const [isRequired, setIsRequired] = useState(false)
    const [options, setOptions] = useState<Option[]>([])
    const [removedOptionIds, setRemovedOptionIds] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [dragId, setDragId] = useState<string | null>(null)
    const [orderIds, setOrderIds] = useState<string[] | null>(null)

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
                id, question_text, question_type, score_value, order_index, image_question, is_required,
                question_options ( id, option_text, is_correct, order_index )
            `)
            .eq("form_id", id)
            .order("order_index", { ascending: true })
        if (qs) {
            setQuestions(qs as unknown as Question[])
            newQuestions = qs as unknown as Question[]
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
        setEditingId(null)
        setQuestionText("")
        setQuestionType("single_choice")
        setScoreValue(0)
        setOrderIndex(questions.length)
        setImageQuestion("")
        setIsRequired(false)
        setOptions([])
        setRemovedOptionIds([])
        setShowEditor(false)
    }

    const startAdd = () => {
        resetEditor()
        setOrderIndex(questions.length)
        setShowEditor(true)
    }

    const startEdit = (q: Question) => {
        resetEditor()
        setEditingId(q.id)
        setQuestionText(q.question_text)
        setQuestionType(q.question_type)
        setScoreValue(Number(q.score_value) || 0)
        setOrderIndex(q.order_index || 0)
        setImageQuestion(q.image_question || "")
        setIsRequired(!!q.is_required)
        setOptions((q.question_options || []).map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })))
        setShowEditor(true)
    }

    const addOption = () => {
        setOptions([...options, { id: null, option_text: "", is_correct: false }])
    }

    const updateOption = (index: number, patch: Partial<Option>) => {
        setOptions(options.map((o, i) => (i === index ? { ...o, ...patch } : o)))
    }

    const removeOption = (index: number) => {
        const opt = options[index]
        if (opt?.id) setRemovedOptionIds([...removedOptionIds, opt.id])
        setOptions(options.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!id) return
        if (!richTextToPlain(questionText).trim()) {
            showAlert("Soal tidak boleh kosong.", "error")
            return
        }
        if (questionType !== "text" && options.length === 0) {
            showAlert("Tambahkan minimal satu pilihan jawaban.", "error")
            return
        }
        if (imageQuestion.trim() && !isValidImageUrl(imageQuestion)) {
            showAlert("URL gambar harus diawali http:// atau https://.", "error")
            return
        }

        setSaving(true)

        // Panggil fungsi RPC yang sudah dibuat di database
        const { error: rpcErr } = await supabase.rpc("save_question_with_options", {
            p_question_id: editingId || null,
            p_form_id: id,
            p_question_text: questionText,
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
        return "Pilihan Tunggal"
    }

    const renderEditor = () => (
        <motion.div
            key="question-editor"
            variants={panelSlide}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-white border border-second p-3 sm:p-5 shadow-sm rounded-xl overflow-block space-y-4 mb-10"
        >
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-darks ml-2 sm:ml-1">{editingId ? "Edit Soal" : "Tambah Soal"}</h2>
                <button onClick={resetEditor} className="btn btn-sm btn-ghost text-tinted mr-2">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Soal</label>
                <RichTextEditor
                    value={questionText}
                    onChange={setQuestionText}
                    placeholder="Tulis soal di sini..."
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Tipe</label>
                    <select
                        className="select w-full bg-base border-second focus:border-done focus:outline-none rounded-xl"
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                    >
                        <option value="single_choice">Pilihan Tunggal</option>
                        <option value="multiple_choice">Pilihan Ganda</option>
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
                        className="input w-full bg-base border-second focus:border-done focus:outline-none"
                        value={scoreValue}
                        onChange={(e) => setScoreValue(Number(e.target.value))}
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-darks mb-1.5 ml-1">Urutan</label>
                    <input
                        type="number"
                        min={0}
                        className="input w-full bg-base border-second focus:border-done focus:outline-none"
                        value={orderIndex}
                        onChange={(e) => setOrderIndex(Number(e.target.value))}
                    />
                </div>
                <div>
                    <ImageUrlInput value={imageQuestion} onChange={setImageQuestion} />
                </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
                <button
                    type="button"
                    onClick={() => setIsRequired(!isRequired)}
                    title="Tandai sebagai wajib dijawab"
                    aria-label="Tandai sebagai wajib dijawab"
                    className={`shrink-0 rounded-full border p-1 transition-colors ${
                        isRequired
                            ? "bg-darks text-base border-darks"
                            : "bg-base text-tinted border-second hover:border-darks hover:text-darks"
                    }`}
                >
                    <Check className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-darks">
                    Wajib dijawab <span className="text-red-600 font-bold">*</span>
                </span>
            </div>

            {questionType !== "text" && (
                <div>
                    <div className="flex items-center justify-between mb-2 ml-2 mr-2">
                        <label className="text-sm font-medium text-darks">Pilihan Jawaban</label>
                        <button onClick={addOption} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                            <Plus className="h-3.5 w-3.5" /> Tambah Pilihan
                        </button>
                    </div>
                    <div className="space-y-2">
                        {options.map((opt, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <RichTextEditor
                                    compact
                                    className="flex-1"
                                    value={opt.option_text}
                                    onChange={(v) => updateOption(index, { option_text: v })}
                                    placeholder={`Pilihan ${index + 1}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !opt.is_correct
                                        if (questionType === "single_choice" && next) {
                                            setOptions(
                                                options.map((o, i) => (i === index ? { ...o, is_correct: true } : { ...o, is_correct: false }))
                                            )
                                        } else {
                                            updateOption(index, { is_correct: next })
                                        }
                                    }}
                                    title="Tandai jawaban benar"
                                    aria-label="Tandai jawaban benar"
                                    className={`shrink-0 rounded-full border p-1.5 transition-colors ${
                                        opt.is_correct
                                            ? "bg-darks text-base border-darks"
                                            : "bg-base text-tinted border-second hover:border-darks hover:text-darks"
                                    }`}
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => removeOption(index)} className="btn btn-sm btn-ghost text-wrong">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={saving}
                className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 mb-3 mt-2"
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Soal
            </button>
        </motion.div>
    )

    return (
        <div className={embedded ? "w-full min-w-0 pb-8" : "flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10"}>
            {/* Embedded (di dalam formEdit) pakai varian inline agar tidak menutupi halaman induk */}
            <Loading show={loading} inline={embedded} />
            {!loading && (
            <div className={embedded ? "" : "w-full xl:max-w-7xl lg:max-w-5xl"}>
                {!embedded && (
                    <>
                        <BackButton to="/creator" />

                        <FormTabs id={id} active="questions" />
                    </>
                )}

                <div className={`flex justify-end gap-2 ${embedded ? "mb-3" : "mb-4"}`}>
                    {!showEditor && (
                        <CreateButton onCreate={startAdd} onImport={() => setShowImport(true)} />
                    )}
                </div>

                <AnimatePresence>
                {showEditor && !editingId && renderEditor()}
                </AnimatePresence>

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
                            {showEditor && editingId === q.id ? renderEditor() : (
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
                                        {q.question_type !== "text" && q.question_options?.length > 0 && (
                                            <div className="mt-3 space-y-1.5">
                                                {q.question_options.map((o) => (
                                                    <div key={o.id} className="flex items-center gap-2 text-sm text-tinted">
                                                        <span
                                                            className={`inline-block w-2 h-2 rounded-full ${
                                                                o.is_correct ? "bg-done" : "bg-tinted/40"
                                                            }`}
                                                        />
                                                        <RichText as="span" html={o.option_text} />
                                                        {o.is_correct && <span className="text-xs text-done font-medium">(kunci)</span>}
                                                    </div>
                                                ))}
                                            </div>
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
                         )}
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
            </div>
            )}
        </div>
    )
}

export default Questions
