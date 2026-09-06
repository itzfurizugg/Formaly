// ============================================================
// Daftar model AI yang tersedia untuk Galileo.
//
// Setiap entri menyimpan konfigurasi provider: nama tampilan,
// identifier model untuk request, base URL + key endpoint, dan
// API key-nya. UI chat (chat.tsx) mengambil daftar ini untuk
// dropdown pemilih model dan panggilan request ke API.
//
// CATATAN KEAMANAN: API key sebaiknya TIDAK disimpan mentah di
// bundle frontend untuk produksi — arahkan ke proxy/edge function
// milik sendiri. Struktur ini dibuat supaya generator/proxy bisa
// dibangun tanpa mengubah bentuk data.
// ============================================================

export interface AIModel {
    id: string
    name: string
    provider: "OpenAI" | "Google" | "Anthropic" | "Custom"
    /** Identifier model yang dikirim ke API (mis. "gpt-4o-mini"). */
    model: string
    /** Base URL endpoint API (boleh tanpa slash di akhir). */
    baseUrl: string
    /** Path request chat/completion di baseUrl. */
    endpoint: string
    /** API key provider. Isi sesuai milikmu. */
    apiKey: string
    description: string
    color: string
}

export const AI_MODELS: AIModel[] = [
    {
        id: "openai",
        name: "OpenAI",
        provider: "OpenAI",
        model: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
        description: "GPT-4o mini · cepat & hemat untuk percakapan umum.",
        color: "#10A37F",
    },
    {
        id: "gemini",
        name: "Gemini",
        provider: "Google",
        model: "gemini-3.6-flash",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        endpoint: "/models/gemini-3.6-flash:generateContent",
        apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? "",
        description: "Gemini 2.0 Flash · multimodal & berbahasa Indonesia baik.",
        color: "#4285F4",
    },
    {
        id: "claude",
        name: "Claude",
        provider: "Anthropic",
        model: "claude-3-5-haiku-latest",
        baseUrl: "https://api.anthropic.com/v1",
        endpoint: "/messages",
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
        description: "Claude 3.5 Haiku · responsif dengan gaya natural.",
        color: "#D97757",
    },
    {
        id: "custom",
        name: "Custom (proxy sendiri)",
        provider: "Custom",
        model: "",
        baseUrl: "http://localhost:3000",
        endpoint: "/galileo/chat",
        apiKey: import.meta.env.VITE_CUSTOM_API_KEY ?? "",
        description: "Endpoint internal — isi baseUrl & key sesuai backendmu.",
        color: "#929AAB",
    },
]

/** Model default yang dipakai saat halaman dibuka. */
export const DEFAULT_MODEL_ID = AI_MODELS[0].id

export function getModel(id: string): AIModel {
    return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0]
}