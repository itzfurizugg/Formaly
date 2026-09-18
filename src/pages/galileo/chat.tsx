import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Paperclip, Send, LayoutTemplate } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Spinner } from "../../components/loading"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { extractFileText } from "../../lib/fileText"
import { DEFAULT_MODEL_ID } from "./models"
import { fadeSlide } from "../../lib/motion"
import BackButton from "../../components/backButton"

interface PromptPayload {
    prompt: string
    fileName: string | null
    mimeType: string | null
    /** Konten file asli (base64) yang dikirim ke AI (docx/pdf/txt/md). */
    base64: string | null
    /** Teks hasil ekstraksi isi file — konteks untuk model yang tidak menerima file mentah. */
    fileText: string | null
    /** id form yang dipilih untuk ditambah soal (null = buat form baru). */
    form_id: string | null
    /** Model AI — selalu Smart Route: tugas ringan otomatis ke Gemini, berat ke Nemotron. */
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

const QUICK_PROMPTS = [
    {
        icon: "📝",
        label: "Kuis Pilihan Ganda",
        prompt: "Buatkan kuis pilihan ganda 10 soal dengan 4 opsi jawaban dengan tingkat kesulitan Kelas 7 SMP tentang materi mitosis dan meiosis",
    },
    {
        icon: "🔢",
        label: "Ujian Matematika",
        prompt: "Buatkan ujian matematika 10 soal campuran (pilihan ganda & isian singkat) untuk kelas 5 SD. Topik: pecahan, bangun datar, dan operasi hitung campuran.",
    },
    {
        icon: "📋",
        label: "Form Pendaftaran",
        prompt: "Buatkan form pendaftaran online dengan field: nama lengkap, email, nomor telepon, alamat, asal sekolah, dan jurusan yang dipilih.",
    },
    {
        icon: "📊",
        label: "Soal HOTS",
        prompt: "Posisikan anda sebagai guru ... , tolong buatkan saya ... soal HOTS (High Order Thinking Skills) tentang ... untuk ... dengan tingkat kesulitan seperti ...",
    },
    // {
    //     icon: "📖",
    //     label: "Soal Literasi",
    //     prompt: "Buatkan soal literasi membaca 5 soal berdasarkan teks pendek. Setiap soal memiliki 4 pilihan jawaban dengan kunci jawaban.",
    // },
]

function ChatPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [message, setMessage] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Daftar form milik kreator — dipanggil lewat mention "@" di kotak pesan.
    const [forms, setForms] = useState<FormRef[]>([])
    const [formsLoading, setFormsLoading] = useState(false)

    // State popup mention: posisi "@", query filter, & indeks pilihan.
    const [mention, setMention] = useState<{ at: number; query: string } | null>(null)
    const [pickIndex, setPickIndex] = useState(0)
    // Form yang dipilih lewat popup "@" — dipakai langsung untuk mengisi form_id
    // (tidak bergantung pada regex teks, lebih andal).
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
    const [textareaFocused, setTextareaFocused] = useState(false)

    // Auto-resize textarea: reset ke auto, lalu paksa sesuai scrollHeight.
    // CSS max-h-[45vh] + overflow-y-auto menghandle scroll kalau melebihi batas.
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
    }, [message])

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
        let fileText: string | null = null
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
            try {
                fileText = await extractFileText(file)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Isi file tidak bisa dibaca.")
                setLoading(false)
                return
            }
        }

        const payload: PromptPayload = {
            prompt: text,
            fileName,
            mimeType,
            base64,
            fileText,
            // Prioritas: form yang dipilih eksplisit lewat popup "@".
            // Fallback: telusuri judul form yang disebut "@judul..." dalam teks.
            form_id: selectedFormId ?? resolveMentionId(text, forms),
            model_id: DEFAULT_MODEL_ID,
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] sm:min-h-screen px-3.5 sm:px-6 py-5 sm:py-10">
            <BackButton to="/creator" />
            <div className="w-full max-w-2xl flex flex-col my-auto">
                <motion.div variants={fadeSlide} initial="hidden" animate="show" className="w-full">
                    <motion.div
                        layout
                        transition={{ layout: { type: "spring", stiffness: 340, damping: 30 } }}
                    >
                        <h1 className="text-center font-default text-3xl sm:text-4xl text-darks">
                            Halo, saya <span className="font-bold">Galileo</span>!
                        </h1>
                        <p className="text-center text-xs sm:text-sm text-tinted mt-2 mb-5 sm:mb-6 px-2">
                            Mulai membuat form dengan mudah! Galileo adalah AI Form Builder milik <span className="font-bold">Formaly</span>
                        </p>
                    </motion.div>

                    <AnimatePresence mode="popLayout">
                        {textareaFocused && (
                            <motion.div
                                layout
                                initial="hidden"
                                animate="show"
                                exit="hidden"
                                variants={{
                                    hidden: {},
                                    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                                }}
                                transition={{ layout: { type: "spring", stiffness: 340, damping: 30 } }}
                                className="flex flex-wrap justify-center gap-2 mb-3"
                            >
                                {QUICK_PROMPTS.map((qp) => (
                                    <motion.div
                                        key={qp.label}
                                        variants={{
                                            hidden: { opacity: 0, y: 18, scale: 0.9 },
                                            show: { opacity: 1, y: 0, scale: 1 },
                                        }}
                                        transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                    >
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setMessage(qp.prompt)}
                                            className="btn btn-sm rounded-full bg-white dark:bg-second border-none text-darks hover:bg-darks/20 transition-colors text-xs"
                                        >
                                            {qp.icon} {qp.label}
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        layout
                        transition={{ layout: { type: "spring", stiffness: 340, damping: 30 } }}
                        onSubmit={handleSubmit}
                        className="relative bg-white dark:bg-second border border-second rounded-2xl shadow-sm p-3.5 sm:p-5 min-h-[8rem]"
                    >
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
                            <AnimateBlur open={mention !== null && filteredForms.length > 0}>
                                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-second bg-white dark:bg-second shadow-lg overflow-hidden">
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
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${i === pickIndex ? "bg-base" : "bg-transparent"
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
                                onFocus={() => setTextareaFocused(true)}
                                onBlur={() => setTextareaFocused(false)}
                                placeholder="Form anda mulai diketik dari sini!"
                                rows={1}
                                className="w-full h-full resize-none bg-transparent text-darks placeholder:text-tinted text-sm sm:text-darks outline-none min-h-[6rem] pb-12 max-h-[45vh] overflow-y-auto"
                            />
                        </div>

                        <div className="absolute bottom-4 left-3.5 right-3.5 sm:left-4 sm:right-4 sm:bottom-5 flex items-center justify-between gap-2 px-1 pt-2.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-sm rounded-full bg-base-300 border-none text-darks hover:bg-darks/20 transition-colors gap-1.5 px-3 text-xs"
                                aria-label="Tambahkan dokumen untuk konteks"
                                title="Tambahkan dokumen untuk konteks"
                            >
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                <span>Sisipkan Materi</span>
                            </button>

                            <button
                                type="submit"
                                disabled={(!message.trim() && !file) || loading}
                                className="btn btn-sm rounded-full bg-darks border-none text-base disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                                aria-label="Kirim"
                            >
                                {loading ? <Spinner size={16} /> : <Send className="h-4 w-4" />}
                            </button>
                        </div>

                        {error && <p className="text-sm text-wrong mt-2 px-2">{error}</p>}
                    </motion.form>
                </motion.div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
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