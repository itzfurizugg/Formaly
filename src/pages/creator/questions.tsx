import Loading from "../../components/loading"
import { useEffect, useState, useCallback, type DragEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Loader2, Check, Image as ImageIcon, FileUp, GripVertical } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import QuestionImportModal from "../../components/creator/QuestionImportModal"
import RichTextEditor, { RichText } from "../../components/richText"
import { richTextToPlain } from "../../lib/richtext"
import { alertSaveError, alertSaveSuccess, confirmDelete, showAlert } from "../../lib/alerts"

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
    question_options: Option[]
}

function Questions({ embedded = false }: { embedded?: boolean }) {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [formTitle, setFormTitle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)

    const [showEditor, setShowEditor] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [questionText, setQuestionText] = useState("")
    const [questionType, setQuestionType] = useState("single_choice")
    const [scoreValue, setScoreValue] = useState(0)
    const [orderIndex, setOrderIndex] = useState(0)
    const [imageQuestion, setImageQuestion] = useState("")
    const [options, setOptions] = useState<Option[]>([])
    const [removedOptionIds, setRemovedOptionIds] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [dragIndex, setDragIndex] = useState<number | null>(null)

    const loadAll = useCallback(async () => {
        if (!user || !id) return

        const { data: form } = await supabase
            .from("forms")
            .select("title")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()
        if (form) setFormTitle(form.title)

        const { data: qs } = await supabase
            .from("questions")
            .select(`
                id, question_text, question_type, score_value, order_index, image_question,
                question_options ( id, option_text, is_correct, order_index )
            `)
            .eq("form_id", id)
            .order("order_index", { ascending: true })
        if (qs) setQuestions(qs as unknown as Question[])

        setLoading(false)
    }, [user, id])

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

        setSaving(true)

        const { data: qData, error: qErr } = await supabase
            .from("questions")
            .upsert({
                id: editingId || undefined,
                form_id: id,
                question_text: questionText,
                question_type: questionType,
                score_value: scoreValue,
                order_index: orderIndex,
                image_question: imageQuestion || null,
            })
            .select("id")
            .single()

        if (qErr) {
            setSaving(false)
            alertSaveError(qErr.message)
            return
        }
        const questionId = qData.id

        for (let i = 0; i < options.length; i++) {
            const o = options[i]
            if (o.id) {
                await supabase.from("question_options").update({ option_text: o.option_text, is_correct: o.is_correct }).eq("id", o.id)
            } else {
                await supabase.from("question_options").insert({
                    question_id: questionId,
                    option_text: o.option_text,
                    is_correct: o.is_correct,
                    order_index: i,
                })
            }
        }
        for (const rid of removedOptionIds) {
            await supabase.from("question_options").delete().eq("id", rid)
        }

        setSaving(false)
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
        for (let i = 0; i < list.length; i++) {
            if (list[i].order_index !== i) {
                await supabase.from("questions").update({ order_index: i }).eq("id", list[i].id)
            }
        }
    }

    const handleDragStart = (e: DragEvent, index: number) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", String(index))
    }

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = (e: DragEvent, index: number) => {
        e.preventDefault()
        const from = dragIndex
        if (from === null || from === index) {
            setDragIndex(null)
            return
        }
        const next = [...questions]
        const [moved] = next.splice(from, 1)
        next.splice(index, 0, moved)
        setQuestions(next)
        setDragIndex(null)
        persistOrder(next)
    }

    const handleDragEnd = () => {
        setDragIndex(null)
    }

    const typeLabel = (t: string) => {
        if (t === "multiple_choice") return "Pilihan Ganda"
        if (t === "text") return "Isian"
        return "Pilihan Tunggal"
    }

    if (loading) {
        return <Loading />
    }

    return (
        <div className={embedded ? "w-full min-w-0 pb-8" : "flex flex-col items-center px-4 py-10"}>
            <div className={embedded ? "" : "w-full max-w-5xl"}>
                {!embedded && (
                    <>
                        <button
                            onClick={() => navigate(`/creator/forms/${id}`)}
                            className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Kembali ke Detail
                        </button>

                        <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Soal</h1>
                        <p className="text-sm text-tinted mb-6">Form: {formTitle}</p>
                    </>
                )}

                <div className={`flex justify-end gap-2 ${embedded ? "mb-3" : "mb-4"}`}>
                    {!showEditor && (
                        <>
                            <button onClick={() => setShowImport(true)} className="btn bg-base text-darks border border-second h-9 min-h-0">
                                <FileUp className="h-4 w-4" /> Impor Soal
                            </button>
                            <button onClick={startAdd} className="btn bg-darks text-base border-none h-9 min-h-0">
                                <Plus className="h-4 w-4" /> Tambah Soal
                            </button>
                        </>
                    )}
                </div>

                {showEditor && (
                    <div className="bg-white border border-second p-6 shadow-sm rounded-none mb-6 overflow-block space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-darks">{editingId ? "Edit Soal" : "Tambah Soal"}</h2>
                            <button onClick={resetEditor} className="btn btn-sm btn-ghost text-tinted">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Soal</label>
                            <RichTextEditor
                                value={questionText}
                                onChange={setQuestionText}
                                placeholder="Tulis soal di sini..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">Tipe</label>
                                <select
                                    className="select w-full bg-base border-second focus:border-done focus:outline-none rounded-full"
                                    value={questionType}
                                    onChange={(e) => setQuestionType(e.target.value)}
                                >
                                    <option value="single_choice">Pilihan Tunggal</option>
                                    <option value="multiple_choice">Pilihan Ganda</option>
                                    <option value="text">Isian</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">Skor</label>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">Urutan</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none"
                                    value={orderIndex}
                                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">
                                    <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> URL Gambar</span>
                                </label>
                                <input
                                    type="text"
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none"
                                    value={imageQuestion}
                                    onChange={(e) => setImageQuestion(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {questionType !== "text" && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
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
                            className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Simpan Soal
                        </button>
                    </div>
                )}

                {questions.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted mb-4">Belum ada soal.</p>
                        {/* <button onClick={startAdd} className="btn bg-darks text-base border-none">
                            <Plus className="h-4 w-4" /> Tambah Soal
                        </button> */}
                    </div>
                ) : (
                    <div className="space-y-3 pb-8">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`bg-white border p-5 shadow-sm rounded-none cursor-grab active:cursor-grabbing ${
                                    dragIndex === idx
                                        ? "border-done opacity-50"
                                        : "border-second"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex gap-3 min-w-0">
                                        <GripVertical className="h-5 w-5 text-tinted shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                            <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(q.question_type)}</span>
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
                        ))}
                    </div>
                )}
            </div>
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
        </div>
    )
}

export default Questions
