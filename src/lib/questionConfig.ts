/**
 * Konfigurasi per-soal yang belum punya kolom khusus di database.
 *
 * TODO(backend): kolom permanen (mis. `questions.question_config` jsonb)
 * menyusul lewat migration terpisah. Sampai saat itu, konfigurasi disisipkan
 * sementara ke dalam `question_text` sebagai element tersembunyi
 * `<span data-fml-config="...">` supaya tetap bertahan lewat tabel existing
 * dan bisa dibaca kembali oleh editor maupun halaman responden.
 *
 * Element ini kosong (tidak ada konten teks), sehingga tidak mengubah tampilan
 * saat dirender; `richTextToPlain` juga tidak terpengaruh karenanya.
 */

export interface QuestionConfig {
    /** Sub-tipe soal Tanggal & Jam (date_time). Default: date_and_time. */
    dateTimeVariant?: "date_only" | "time_only" | "date_and_time"
    /** Batas ukuran file untuk soal Upload File (MB). Default: 5. */
    fileMaxMB?: number
    /** Array MIME/ekstensi yang diterima untuk soal Upload File. */
    fileTypes?: string[]
}

export const DATE_TIME_VARIANTS = ["date_only", "time_only", "date_and_time"] as const
export type DateTimeVariant = (typeof DATE_TIME_VARIANTS)[number]

/** Batas & tipe bawaan untuk soal upload file (hardcode sementara). */
export const FILE_UPLOAD_DEFAULTS = {
    maxMB: 5,
    types: ["image/*", "application/pdf", ".doc", ".docx"],
} as const

const CONFIG_ATTR = "data-fml-config"

function isDateTimeVariant(v: unknown): v is DateTimeVariant {
    return v === "date_only" || v === "time_only" || v === "date_and_time"
}

/** Ambil konfigurasi tersembunyi dari `question_text` dan kembalikan teks bersihnya. */
export function extractQuestionConfig(
    html: string | null | undefined,
): { html: string; config: QuestionConfig | null } {
    if (!html) return { html: html || "", config: null }
    const doc = new DOMParser().parseFromString(html, "text/html")
    const nodes = Array.from(doc.querySelectorAll(`span[${CONFIG_ATTR}]`))

    let config: QuestionConfig | null = null
    for (const node of nodes) {
        const raw = node.getAttribute(CONFIG_ATTR)
        if (!raw) continue
        try {
            const parsed = JSON.parse(raw) as { config?: QuestionConfig } | null
            const c = parsed?.config
            if (!c) continue
            if (isDateTimeVariant(c.dateTimeVariant)) {
                config = { ...(config || {}), dateTimeVariant: c.dateTimeVariant }
            }
            if (typeof c.fileMaxMB === "number" && c.fileMaxMB > 0) {
                config = { ...(config || {}), fileMaxMB: c.fileMaxMB }
            }
            if (Array.isArray(c.fileTypes) && c.fileTypes.length > 0) {
                config = { ...(config || {}), fileTypes: c.fileTypes }
            }
        } catch {
            // Abaikan elemen config yang korup.
        }
        node.remove()
    }

    return { html: doc.body.innerHTML || "", config }
}

/** Sisipkan konfigurasi ke dalam `question_text` sebagai element tersembunyi. */
export function embedQuestionConfig(html: string, config: QuestionConfig | null | undefined): string {
    if (!config || (!config.dateTimeVariant && !config.fileMaxMB && !config.fileTypes)) return html
    const encoded = escapeHtmlAttr(JSON.stringify({ config }))
    return `${html}\n<span ${CONFIG_ATTR}="${encoded}"></span>`
}

function escapeHtmlAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}