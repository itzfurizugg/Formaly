import * as React from "react"
import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Paperclip, Send } from "lucide-react"
import { Spinner } from "../../components/loading"
import BackButton from "../../components/backButton"

interface PromptPayload {
    prompt: string
    fileName: string | null
    mimeType: string | null
    base64: string | null
}

const MAX_FILE_BYTES = 3 * 1024 * 1024

function ChatPage() {
    const navigate = useNavigate()

    const [message, setMessage] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Konversi file asli ke base64 (data URL) supaya formatnya tetap, dikirim ke
    // AI sebagai media/attachment — bukan diekstrak jadi teks.
    const fileToBase64 = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = typeof reader.result === "string" ? reader.result : ""
                const comma = result.indexOf(",")
                resolve(comma >= 0 ? result.substring(comma + 1) : "")
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(f)
        })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = message.trim()
        if (!text && !file) return
        setLoading(true)
        setError("")

        let fileName: string | null = null
        let mimeType: string | null = null
        let base64: string | null = null

        if (file) {
            if (file.size > MAX_FILE_BYTES) {
                setError("File terlalu besar untuk dilampirkan sebagai media (maks ±3MB).")
                setLoading(false)
                return
            }
            fileName = file.name
            mimeType = file.type || "application/octet-stream"
            try {
                base64 = await fileToBase64(file)
            } catch {
                setError("Gagal membaca file. Coba pilih file lain.")
                setLoading(false)
                return
            }
        }

        const payload: PromptPayload = { prompt: text, fileName, mimeType, base64 }
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
            <div className="absolute top-4 left-3.5 sm:left-6">
                <BackButton to="/creator" />
            </div>

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

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Contoh: Buatkan kuis pilihan ganda 10 soal tentang sejarah Indonesia kelas 5 SD..."
                        rows={3}
                        className="w-full resize-none bg-transparent text-darks placeholder:text-tinted text-base outline-none px-1"
                    />

                    <div className="flex items-center justify-between mt-2 px-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-sm rounded-full bg-base-300 border-none text-darks hover:bg-darks/20 transition-colors"
                            aria-label="Tambahkan file untuk konteks"
                            title="Tambahkan file untuk konteks"
                        >
                            <Paperclip className="h-4 w-4" /> Sisipkan File
                        </button>

                        <button
                            type="submit"
                            disabled={(!message.trim() && !file) || loading}
                            className="btn btn-sm rounded-full bg-darks border-none text-base disabled:opacity-40 hover:opacity-90 transition-opacity"
                            aria-label="Kirim"
                        >
                            {loading ? <Spinner size={16} /> : <Send className="h-4 w-4" /> }
                        </button>
                    </div>

                    {error && <p className="text-sm text-wrong mt-2 px-2">{error}</p>}
                </form>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    )
}

export default ChatPage