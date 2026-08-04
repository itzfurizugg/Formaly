import Loading from "../../components/loading"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Loader2, Image as ImageIcon } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

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

function Questions() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [formTitle, setFormTitle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id])

    async function loadAll() {
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
    }

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
        setError(null)
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
        if (!questionText.trim()) {
            setError("Soal tidak boleh kosong.")
            return
        }
        if (questionType !== "text" && options.length === 0) {
            setError("Tambahkan minimal satu pilihan jawaban.")
            return
        }

        setSaving(true)
        setError(null)

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
            setError(qErr.message)
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
    }

    const handleDelete = async (q: Question) => {
        if (!window.confirm("Hapus soal ini beserta pilihannya?")) return
        await supabase.from("question_options").delete().eq("question_id", q.id)
        const { error: err } = await supabase.from("questions").delete().eq("id", q.id)
        if (err) setError(err.message)
        loadAll()
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
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <button
                    onClick={() => navigate(`/creator/forms/${id}`)}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Detail
                </button>

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Soal</h1>
                <p className="text-sm text-tinted mb-6">Form: {formTitle}</p>

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="flex justify-end mb-4">
                    {!showEditor && (
                        <button onClick={startAdd} className="btn bg-darks text-base border-none h-9 min-h-0">
                            <Plus className="h-4 w-4" /> Tambah Soal
                        </button>
                    )}
                </div>

                {showEditor && (
                    <div className="bg-white border border-second p-6 shadow-sm rounded-2xl mb-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-darks">{editingId ? "Edit Soal" : "Tambah Soal"}</h2>
                            <button onClick={resetEditor} className="btn btn-sm btn-ghost text-tinted">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Soal</label>
                            <textarea
                                className="textarea w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
                                rows={2}
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
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
                                            <input
                                                type="text"
                                                className="input flex-1 bg-base border-second focus:border-done focus:outline-none"
                                                value={opt.option_text}
                                                onChange={(e) => updateOption(index, { option_text: e.target.value })}
                                                placeholder={`Pilihan ${index + 1}`}
                                            />
                                            <label className="flex items-center gap-1 text-xs text-darks shrink-0 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs border-second"
                                                    checked={opt.is_correct}
                                                    onChange={(e) => updateOption(index, { is_correct: e.target.checked })}
                                                />
                                                Benar
                                            </label>
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
                        <button onClick={startAdd} className="btn bg-darks text-base border-none">
                            <Plus className="h-4 w-4" /> Tambah Soal
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="bg-white border border-second p-5 shadow-sm rounded-2xl">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-darks">Soal {idx + 1}</span>
                                            <span className="badge badge-ghost text-tinted rounded-full text-xs">{typeLabel(q.question_type)}</span>
                                            {Number(q.score_value) > 0 && <span className="badge badge-ghost text-tinted rounded-full text-xs">{q.score_value} poin</span>}
                                        </div>
                                        <p className="text-sm text-darks whitespace-pre-line">{q.question_text}</p>
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
                                                        {o.option_text}
                                                        {o.is_correct && <span className="text-xs text-done font-medium">(kunci)</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
        </div>
    )
}

export default Questions
