import type { AIModel } from "../pages/galileo/models"

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
                parts: [{ text: h.content }],
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

export async function requestAI(
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
            case "Google":
                return await callGemini(m, messages, system, controller.signal)
            case "Anthropic":
                return await callClaude(m, messages, system, controller.signal)
            case "Custom":
                return await callCustom(m, messages, system, controller.signal)
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