import { getModel, type AIModel } from "../pages/creator/galileo/models"

export interface AIMedia {
    fileName: string
    mimeType: string
    /** Konten file asli dalam base64 (bukan hasil ekstrak teks). */
    base64: string
}

export interface AIHistoryMessage {
    role: "user" | "assistant"
    content: string
    media?: AIMedia
}

export const REQUEST_TIMEOUT_MS = 120_000

/** Hasil estimasi berat-ringannya tugas — dipakai router Smart Route. */
export interface RouteEstimate {
    tier: "light" | "heavy"
    score: number
}

const ROUTE_THRESHOLD = 2.5

// Kata kunci yang menaikkan "berat" tugas. Kuat (skala besar) vs sedang.
const HEAVY_KEYWORDS_STRONG = ["utbk", "sbmptn", "snbt", "bps", "cpns"]
const HEAVY_KEYWORDS_MEDIUM = [
    "hukum", "kedokteran", "medis", "kalkulus", "statistik", "pemrograman",
    "algoritma", "analisis", "analisa", "jurnal", "penelitian", "debat",
    "esai", "eskai", "kompleks", "rumit", "mendalam", "kode program",
]

// Estimasi kompleksitas berdasarkan panjang input, jumlah soal yang diminta,
// lampiran file, mode "lengkapi form yang ada", dan kata kunci.
export function estimateComplexity(messages: AIHistoryMessage[], system?: string): RouteEstimate {
    let score = 0
    const userText = messages
        .filter((h) => h.role === "user")
        .map((h) => h.content || "")
        .join(" ")

    // Panjang prompt: 500 karakter ≈ +1.
    score += userText.length / 500

    // Lampiran file (raw media): makin besar file, makin berat.
    const mediaLen = messages.reduce((acc, h) => acc + (h.media?.base64?.length ?? 0), 0)
    if (mediaLen > 0) {
        // base64 menggelembung ~33%; 1MB file ≈ 1.33MB base64 → +1.5.
        score += 1.5
        score += mediaLen / 900_000
    }

    // Jumlah soal yang diminta ("N soal / pertanyaan / kuis").
    const countMatch = userText.match(/(\d+)\s*(?:soal|pertanyaan|soal-soal|kuis)/i)
    if (countMatch) {
        const n = parseInt(countMatch[1], 10)
        score += n >= 25 ? 2.5 : n >= 15 ? 1.5 : n >= 8 ? 0.8 : 0
    }

    // Mode melengkapi form yang sudah ada (append lewat @judul) — butuh menjaga konteks.
    if (/yang sudah ada|eksisting/i.test(system ?? "")) score += 1.5

    const lower = userText.toLowerCase()
    for (const kw of HEAVY_KEYWORDS_STRONG) {
        if (lower.includes(kw)) score += 1
    }
    let mediumBoost = 0
    for (const kw of HEAVY_KEYWORDS_MEDIUM) {
        if (lower.includes(kw)) mediumBoost += 0.5
    }
    score += Math.min(mediumBoost, 2.5)

    return { score, tier: score >= ROUTE_THRESHOLD ? "heavy" : "light" }
}

/**
 * Resolusi model yang "akan" dipakai untuk sebuah request. Untuk model router
 * (punya `route`), kembalikan model ringan/berat sesuai estimasi. Untuk model
 * biasa, kembalikan model itu sendiri. Dipakai untuk label/pratinjau UI.
 */
export function getRoutedModel(
    m: AIModel,
    messages: AIHistoryMessage[],
    system?: string,
): AIModel {
    if (!m.route) return m
    const { tier } = estimateComplexity(messages, system)
    const ref = tier === "light" ? m.route.light : m.route.heavy
    return getModel(ref)
}

async function parseHttpError(res: Response): Promise<string> {
    try {
        const data: unknown = await res.json()
        const obj = data as Record<string, unknown>
        const err = obj?.error as Record<string, unknown> | undefined
        if (typeof err?.message === "string") return err.message
        if (typeof obj?.message === "string") return obj.message
        return `HTTP ${res.status}`
    } catch {
        return `HTTP ${res.status}`
    }
}

async function callOpenAI(
    m: AIModel,
    messages: AIHistoryMessage[],
    system: string | undefined,
    signal: AbortSignal,
): Promise<string> {
    const systemEntry = system ? [{ role: "system", content: system }] : []
    const res = await fetch(`${m.baseUrl}${m.endpoint}`, {
        method: "POST",
        signal,
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${m.apiKey}`,
        },
        body: JSON.stringify({
            model: m.model,
            messages: [...systemEntry, ...messages],
        }),
    })
    if (!res.ok) throw new Error(`OpenAI gagal: ${await parseHttpError(res)}`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== "string" || !text.trim()) throw new Error("Respons OpenAI kosong.")
    return text
}

async function callOpenRouter(
    m: AIModel,
    messages: AIHistoryMessage[],
    system: string | undefined,
    signal: AbortSignal,
): Promise<string> {
    const systemEntry = system ? [{ role: "system", content: system }] : []
    const res = await fetch(`${m.baseUrl}${m.endpoint}`, {
        method: "POST",
        signal,
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${m.apiKey}`,
        },
        body: JSON.stringify({
            model: m.model,
            messages: [...systemEntry, ...messages],
            // Matikan reasoning: model reasoning (mis. Nemotron) bisa balikin field
            // `message.reasoning` terpisah yang boros token & tidak dipakai di sini.
            // Kita hanya butuh `message.content` yang berisi JSON form-nya.
            reasoning: { enabled: false },
        }),
    })
    if (!res.ok) throw new Error(`OpenRouter gagal: ${await parseHttpError(res)}`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    // Ambil khusus `content` — sengaja tidak menyentuh `message.reasoning` sama sekali
    // supaya narasi proses berpikir model tidak ikut kecampur ke output yang di-parse JSON.
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== "string" || !text.trim()) throw new Error("Respons OpenRouter kosong.")
    return text
}

async function callGemini(
    m: AIModel,
    messages: AIHistoryMessage[],
    system: string | undefined,
    signal: AbortSignal,
): Promise<string> {
    const url = `${m.baseUrl}${m.endpoint}?key=${encodeURIComponent(m.apiKey)}`
    const res = await fetch(url, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents: messages.map((h) => ({
                role: h.role === "assistant" ? "model" : "user",
                parts: [
                    { text: h.content },
                    ...(h.media && h.media.base64
                        ? [
                              {
                                  inline_data: {
                                      mime_type: h.media.mimeType,
                                      data: h.media.base64,
                                  },
                              },
                          ]
                        : []),
                ],
            })),
        }),
    })
    if (!res.ok) throw new Error(`Gemini gagal: ${await parseHttpError(res)}`)
    const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = data?.candidates
        ?.flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
    if (typeof text !== "string" || !text.trim()) throw new Error("Respons Gemini kosong.")
    return text
}

async function callClaude(
    m: AIModel,
    messages: AIHistoryMessage[],
    system: string | undefined,
    signal: AbortSignal,
): Promise<string> {
    const res = await fetch(`${m.baseUrl}${m.endpoint}`, {
        method: "POST",
        signal,
        headers: {
            "content-type": "application/json",
            "x-api-key": m.apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: m.model,
            system: system ?? "",
            max_tokens: 4096,
            messages,
        }),
    })
    if (!res.ok) throw new Error(`Claude gagal: ${await parseHttpError(res)}`)
    const data = (await res.json()) as { content?: { type?: string; text?: string }[] }
    const text = data?.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
    if (typeof text !== "string" || !text.trim()) throw new Error("Respons Claude kosong.")
    return text
}

async function callCustom(
    m: AIModel,
    messages: AIHistoryMessage[],
    system: string | undefined,
    signal: AbortSignal,
): Promise<string> {
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (m.apiKey) headers.Authorization = `Bearer ${m.apiKey}`
    const systemEntry = system ? [{ role: "system", content: system }] : []
    const res = await fetch(`${m.baseUrl}${m.endpoint}`, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify({
            model: m.model || "galileo",
            messages: [...systemEntry, ...messages],
        }),
    })
    if (!res.ok) throw new Error(`Endpoint kustom gagal: ${await parseHttpError(res)}`)
    const data = (await res.json()) as Record<string, unknown>
    const choices = data?.choices as { message?: { content?: string } }[] | undefined
    const candidate =
        choices?.[0]?.message?.content ??
        data?.reply ??
        data?.answer ??
        data?.response ??
        data?.message ??
        data?.text
    if (typeof candidate === "string" && candidate.trim()) return candidate
    throw new Error("Respons dari endpoint kustom tidak dikenali. Pastikan format OpenAI-compatible.")
}

async function callModel(
    m: AIModel,
    messages: AIHistoryMessage[],
    system?: string,
): Promise<string> {
    if (!m.apiKey) {
        throw new Error(`API key untuk ${m.name} belum diisi. Set key-nya di berkas .env sesuai models.tsx.`)
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
        switch (m.provider) {
            case "OpenAI":
                return await callOpenAI(m, messages, system, controller.signal)
            case "OpenRouter":
                return await callOpenRouter(m, messages, system, controller.signal)
            case "Google":
                return await callGemini(m, messages, system, controller.signal)
            case "Anthropic":
                return await callClaude(m, messages, system, controller.signal)
            case "Custom":
                return await callCustom(m, messages, system, controller.signal)
            default:
                throw new Error(`Provider belum didukung: ${(m.provider as string) ?? "unknown"}`)
        }
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            throw new Error("Permintaan ke AI memakan waktu terlalu lama. Coba lagi.", { cause: err })
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Router otomatis (stacking ala 9router).
 * - Tugas ringan (estimasi skor < threshold) → model `route.light` (mis. Gemini).
 * - Tugas berat → model `route.heavy` (mis. Nemotron).
 * - Kalau model utama gagal (error/rate-limit/kosong), otomatis jatuh ke model
 *   satunya sebagai cadangan — supaya request tetap menghasilkan output.
 */
async function requestAIAuto(
    m: AIModel,
    messages: AIHistoryMessage[],
    system?: string,
): Promise<string> {
    const light = getModel(m.route!.light)
    const heavy = getModel(m.route!.heavy)
    const { tier } = estimateComplexity(messages, system)
    const primary = tier === "light" ? light : heavy
    const backup = primary.id === light.id ? heavy : light

    try {
        return await callModel(primary, messages, system)
    } catch (primaryErr) {
        // Failover: coba model cadangan sebelum menyerah.
        try {
            return await callModel(backup, messages, system)
        } catch (backupErr) {
            throw new Error(
                `Smart Route: ${primary.name} gagal (${errorMessage(primaryErr)}), ` +
                    `fallback ${backup.name} juga gagal (${errorMessage(backupErr)}).`,
                { cause: backupErr },
            )
        }
    }
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
}

export async function requestAI(
    m: AIModel,
    messages: AIHistoryMessage[],
    system?: string,
): Promise<string> {
    // Model router diproses khusus sebelum pengecekan apiKey (router sendiri tidak punya key).
    if (m.route) {
        return requestAIAuto(m, messages, system)
    }
    return callModel(m, messages, system)
}