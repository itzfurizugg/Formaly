import * as React from "react"
import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Paperclip, Send } from "lucide-react"
import * as mammoth from "mammoth"
import { Spinner } from "../../components/loading"

interface PromptPayload {
    prompt: string
    docText: string
    fileName: string | null
}

function ChatPage() {
    const navigate = useNavigate()

    const [message, setMessage] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Baca isi dokumen (txt/md/docx) untuk dijadikan konteks generate.
    // PDF/DOC tidak dibaca otomatis; cukup nama file yang dikirim.
    const readFileContent = async (f: File): Promise<string> => {
        const lower = f.name.toLowerCase()
        if (lower.endsWith(".txt") || lower.endsWith(".md")) return await f.text()
        if (lower.endsWith(".docx")) {
            const result = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })
            return result.value
        }
        return ""
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = message.trim()
        if (!text && !file) return
        setLoading(true)
        setError("")

        let docText = ""
        let fileName: string | null = null
        if (file) {
            fileName = file.name
            try {
                docText = await readFileContent(file)
            } catch {
                docText = ""
            }
        }

        const payload: PromptPayload = { prompt: text, docText, fileName }
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
                <h1 className="text-center font-default text-4xl sm:text-4xl font-bold text-darks">
                    Halo, saya <span className="text-primary">Galileo</span>!
                </h1>
                <p className="text-center text-sm text-tinted mt-2 mb-6">
                    Asisten pembuat form dari Formaly. Tuliskan prompt-mu di bawah, dan saya akan
                    menyusunkan formnya!
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
                        rows={4}
                        className="w-full resize-none bg-transparent text-darks placeholder:text-tinted text-base outline-none px-1"
                    />

                    <div className="flex items-center justify-between mt-2 px-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-sm rounded-full bg-base border-none text-darks hover:bg-second transition-colors"
                            aria-label="Tambahkan dokumen untuk konteks"
                            title="Tambahkan dokumen untuk konteks"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>

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

export default ChatPage