import DOMPurify from "dompurify"
import katex from "katex"

/** Bersihkan string HTML agar aman untuk dirender lewat dangerouslySetInnerHTML. */
export function sanitizeRichText(html: string): string {
    let value = html

    // Jika konten berupa teks polos (belum ada tag HTML), ubah newline jadi <br>
    // supaya hasil akhir tidak menggabungkan baris menjadi satu.
    const hasBlockTag = /<(p|div|br|ul|ol|li|h[1-6]|blockquote|pre|table|tr|td)[\s>/]/i.test(value)
    if (!hasBlockTag && value.includes("\n")) {
        value = value.replace(/\r\n/g, "\n").replace(/\n/g, "<br>")
    }

    value = normalizeCodeBlocks(value)

    const clean = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a", "h1", "h2", "h3", "h4", "h5", "blockquote", "code", "pre", "span", "iframe"],
        ALLOWED_ATTR: ["href", "target", "rel", "class", "data-value", "data-list", "src", "frameborder", "allowfullscreen"],
    })

    return renderFormula(clean)
}

/**
 * Ubah markup code-block Quill
 * `<div class="ql-code-block-container"><div class="ql-code-block">...</div>...</div>`
 * menjadi `<pre class="ql-syntax">` agar dirender sama seperti di editor.
 */
function normalizeCodeBlocks(html: string): string {
    if (!/<div class="ql-code-block-container"/i.test(html)) return html
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc.querySelectorAll<HTMLElement>(".ql-code-block-container").forEach((container) => {
        const lines: string[] = []
        container.querySelectorAll<HTMLElement>(".ql-code-block").forEach((block) => {
            lines.push(block.textContent ?? "")
        })
        const pre = document.createElement("pre")
        pre.className = "ql-syntax"
        pre.textContent = lines.join("\n")
        container.replaceWith(pre)
    })
    return doc.body.innerHTML
}

/**
 * Render rumus KaTeX yang disimpan Quill sebagai
 * `<span class="ql-formula" data-value="...">...</span>` menjadi HTML KaTeX.
 */
function renderFormula(html: string): string {
    if (!/<span[^>]*class="[^"]*\bql-formula\b[^"]*"[^>]*>/i.test(html)) return html
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc.querySelectorAll<HTMLElement>("span.ql-formula").forEach((el) => {
        const dataValue = el.getAttribute("data-value")
        if (dataValue == null) return
        const out = document.createElement("span")
        out.innerHTML = katex.renderToString(dataValue, { throwOnError: false })
        el.replaceWith(out)
    })
    return doc.body.innerHTML
}

/** Ubah HTML menjadi teks polos (untuk pencarian, export, judul file, dll). */
export function richTextToPlain(html: string): string {
    const div = document.createElement("div")
    div.innerHTML = html
    return div.textContent || ""
}

/**
 * Demote semua iframe embed menjadi teks URL biasa (bukan link, tidak bisa
 * diklik). Dipakai di tampilan ringkas (kartu daftar form, preview 2 baris)
 * supaya player video tidak meledak memenuhi kartu — cukup tampilkan URL-nya.
 */
export function embedsToText(html: string): string {
    if (!/<iframe[\s>]/i.test(html)) return html
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc.querySelectorAll("iframe").forEach((el) => {
        const src = el.getAttribute("src") || ""
        const span = document.createElement("span")
        span.textContent = src || "Lampiran media"
        el.replaceWith(span)
    })
    return doc.body.innerHTML
}

/** Cek apakah konten memakai format kaya selain teks polos (bold, list, heading, link, dll). */
export function hasRichFormatting(html: string | null | undefined): boolean {
    if (!html) return false
    if (/(\r?\n){2,}/.test(html)) return true
    return /<(h[1-6]|strong|b|em|i|u|s|ol|ul|li|a|blockquote|pre|code)[\s>/]/i.test(html)
}

/** Cek apakah konten kaya hanya berisi tag blok untuk kepentingan inline rendering. */
export function hasBlockTag(html: string): boolean {
    return /<(p|div|br|ul|ol|li|h[1-6]|blockquote|pre|table)[\s>/]/i.test(html)
}

/**
 * Ubah HTML menjadi versi inline (untuk dirender di dalam <span>/tombol).
 * Tag blok (p, div, li, heading) diubah jadi span supaya tidak merusak layout.
 */
export function inlineRichText(html: string): string {
    const clean = sanitizeRichText(html)
    return clean
        .replace(/<\/?(p|div|li|h[1-6]|blockquote|pre)(?:\s[^>]*)?>/gi, (tag) => {
            return tag.startsWith("</") ? "</span>" : "<span>"
        })
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/?(ul|ol)(?:\s[^>]*)?>/gi, "")
}
