import DOMPurify from "dompurify"
import katex from "katex"

// ── LaTeX tokenization ───────────────────────────────────────────────

const DISPLAY_PREFIX = "\\displaystyle "
export const toBlockLatex = (latex: string) => DISPLAY_PREFIX + latex
export const fromBlockLatex = (latex: string) => latex.replace(/^\\displaystyle\s+/, "")

export interface LatexToken {
    type: "text" | "formula"
    value: string
    block?: boolean
}

/**
 * Tokenisasi string menjadi bagian teks biasa dan formula LaTeX.
 * Mendeteksi $$...$$, \[...\], \(...\), $...$, dan raw LaTeX murni.
 */
export function tokenizeLatex(text: string): LatexToken[] {
    if (!text) return []

    const regex = /(\$\$(?:[\s\S]+?)\$\$|\\\[(?:[\s\S]+?)\\\]|\\\((?:[\s\S]+?)\\\)|(?<!\$)\$(?:[^\s\$](?:[\s\S]*?[^\s\$])?)\$(?!\$))/g
    const tokens: LatexToken[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) tokens.push({ type: "text", value: text.slice(lastIndex, match.index) })
        const raw = match[0]
        let tex = ""
        let block = false
        if (raw.startsWith("$$") && raw.endsWith("$$")) { tex = raw.slice(2, -2).trim(); block = true }
        else if (raw.startsWith("\\[") && raw.endsWith("\\]")) { tex = raw.slice(2, -2).trim(); block = true }
        else if (raw.startsWith("\\(") && raw.endsWith("\\)")) { tex = raw.slice(2, -2).trim() }
        else if (raw.startsWith("$") && raw.endsWith("$")) { tex = raw.slice(1, -1).trim() }

        let isValid = false
        if (tex) { try { katex.renderToString(tex, { throwOnError: true }); isValid = true } catch { /* invalid */ } }
        tokens.push(isValid ? { type: "formula", value: tex, block } : { type: "text", value: raw })
        lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) tokens.push({ type: "text", value: text.slice(lastIndex) })

    // Jika SELURUH teks adalah perintah LaTeX murni tanpa delimiter.
    // Amankan: hanya saat teks dimulai backslash (\\frac) ATAU tanpa spasi
    // (x^2+y^2) supaya kalimat biasa seperti "Hitung \\frac{1}{2}" tidak ikut
    // berubah menjadi satu formula utuh.
    if (tokens.length === 1 && tokens[0].type === "text") {
        const raw = tokens[0].value.trim()
        const looksPure = raw.startsWith("\\") || !/\s/.test(raw)
        if (looksPure && /\\[a-zA-Z]+|[\^_=<>+*/]/.test(raw)) {
            try {
                katex.renderToString(raw, { throwOnError: true })
                return [{ type: "formula", value: raw, block: raw.includes("\n") || /\\begin\{/.test(raw) }]
            } catch { /* bukan LaTeX valid */ }
        }
    }

    return tokens
}

// ── HTML sanitization & rendering ─────────────────────────────────────

const escapeHtmlText = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * Konversi code fence markdown (``` lang ... ```) di dalam HTML menjadi
 * <pre class="ql-syntax">. Digunakan agar kode hasil AI / hasil import yang
 * masih berupa teks backtick tiga tampil sebagai blok kode (WYSIWYG).
 *
 * Menangani dua bentuk:
 *  1. Teks polos dengan newline (`\n`) — kasus utama dari AI.
 *  2. HTML blok per-baris (<p>...</p>) — kasus hasil editor Quill.
 */
export function convertCodeBlocksInHtml(html: string): string {
    const value = (html || "").trim()
    if (!value || !value.includes("```")) return html

    const hasBlockTag = /<(p|div|br|ul|ol|li|h[1-6]|blockquote|pre|tr|td)[\s>/]/i.test(value)

    // ── Kasus 1: teks polos / tanpa tag blok ──
    if (!hasBlockTag) {
        const lines = value.replace(/\r\n?/g, "\n").split("\n")
        const out: string[] = []
        let i = 0
        let changed = false
        while (i < lines.length) {
            const fence = lines[i].match(/^```([\w-]+)?\s*$/)
            if (fence) {
                const lang = fence[1] || "plain"
                const code: string[] = []
                let j = i + 1
                let closed = false
                while (j < lines.length) {
                    if (/^```\s*$/.test(lines[j])) { closed = true; break }
                    code.push(lines[j])
                    j++
                }
                if (closed) {
                    out.push(`<pre class="ql-syntax" data-language="${lang}" spellcheck="false">\n${escapeHtmlText(code.join("\n"))}\n</pre>`)
                    changed = true
                    i = j + 1
                    continue
                }
            }
            out.push(lines[i])
            i++
        }
        if (!changed) return html
        // Terapkan <br> di luar segmen kode agar baris teks biasa tidak menyatu.
        let result = ""
        let textBuf: string[] = []
        const flushText = () => {
            if (textBuf.length) { result += textBuf.join("<br>"); textBuf = [] }
        }
        for (const part of out) {
            if (part.startsWith("<pre")) { flushText(); result += part }
            else textBuf.push(part)
        }
        flushText()
        return result
    }

    // ── Kasus 2: HTML blok per-baris ──
    const doc = new DOMParser().parseFromString(value, "text/html")
    const body = doc.body

    // Ambil daftar garis blok (elemen blok langsung di body), lalu ganti rangkaian
    // fence (baris pembuka ``` ... baris penutup ```) dengan <pre>.
    const blocks = Array.from(body.children) as HTMLElement[]
    const isFence = (el: HTMLElement) => /^```/.test((el.textContent || "").trim())

    let changed = false
    for (let i = 0; i < blocks.length; i++) {
        if (!isFence(blocks[i])) continue
        // cari penutup
        let j = i + 1
        let closedIdx = -1
        while (j < blocks.length) {
            if (isFence(blocks[j])) { closedIdx = j; break }
            j++
        }
        if (closedIdx === -1) continue

        const openText = (blocks[i].textContent || "").trim()
        const lang = (openText.match(/^```([\w-]+)?/) || [null, "plain"])[1] || "plain"
        const codeLines: string[] = []
        for (let k = i + 1; k < closedIdx; k++) {
            codeLines.push(blocks[k].textContent ?? "")
        }

        const pre = doc.createElement("pre")
        pre.className = "ql-syntax"
        pre.setAttribute("data-language", lang)
        pre.setAttribute("spellcheck", "false")
        pre.textContent = codeLines.join("\n")

        blocks[i].replaceWith(pre)
        for (let k = i + 1; k <= closedIdx; k++) blocks[k].remove()
        changed = true
        i = closedIdx - i // lanjut setelah range fence
    }

    return changed ? doc.body.innerHTML : html
}

/** Bersihkan string HTML agar aman untuk dirender lewat dangerouslySetInnerHTML. */
export function sanitizeRichText(html: string): string {
    let value = html

    // Ubah code fence markdown (``` ... ```) jadi <pre> terlebih dahulu agar
    // kode hasil AI / import tampil sebagai blok kode, bukan teks backtick.
    value = convertCodeBlocksInHtml(value)

    const hasBlockTag = /<(p|div|br|ul|ol|li|h[1-6]|blockquote|pre|table|tr|td)[\s>/]/i.test(value)
    if (!hasBlockTag && value.includes("\n")) {
        value = value.replace(/\r\n/g, "\n").replace(/\n/g, "<br>")
    }

    value = normalizeCodeBlocks(value)

    const clean = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a", "h1", "h2", "h3", "h4", "h5", "blockquote", "code", "pre", "span", "iframe"],
        ALLOWED_ATTR: ["href", "target", "rel", "class", "data-value", "data-list", "src", "frameborder", "allowfullscreen"],
    })

    return renderFormula(convertLatexInHtml(clean))
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
 *
 * Mode tampilan ditentukan oleh penanda LaTeX:
 *  - diawali `\displaystyle`  → mode DISPLAY (baris sendiri, rata tengah)
 *  - selain itu               → mode INLINE (menempel di dalam kalimat)
 */
function renderFormula(html: string): string {
    if (!/<span[^>]*class="[^"]*\bql-formula\b[^"]*"[^>]*>/i.test(html)) return html
    const doc = new DOMParser().parseFromString(html, "text/html")
    doc.querySelectorAll<HTMLElement>("span.ql-formula").forEach((el) => {
        const dataValue = el.getAttribute("data-value")
        if (dataValue == null) return
        const display = /^\\displaystyle\s*/.test(dataValue)
        const out = document.createElement("span")
        out.innerHTML = katex.renderToString(dataValue, {
            throwOnError: false,
            displayMode: display,
        })
        el.replaceWith(out)
    })
    return doc.body.innerHTML
}

/**
 * Konversi penanda LaTeX mentah ($...$, $$...$$, dll) di dalam HTML
 * menjadi elemen <span class="ql-formula" data-value="..."> untuk WYSIWYG.
 * Menggunakan DOMParser agar bekerja dengan benar meski konten dibungkus tag HTML.
 * Dipanggil SETELAH DOMPurify (agar span & data-value survive sanitasi).
 */
export function convertLatexInHtml(html: string): string {
    if (!html || (!html.includes("$") && !html.includes("\\(") && !html.includes("\\["))) return html

    const doc = DOMParser ? new DOMParser().parseFromString(html, "text/html") : null
    if (!doc) return html

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    let current: Node | null
    while ((current = walker.nextNode())) {
        const parent = current.parentElement
        if (parent && /^(code|pre)$/i.test(parent.tagName)) continue
        if (parent?.closest(".ql-formula")) continue
        textNodes.push(current as Text)
    }

    let modified = false
    for (const node of textNodes) {
        const text = node.textContent || ""
        const tokens = tokenizeLatex(text)
        if (tokens.every((t) => t.type === "text")) continue

        modified = true
        const frag = doc.createDocumentFragment()
        for (const tok of tokens) {
            if (tok.type === "text") {
                frag.appendChild(doc.createTextNode(tok.value))
            } else {
                const span = doc.createElement("span")
                span.className = "ql-formula"
                span.setAttribute("data-value", tok.block ? toBlockLatex(tok.value) : tok.value)
                frag.appendChild(span)
            }
        }
        node.replaceWith(frag)
    }

    return modified ? doc.body.innerHTML : html
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
