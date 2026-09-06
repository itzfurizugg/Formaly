import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DEFAULT_MODEL_ID, getModel } from "./models"
import { requestAI } from "../../lib/galileoAI"

interface PromptPayload {
    prompt: string
    docText: string
    fileName: string | null
}

type QuestionType = "single_choice" | "multiple_choice" | "text"

interface GenOption {
    text: string
    correct: boolean
}

interface GenQuestion {
    question_text: string
    type: QuestionType
    score: number
    is_required: boolean
    options: GenOption[]
}

interface GenForm {
    title: string
    description: string
    duration_minutes: number | null
    passing_score: number
    questions: GenQuestion[]
}

// Instruksi sistem: minta model mengembalikan hanya satu JSON yang valid.
const GENERATE_SYSTEM =
    "Kamu adalah Galileo, generator form/kuis dari platform Formaly. Ubah permintaan pengguna " +
    "menjadi struktur form JSON. WAJIB mengembalikan HANYA JSON valid tanpa teks lain, tanpa " +
    "penjelasan, dan tanpa blok markdown.\n\n" +
    'Skema JSON yang harus diikuti:\n' +
    '{\n' +
    '  "title": string,\n' +
    '  "description": string,\n' +
    '  "duration_minutes": number | null,\n' +
    '  "passing_score": number (0-100),\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "question_text": string,\n' +
    '      "type": "single_choice" | "multiple_choice" | "text",\n' +
    '      "score": number,\n' +
    '      "is_required": boolean,\n' +
    '      "options": [{"text": string, "correct": boolean}]\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    "Aturan:\n" +
    '- Tipe "single_choice" dan "multiple_choice" WAJIB punya minimal 2 opsi atau lebih. ' +
    '"single_choice" menyimpan tepat satu opsi benar, "multiple_choice" minimal satu opsi benar.\n' +
    '- Tipe "text" TIDAK punya opsi (options kosong).\n' +
    '- Buat soal yang lengkap dan sesuai permintaan pengguna (jumlah, topik, jenjang, dst).\n' +
    "- Gunakan Bahasa Indonesia untuk semua teks soal.\n" +
    "- Jika pengguna melampirkan dokumen, acu isinya untuk menyusun soal.\n" +
    "- Kosongkan passing_score hanya jika tidak relevan (isi 70)."

// Tahapan proses generate — dipakai untuk crossfade teks & posisi orbit.
const STAGES = [
    "Menghubungkan ke model AI",
    "Menyusun struktur form",
    "Menyimpan form ke database",
] as const

function extractJson(raw: string): unknown {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = fenced ? fenced[1] : raw
    const start = candidate.indexOf("{")
    const end = candidate.lastIndexOf("}")
    if (start === -1 || end < start) throw new Error("Respons AI tidak mengandung JSON yang valid.")
    return JSON.parse(candidate.slice(start, end + 1))
}

function asString(v: unknown): string {
    return typeof v === "string" ? v.trim() : ""
}

function parseGenerated(raw: string): GenForm {
    let data: unknown
    try {
        data = extractJson(raw)
    } catch {
        throw new Error("Respons AI bukan JSON valid. Coba lagi dengan prompt yang lebih sederhana.")
    }
    const obj = data as Record<string, unknown>

    const title = asString(obj?.title)
    if (!title) throw new Error("AI tidak mengembalikan judul form.")

    const description = asString(obj?.description)
    const duration_unchecked = obj?.duration_minutes
    const duration =
        typeof duration_unchecked === "number" && Number.isFinite(duration_unchecked)
            ? Math.max(0, Math.round(duration_unchecked))
            : null
    const passing = typeof obj?.passing_score === "number" ? Math.min(100, Math.max(0, Math.round(obj.passing_score))) : 70

    const rawQuestions = Array.isArray(obj?.questions) ? (obj.questions as unknown[]) : []
    const questions: GenQuestion[] = []

    for (const item of rawQuestions) {
        const q = item as Record<string, unknown>
        const text = asString(q?.question_text)
        if (!text) continue

        let type: QuestionType = "text"
        if (q?.type === "single_choice" || q?.type === "multiple_choice") type = q.type

        const score =
            typeof q?.score === "number" && Number.isFinite(q.score) ? Math.max(0, Math.round(q.score)) : 0
        const isRequired = Boolean(q?.is_required)

        let options: GenOption[] = []
        if (Array.isArray(q?.options)) {
            options = (q.options as unknown[])
                .map((o) => {
                    const oo = o as Record<string, unknown>
                    return { text: asString(oo?.text), correct: Boolean(oo?.correct) }
                })
                .filter((o) => o.text.length > 0)
        }

        // Opsi kurang dari 2 tidak layak untuk pilihan; turunkan jadi isian bebas
        // supaya informasinya tidak hilang.
        if (type !== "text" && options.length < 2) {
            type = "text"
            options = []
        }

        const dedup = new Map<string, GenOption>()
        for (const o of options) {
            const key = o.text.toLowerCase()
            if (!dedup.has(key)) dedup.set(key, o)
        }
        options = [...dedup.values()]

        questions.push({ question_text: text, type, score, is_required: isRequired, options })
    }

    if (questions.length === 0) {
        throw new Error("AI tidak mengembalikan soal yang valid. Coba prompt lain atau pertegas jumlah soalnya.")
    }

    return { title, description, duration_minutes: duration, passing_score: passing, questions }
}

async function saveForm(userId: string, form: GenForm): Promise<string> {
    const { data: formRow, error: formErr } = await supabase
        .from("forms")
        .insert({
            creator_id: userId,
            title: form.title,
            description: form.description || null,
            duration: form.duration_minutes,
            passing_score: form.passing_score,
            status: "draft",
        })
        .select("id")
        .single()
    if (formErr) throw new Error(`Gagal membuat form: ${formErr.message}`)

    for (let i = 0; i < form.questions.length; i++) {
        const q = form.questions[i]
        const { data: qRow, error: qErr } = await supabase
            .from("questions")
            .insert({
                form_id: formRow.id,
                question_text: q.question_text,
                question_type: q.type,
                score_value: q.score,
                order_index: i,
                is_required: q.is_required,
            })
            .select("id")
            .single()
        if (qErr) throw new Error(`Gagal menyimpan soal "${q.question_text}": ${qErr.message}`)

        if (q.options.length > 0) {
            const rows = q.options.map((o, oi) => ({
                question_id: qRow.id,
                option_text: o.text,
                is_correct: o.correct,
                order_index: oi,
            }))
            const { error: oErr } = await supabase.from("question_options").insert(rows)
            if (oErr) throw new Error(`Gagal menyimpan opsi soal "${q.question_text}": ${oErr.message}`)
        }
    }

    return formRow.id
}

function GeneratePage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const inFlightRef = useRef(false)
    const [attempt, setAttempt] = useState(0)
    const [step, setStep] = useState<string>(STAGES[0])
    const [prompt, setPrompt] = useState("")
    const [error, setError] = useState<string | null>(null)

    const model = getModel(DEFAULT_MODEL_ID)
    const stageIndex = Math.max(0, STAGES.indexOf(step as (typeof STAGES)[number]))

    const run = async () => {
        setError(null)
        setStep(STAGES[0])
        try {
            if (!user) {
                setError("Sesi kamu belum aktif. Silakan masuk kembali.")
                return
            }

            const payloadRaw = sessionStorage.getItem("galileo:prompt")
            const payload = payloadRaw ? (JSON.parse(payloadRaw) as PromptPayload) : null
            const promptText = payload?.prompt?.trim() ?? ""
            if (!promptText) {
                setError("Tidak ada prompt. Kembali ke halaman Galileo dan tuliskan ide form-mu.")
                return
            }
            setPrompt(promptText)

            let userContent = promptText
            if (payload?.docText) {
                userContent += `\n\nIsi dokumen "${payload.fileName}":\n${payload.docText}`
            }

            const raw = await requestAI(model, [{ role: "user", content: userContent }], GENERATE_SYSTEM)

            setStep(STAGES[1])
            const form = parseGenerated(raw)

            setStep(STAGES[2])
            const formId = await saveForm(user.id, form)

            sessionStorage.removeItem("galileo:prompt")
            navigate(`/creator/forms/${formId}/questions`, { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.")
        } finally {
            inFlightRef.current = false
        }
    }

    useEffect(() => {
        if (!user || inFlightRef.current) return
        inFlightRef.current = true
        void run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, attempt])

    return (
        <div className="flex items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {!error ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="relative overflow-hidden rounded-3xl bg-darks px-8 py-14 flex flex-col items-center gap-10"
                        >
                            {/* Lensa teleskop: cincin berlapis berputar dengan kecepatan berbeda */}
                            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border border-white/15 border-t-white/50"
                                />
                                <motion.span
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-3 rounded-full border border-white/10 border-t-white/40"
                                />
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-7 rounded-full border border-dashed border-white/20"
                                >
                                    <motion.span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white" />
                                </motion.span>

                                <motion.div
                                    animate={{ scale: [1, 1.12, 1] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-12 h-12 rounded-full bg-white/95"
                                />
                            </div>

                            <div className="flex flex-col items-center gap-3 text-center">
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={stageIndex}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.35 }}
                                        className="text-lg font-medium text-white"
                                    >
                                        {STAGES[stageIndex]}
                                    </motion.p>
                                </AnimatePresence>

                                {/* Orbit progress track: posisi titik menandai tahap yang sedang berjalan */}
                                <div className="relative w-40 h-1 rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        animate={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="absolute inset-y-0 left-0 rounded-full bg-white"
                                    />
                                </div>

                                <p className="text-xs text-white/50">
                                    {model.name} sedang meracik form-mu
                                </p>
                            </div>

                            {prompt && (
                                <p className="text-xs text-white/40 bg-white/5 rounded-xl px-4 py-2.5 max-w-full break-words italic text-center">
                                    &quot;{prompt}&quot;
                                </p>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="bg-white border border-second rounded-3xl px-8 py-12 flex flex-col items-center gap-4 text-center shadow-sm"
                        >
                            <AlertTriangle className="h-8 w-8 text-wrong" />
                            <p className="text-sm text-wrong bg-wrong/10 border border-wrong/20 rounded-lg px-3 py-2 max-w-full">
                                {error}
                            </p>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => navigate("/creator/galileo")}
                                    className="btn btn-sm rounded-full bg-base border border-second text-darks hover:bg-second transition-colors"
                                >
                                    Kembali
                                </button>
                                <button
                                    onClick={() => setAttempt((a) => a + 1)}
                                    className="btn btn-sm rounded-full bg-darks border-none text-base hover:opacity-90 transition-opacity"
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default GeneratePage