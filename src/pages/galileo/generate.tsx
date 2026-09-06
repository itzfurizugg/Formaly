import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DEFAULT_MODEL_ID, getModel } from "./models"
import { requestAI, type AIHistoryMessage } from "../../lib/galileoAI"
import { embedQuestionConfig } from "../../lib/questionConfig"

interface PromptPayload {
    prompt: string
    fileName: string | null
    mimeType: string | null
    base64: string | null
}

type QuestionType = "single_choice" | "multiple_choice" | "text" | "dropdown" | "file_upload" | "date_time"

interface GenOption {
    text: string
    correct: boolean
    /** URL media opsi (gambar/audio/video). Kolom DB media_url menyusul. */
    media_url?: string | null
}

interface GenQuestion {
    question_text: string
    type: QuestionType
    score: number
    is_required: boolean
    options: GenOption[]
    /** Sub-tipe untuk soal "date_time": date_only | time_only | date_and_time. */
    variant?: "date_only" | "time_only" | "date_and_time"
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
    '      "type": "single_choice" | "multiple_choice" | "dropdown" | "file_upload" | "date_time" | "text",\n' +
    '      "score": number,\n' +
    '      "is_required": boolean,\n' +
    '      "options": [{"text": string, "correct": boolean}],\n' +
    '      "variant": "date_only" | "time_only" | "date_and_time" | null\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    "Aturan:\n" +
    '- Tipe "single_choice", "multiple_choice", dan "dropdown" WAJIB punya minimal 2 opsi atau lebih. ' +
    '"single_choice" dan "dropdown" menyimpan tepat satu opsi benar, "multiple_choice" minimal satu opsi benar.\n' +
    '- Tipe "text", "file_upload", dan "date_time" TIDAK punya opsi (options kosong).\n' +
    '- "file_upload" = responden mengunggah file sebagai jawaban; "date_time" = jawaban berupa tanggal/jam.\n' +
    '- Untuk "date_time", isi "variant": "date_only" (tanggal saja), "time_only" (jam saja), atau "date_and_time" (tanggal & jam); default "date_and_time".\n' +
    '- Buat soal yang lengkap dan sesuai permintaan pengguna (jumlah, topik, jenjang, dst).\n' +
    "- Gunakan Bahasa Indonesia untuk semua teks soal.\n" +
    "- Jika pengguna melampirkan file/media, gunakan isi media itu untuk menyusun soal.\n" +
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
        if (
            q?.type === "single_choice" ||
            q?.type === "multiple_choice" ||
            q?.type === "dropdown" ||
            q?.type === "file_upload" ||
            q?.type === "date_time"
        ) {
            type = q.type
        }

        const score =
            typeof q?.score === "number" && Number.isFinite(q.score) ? Math.max(0, Math.round(q.score)) : 0
        const isRequired = Boolean(q?.is_required)

        let variant: GenQuestion["variant"]
        if (q?.variant === "date_only" || q?.variant === "time_only" || q?.variant === "date_and_time") {
            variant = q.variant as GenQuestion["variant"]
        }

        let options: GenOption[] = []
        if (Array.isArray(q?.options)) {
            options = (q.options as unknown[])
                .map((o) => {
                    const oo = o as Record<string, unknown>
                    return { text: asString(oo?.text), correct: Boolean(oo?.correct), media_url: typeof oo?.media_url === "string" && oo.media_url.trim() ? oo.media_url.trim() : null }
                })
                .filter((o) => o.text.length > 0)
        }

        // Tipe berbasis opsi (pilihan tunggal, ganda, dropdown) butuh minimal 2 opsi;
        // selain itu tidak boleh punya opsi sama sekali. Kalau melanggar, turunkan
        // ke "text" supaya informasi pertanyaannya tidak hilang.
        const isOptionType = type === "single_choice" || type === "multiple_choice" || type === "dropdown"
        if (isOptionType && options.length < 2) {
            type = "text"
            options = []
            variant = undefined
        }
        if (!isOptionType) {
            options = []
            variant = !variant ? undefined : type === "date_time" ? variant : undefined
        }

        const dedup = new Map<string, GenOption>()
        for (const o of options) {
            const key = o.text.toLowerCase()
            if (!dedup.has(key)) dedup.set(key, o)
        }
        options = [...dedup.values()]

        questions.push({ question_text: text, type, score, is_required: isRequired, options, variant })
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
                // TODO(backend): kolom config per soal menyusul; untuk sementara
                // sub-tipe date_time disisipkan ke question_text (lihat lib/questionConfig).
                question_text: embedQuestionConfig(
                    q.question_text,
                    q.type === "date_time" && q.variant ? { dateTimeVariant: q.variant } : null,
                ),
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

            const userContent = promptText

            const message: AIHistoryMessage = { role: "user", content: userContent }
            if (payload?.mimeType && payload?.base64) {
                message.media = {
                    fileName: payload.fileName ?? "lampiran",
                    mimeType: payload.mimeType,
                    base64: payload.base64,
                }
            }

            const raw = await requestAI(model, [message], GENERATE_SYSTEM)

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
        <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden">
            {/* Blob warna di background halaman — sumber blur yang bikin glow & glassmorphism kelihatan */}
            <div className="pointer-events-none absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-darks-400/40 blur-[100px] -z-10" />
            <div className="pointer-events-none absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-tinted-400/40 blur-[100px] -z-10" />

            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {!error ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="relative isolate"
                        >
                            {/* Glow blur di belakang card — pakai isolate + z-index positif, bukan -z-10,
                               supaya nggak kena efek stacking context yang berubah pas animasi opacity motion.div selesai */}
                            <div className="absolute inset-0 -m-4 z-0 rounded-xl bg-gradient-to-br from-darks/50 to-tinted/50 blur-2xl" />

                            <div className="relative z-10 overflow-hidden rounded-xl bg-darks/70 backdrop-blur-xl border border-white/10 px-8 py-14 flex flex-col items-center gap-10">
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
                                    <p className="text-xs text-white/40 bg-white/5 backdrop-blur-sm rounded-xl px-4 py-2.5 max-w-full break-words italic text-center">
                                        &quot;{prompt}&quot;
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="relative isolate"
                        >
                            {/* Glow blur di belakang card — sama, pakai isolate + z-index positif */}
                            <div className="relative z-10 bg-white/100 backdrop-blur-xl border border-white/40 rounded-xl px-8 py-12 flex flex-col items-center gap-4 text-center shadow-sm">
                                <AlertTriangle className="h-8 w-8 text-wrong" />
                                <p className="text-sm text-wrong rounded-lg px-3 py-2 max-w-full">
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default GeneratePage