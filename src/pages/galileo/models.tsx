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
// sewaktu-waktu tanpa pemberitahuan — termasuk yang baru aja
// terjadi ke minimax-m3:free (sekarang cuma versi berbayar).
// SEBELUM masukin model baru ke daftar ini, tes dulu manual pakai
// curl (lihat riwayat chat) supaya nggak kena kejutan pas udah
// dipasang di UI. Cek ulang ketersediaan berkala di
// https://openrouter.ai/models?fmt=cards&max_price=0
//
// CATATAN KECEPATAN: Model dengan parameter aktif besar (mis.
// Nemotron 3 Ultra, 55B aktif) cenderung lebih lambat di tier
// gratis dibanding model dengan parameter aktif lebih kecil
// (mis. Nemotron 3 Super, 12B aktif) — meski total parameternya
// lebih kecil dari Ultra, MoE dengan active param rendah biasanya
// jauh lebih responsif buat kebutuhan generate cepat.
//
// CATATAN PENTING: Sebagian model :free dibatasi provider-nya
// hanya bisa dipakai lewat "agentic harness" terdaftar (Cline,
// Cursor, dst — lihat openrouter.ai/apps), BUKAN lewat API call
// polos seperti yang dipakai Galileo. Kalau muncul error
// "only available on agentic harnesses", keluarkan model itu
// dari daftar di bawah — jangan dipaksakan. Model dengan tag
// "Reasoning" (mis. Inkling) juga cenderung boros token buat
// "mikir" dulu sebelum jawab — kurang cocok buat generate JSON
// cepat kayak di Galileo.
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
        id: "nemotron-super",
        name: "Nemotron 3 Super",
        provider: "OpenRouter",
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        baseUrl: "https://openrouter.ai/api/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
        description: "Nemotron 3 Super (free) · 12B parameter aktif, jauh lebih cepat dari Nemotron Ultra.",
        color: "#76B900",
    },
    {
        id: "minimax",
        name: "MiniMax M2.7",
        provider: "OpenRouter",
        model: "minimax/minimax-m2.7:free",
        baseUrl: "https://openrouter.ai/api/v1",
        endpoint: "/chat/completions",
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
        description: "MiniMax M2.7 (free) · alternatif kalau Nemotron Super kurang cocok.",
        color: "#FF4D4F",
    },
    {
        id: "gemini",
        name: "Gemini",
        provider: "Google",
        model: "gemini-3.6-flash",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        endpoint: "/models/gemini-3.6-flash:generateContent",
        apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? "",
        description: "Gemini 3.6 Flash · multimodal, konteks besar & berbahasa Indonesia baik (limit lebih ketat).",
        color: "#4285F4",
    },
    // {
    //     id: "nemotron-ultra",
    //     name: "Nemotron 3 Ultra",
    //     provider: "OpenRouter",
    //     model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    //     baseUrl: "https://openrouter.ai/api/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
    //     description: "TERLALU LAMBAT di tier gratis (55B parameter aktif) — disimpan sebagai cadangan kalau perlu kualitas maksimal & nggak buru-buru.",
    //     color: "#76B900",
    // },
    // {
    //     id: "minimax-m3",
    //     name: "MiniMax M3",
    //     provider: "OpenRouter",
    //     model: "minimax/minimax-m3:free",
    //     baseUrl: "https://openrouter.ai/api/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
    //     description: "SUDAH TIDAK GRATIS (per cek terakhir) — jangan diaktifkan lagi tanpa verifikasi ulang.",
    //     color: "#FF4D4F",
    // },
    // {
    //     id: "nemotron",
    //     name: "Nemotron Lightning",
    //     provider: "OpenRouter",
    //     model: "nvidia/nemotron-3.5-lightning:free",
    //     baseUrl: "https://openrouter.ai/api/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
    //     description: "Nemotron 3.5 Lightning (free) · kualitas rendah untuk soal kompleks, disimpan sebagai cadangan.",
    //     color: "#76B900",
    // },
    // {
    //     id: "laguna",
    //     name: "Laguna S 2.1",
    //     provider: "OpenRouter",
    //     model: "poolside/laguna-s-2.1:free",
    //     baseUrl: "https://openrouter.ai/api/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
    //     description: "Laguna S 2.1 (Poolside, free) · fokus coding-agent, output terstruktur lebih presisi.",
    //     color: "#00A8E8",
    // },
    // {
    //     id: "lfm",
    //     name: "LFM 2.5",
    //     provider: "OpenRouter",
    //     model: "liquid/lfm-2.5-2.6b:free",
    //     baseUrl: "https://openrouter.ai/api/v1",
    //     endpoint: "/chat/completions",
    //     apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? "",
    //     description: "LFM2.5-2.6B (Liquid AI, free) · ringan & cepat, cocok untuk soal-soal sederhana.",
    //     color: "#FF6B6B",
    // },
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