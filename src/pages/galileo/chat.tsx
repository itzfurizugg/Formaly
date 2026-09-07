import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Paperclip, Send, LayoutTemplate, ChevronDown, Check } from "lucide-react"
import { Spinner } from "../../components/loading"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { AI_MODELS, DEFAULT_MODEL_ID, getModel, type AIModel } from "./models"

interface PromptPayload {
    prompt: string
    fileName: string | null
    mimeType: string | null
    /** Konten file asli (base64) yang dikirim ke AI (docx/pdf/txt/md). */
    base64: string | null
    /** id form yang dipilih untuk ditambah soal (null = buat form baru). */
    form_id: string | null
    /** id model AI yang dipilih pengguna lewat model picker di chat. */
    model_id: string
}

interface FormRef {
    id: string
    title: string
}

/** Cari posisi '@' terakhir sebelum kursor yang belum dibatasi spasi/newline. */
function findMentionAt(value: string, caret: number): number | null {
    for (let i = caret - 1; i >= 0; i--) {
        const ch = value[i]
        if (ch === "@") return i
        if (ch === "\n" || ch === " ") return null
    }
    return null
}

/** Ambil id form yang disebut lewat "@judul form" pada teks (match judul utuh). */
function resolveMentionId(text: string, forms: FormRef[]): string | null {
    if (forms.length === 0 || !text.includes("@")) return null
    let best: FormRef | null = null
    const re = /@([^\n@]*)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        const rest = m[1].trim().toLowerCase()
        for (const f of forms) {
            const title = f.title.trim().toLowerCase()
            if (title && rest.startsWith(title) && (!best || title.length > best.title.length)) {
                best = f
            }
        }
    }
    return best?.id ?? null
}

function ChatPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [message, setMessage] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Model AI yang dipakai untuk generate — dipilih lewat picker di sebelah "Sisipkan Materi".
    const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID)
    const selectedModel = getModel(selectedModelId)

    // Daftar form milik kreator — dipanggil lewat mention "@" di kotak pesan.
    const [forms, setForms] = useState<FormRef[]>([])
    const [formsLoading, setFormsLoading] = useState(false)

    // State popup mention: posisi "@", query filter, & indeks pilihan.
    const [mention, setMention] = useState<{ at: number; query: string } | null>(null)
    const [pickIndex, setPickIndex] = useState(0)
    // Form yang dipilih lewat popup "@" — dipakai langsung untuk mengisi form_id
    // (tidak bergantung pada regex teks, lebih andal).
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return
        let cancelled = false
        setFormsLoading(true)
        void (async () => {
            const { data } = await supabase
                .from("forms")
                .select("id,title")
                .eq("creator_id", user.id)
                .order("updated_at", { ascending: false })
                .limit(50)
            if (!cancelled) {
                setForms((data ?? []).map((f) => ({ id: f.id, title: f.title })))
                setFormsLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [user])

    // Baca file (docx/pdf/txt/md) menjadi base64 + mimeType untuk dikirim ke AI.
    const readFileBase64 = async (f: File): Promise<{ base64: string; mimeType: string }> => {
        const buf = await f.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ""
        const chunk = 0x8000
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
        }
        return {
            base64: btoa(binary),
            mimeType: f.type || "application/octet-stream",
        }
    }

    const filteredForms = mention
        ? forms.filter((f) => f.title.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 8)
        : []

    const pickForm = (f: FormRef) => {
        if (!mention) return
        const { at } = mention
        const caret = textareaRef.current?.selectionStart ?? message.length
        const next = message.slice(0, at) + "@" + f.title + message.slice(caret)
        setMessage(next)
        setMention(null)
        setPickIndex(0)
        // Simpan id yang dipilih supaya payload form_id pasti terisi meski regex tidak match.
        setSelectedFormId(f.id)
        requestAnimationFrame(() => {
            const el = textareaRef.current
            if (el) {
                const pos = at + 1 + f.title.length
                el.focus()
                el.setSelectionRange(pos, pos)
            }
        })
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setMessage(value)
        const caret = e.target.selectionStart ?? value.length
        const at = findMentionAt(value, caret)
        setMention(at === null ? null : { at, query: value.slice(at + 1, caret) })
        setPickIndex(0)
        // Kalau "@judul" yang dipilih dihapus dari teks, reset pilihan form.
        if (selectedFormId) {
            const f = forms.find((x) => x.id === selectedFormId)
            if (!f || !value.includes(f.title)) setSelectedFormId(null)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!mention || filteredForms.length === 0) {
            if (e.key === "Escape") setMention(null)
            return
        }
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setPickIndex((i) => (i + 1) % Math.min(filteredForms.length, 8))
            return
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            setPickIndex((i) => (i <= 0 ? Math.min(filteredForms.length, 8) - 1 : i - 1))
            return
        }
        if (e.key === "Enter") {
            e.preventDefault()
            pickForm(filteredForms[Math.min(pickIndex, filteredForms.length - 1)])
            return
        }
        if (e.key === "Escape") {
            e.preventDefault()
            setMention(null)
            setPickIndex(0)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = message.trim()
        if (!text && !file) return
        setLoading(true)
        setError("")
        setMention(null)

        let base64: string | null = null
        let mimeType: string | null = null
        let fileName: string | null = null
        if (file) {
            fileName = file.name
            try {
                const read = await readFileBase64(file)
                base64 = read.base64
                mimeType = read.mimeType
            } catch {
                base64 = null
                mimeType = null
            }
        }

        const payload: PromptPayload = {
            prompt: text,
            fileName,
            mimeType,
            base64,
            // Prioritas: form yang dipilih eksplisit lewat popup "@".
            // Fallback: telusuri judul form yang disebut "@judul..." dalam teks.
            form_id: selectedFormId ?? resolveMentionId(text, forms),
            model_id: selectedModelId,
        }
        sessionStorage.setItem("galileo:prompt", JSON.stringify(payload))

        setMessage("")
        setFile(null)
        setLoading(false)
        navigate("/creator/galileo/generate")
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (selected) setFile(selected)
        e.target.value = ""
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-3.5 sm:px-6 py-6">
            <div className="w-full max-w-2xl">
                <h1 className="text-center font-default text-4xl sm:text-4xl text-darks">
                    Halo, saya <span className="font-bold">Galileo</span>!
                </h1>
                <p className="text-center text-sm text-tinted mt-2 mb-6">
                    Mulai membuat form dengan mudah! Galileo adalah AI Form Builder milik <span className="font-bold">Formaly</span>
                </p>

                <form onSubmit={handleSubmit} className="bg-white border border-second rounded-2xl shadow-sm p-4">
                    {file && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-base rounded-lg w-fit max-w-full">
                            <FileText className="h-4 w-4 text-darks shrink-0" />
                            <span className="text-sm text-darks truncate">{file.name}</span>
                            <button
                                type="button"
                                onClick={() => setFile(null)}
                                aria-label="Hapus dokumen"
                                className="text-tinted hover:text-wrong transition-colors shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        {/* Popup mention "@" — daftar form yang cocok untuk dijadikan target tambah soal */}
                        <AnimateBlur open={mention !== null && filteredForms.length > 0}>
                            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-second bg-white shadow-lg overflow-hidden">
                                {formsLoading ? (
                                    <p className="px-3 py-2.5 text-sm text-tinted">Memuat daftar form...</p>
                                ) : filteredForms.length === 0 ? (
                                    <p className="px-3 py-2.5 text-sm text-tinted">Tidak ada form yang cocok.</p>
                                ) : (
                                    <ul className="max-h-56 overflow-y-auto py-1">
                                        {filteredForms.map((f, i) => (
                                            <li key={f.id}>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setPickIndex(i)}
                                                    onClick={() => pickForm(f)}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                                        i === pickIndex ? "bg-base" : "bg-transparent"
                                                    }`}
                                                >
                                                    <LayoutTemplate className="h-4 w-4 text-tinted shrink-0" />
                                                    <span className="text-darks truncate">{f.title}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </AnimateBlur>

                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Contoh: Buatkan kuis pilihan ganda 10 soal tentang sejarah Indonesia kelas 5 SD."
                            rows={3}
                            className="w-full resize-none bg-transparent text-darks placeholder:text-tinted text-base outline-none px-1"
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2 px-1">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-sm rounded-full bg-base-300 border-none text-darks hover:bg-darks/20 transition-colors"
                                aria-label="Tambahkan dokumen untuk konteks"
                                title="Tambahkan dokumen untuk konteks"
                            >
                                <Paperclip className="h-4 w-4" /> Sisipkan Materi
                            </button>

                            <ModelPicker models={AI_MODELS} selected={selectedModel} onSelect={setSelectedModelId} />
                        </div>

                        <button
                            type="submit"
                            disabled={(!message.trim() && !file) || loading}
                            className="btn btn-sm rounded-full bg-darks border-none text-base disabled:opacity-40 hover:opacity-90 transition-opacity"
                            aria-label="Kirim"
                        >
                            {loading ? <Spinner size={16} /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>

                    {error && <p className="text-sm text-wrong mt-2 px-2">{error}</p>}
{/* 
                    <p className="text-xs text-tinted mt-3 px-1">
                        Coba ketik <span className="font-semibold text-darks">@</span> lalu pilih form — Galileo akan membaca soal yang sudah ada dan menambahkan soal baru ke form itu.
                    </p> */}
                </form>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    )
}

/** Tombol pemilih model AI — mirip model picker Claude: pill dengan nama model aktif,
 *  diklik membuka panel berisi seluruh model dengan deskripsi singkat & tanda centang. */
function ModelPicker({
    models,
    selected,
    onSelect,
}: {
    models: AIModel[]
    selected: AIModel
    onSelect: (id: string) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="btn btn-sm rounded-full bg-base-300 border-none text-darks hover:bg-darks/20 transition-colors gap-1.5"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
                {selected.name}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimateBlur open={open}>
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-second bg-white shadow-lg overflow-hidden z-20">
                    <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
                        {models.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelect(m.id)
                                        setOpen(false)
                                    }}
                                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                                        m.id === selected.id ? "bg-base" : "bg-transparent hover:bg-base/60"
                                    }`}
                                    role="option"
                                    aria-selected={m.id === selected.id}
                                >
                                    <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-darks truncate">{m.name}</span>
                                        <span className="block text-xs text-tinted mt-0.5 leading-snug">{m.description}</span>
                                    </span>
                                    {m.id === selected.id && <Check className="h-4 w-4 text-darks shrink-0 mt-0.5" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </AnimateBlur>
        </div>
    )
}

/** Pembungkus popup mention dengan transisi muncul/hilang sederhana. */
function AnimateBlur({ open, children }: { open: boolean; children: React.ReactNode }) {
    return (
        <div className={open ? "pointer-events-auto opacity-100 translate-y-0 transition-all duration-150" : "pointer-events-none opacity-0 translate-y-1 transition-all duration-150"}>
            {children}
        </div>
    )
}

export default ChatPage