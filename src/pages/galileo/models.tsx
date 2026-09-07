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
//
// CATATAN MODEL: Model :free di OpenRouter bisa berubah/dicabut
// sewaktu-waktu tanpa pemberitahuan. Cek ulang ketersediaannya
// berkala di https://openrouter.ai/models?fmt=cards&max_price=0
//
// CATATAN PENTING: Sebagian model :free dibatasi provider-nya
// hanya bisa dipakai lewat "agentic harness" terdaftar (Cline,
// Cursor, dst — lihat openrouter.ai/apps), BUKAN lewat API call
// polos seperti yang dipakai Galileo. Kalau muncul error
// "only available on agentic harnesses", keluarkan model itu
// dari daftar di bawah — jangan dipaksakan.
// ============================================================

export interface AIModel {
    id: string
    name: string
    provider: "OpenAI" | "Google" | "Anthropic" | "Custom" | "OpenRouter"
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
    // {
    //     id: "openai",
    //     name: "OpenAI",
    //     provider: "OpenAI",
    //     model: "gpt-4o-mini",
    //     baseUrl: "https://api.openai.com/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
    //     description: "GPT-4o mini · cepat & hemat untuk percakapan umum.",
    //     color: "#10A37F",
    // },
    {
        id: "nemotron",
        name: "Nemotron",
        provider: "OpenRouter",
        model: "nvidia/nemotron-3.5-lightning:free",
        baseUrl: "https://openrouter.ai/api/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
        description: "Nemotron 3.5 Lightning (NVIDIA, free) · cepat & default, konteks 1M token.",
        color: "#76B900",
    },
    {
        id: "laguna",
        name: "Laguna S 2.1",
        provider: "OpenRouter",
        model: "poolside/laguna-s-2.1:free",
        baseUrl: "https://openrouter.ai/api/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
        description: "Laguna S 2.1 (Poolside, free) · fokus coding-agent, output terstruktur lebih presisi.",
        color: "#00A8E8",
    },
    {
        id: "lfm",
        name: "LFM 2.5",
        provider: "OpenRouter",
        model: "liquid/lfm-2.5-2.6b:free",
        baseUrl: "https://openrouter.ai/api/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
        description: "LFM2.5-2.6B (Liquid AI, free) · ringan & cepat, cocok untuk soal-soal sederhana.",
        color: "#FF6B6B",
    },
    // {
    //     id: "claude",
    //     name: "Claude",
    //     provider: "Anthropic",
    //     model: "claude-3-5-haiku-latest",
    //     baseUrl: "https://api.anthropic.com/v1",
    //     endpoint: "/messages",
    //     apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
    //     description: "Claude 3.5 Haiku · responsif dengan gaya natural.",
    //     color: "#D97757",
    // },
    // {
    //     id: "custom",
    //     name: "Custom (proxy sendiri)",
    //     provider: "Custom",
    //     model: "",
    //     baseUrl: "http://localhost:3000",
    //     endpoint: "/galileo/chat",
    //     apiKey: import.meta.env.VITE_CUSTOM_API_KEY ?? "",
    //     description: "Endpoint internal — isi baseUrl & key sesuai backendmu.",
    //     color: "#929AAB",
    // },
]

/** Model default yang dipakai saat halaman dibuka. */
export const DEFAULT_MODEL_ID = AI_MODELS[0].id

export function getModel(id: string): AIModel {
    return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0]
}