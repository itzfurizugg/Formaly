import { useEffect, useMemo, useRef, useState } from "react"
import ReactQuill from "react-quill-new"
import type Quill from "quill"
import "react-quill-new/dist/quill.snow.css"
import katex from "katex"
import "katex/dist/katex.min.css"
import { sanitizeRichText, inlineRichText } from "../lib/richtext"
import { promptText } from "../lib/alerts"
import { enhanceVideoIframes } from "../lib/videoGui"

// Quill v2 module "formula" membutuhkan KaTeX pada window.
;(window as unknown as { katex: typeof katex }).katex = katex

/** Merender teks kaya (rich text) hasil sanitasi, tanpa editor. */
function RichText({ html, as = "div", className = "" }: { html?: string | null; as?: "div" | "p" | "span"; className?: string }) {
    // Memoize objek dangerouslySetInnerHTML: React membandingkan prop tsb by-reference,
    // jadi objek baru tiap render akan me-RE-APPLY innerHTML (iframe video ikut ke-reload).
    const inner = useMemo(
        () => (html ? { __html: as === "span" ? inlineRichText(html) : sanitizeRichText(html) } : null),
        [html, as]
    )
    const ref = useRef<HTMLElement>(null)

    // Tingkatkan iframe video YouTube menjadi player dengan GUI auto-hide.
    // Dijalankan setelah innerHTML diterapkan; dibersihkan saat konten berganti.
    useEffect(() => {
        if (!inner || !ref.current) return
        const enhancer = enhanceVideoIframes(ref.current)
        return () => enhancer.destroy()
    }, [inner])

    if (!inner) return null
    const Tag = as
    return <Tag ref={ref as React.Ref<HTMLDivElement>} className={`rich-content ${className}`} dangerouslySetInnerHTML={inner} />
}

const fullFormats = ["bold", "italic", "underline", "strike", "list", "link", "formula", "video", "code-block"]
const compactFormats = ["bold", "italic", "underline", "link"]

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    compact?: boolean
}

/**
 * Editor WYSIWYG yang hanya menampilkan toolbar saat field sedang aktif (digunakan).
 * Saat tidak aktif, tampil sebagai teks kaya polos / placeholder.
 */
function RichTextEditor({ value, onChange, placeholder, className = "", compact = false }: RichTextEditorProps) {
    const [active, setActive] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const quillRef = useRef<ReactQuill | null>(null)

    const modules = useMemo(
        () => ({
            toolbar: compact
                ? [["bold", "italic", "underline", "link", "clean"]]
                : {
                    container: [
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["code-block"],
                        ["link", "video", "formula", "clean"],
                    ],
                    handlers: {
                        link: function () {
                            const quill = (this as unknown as { quill: Quill }).quill
                            const range = quill.getSelection(true)
                            // Ada teks terseleksi → pakai tooltip default Quill (yang kini ditengah).
                            if (range && range.length > 0) {
                                ;(quill.theme as unknown as { tooltip: { edit: (mode: string) => void } }).tooltip.edit("link")
                                return
                            }
                            // Tanpa seleksi, tooltip Quill tidak muncul → dialog input sendiri (promptText).
                            promptText({
                                title: "Masukkan URL Link",
                                description: "URL akan disisipkan sebagai teks ber-link di posisi kursor.",
                                placeholder: "https://...",
                                confirmLabel: "Sisipkan",
                            }).then((url) => {
                                if (!url || !url.trim()) return
                                const index = range ? range.index : quill.getLength()
                                quill.insertText(index, url.trim(), { link: url.trim() }, "user")
                            })
                        },
                    },
                },
        }),
        [compact]
    )
    const formats = useMemo(() => (compact ? compactFormats : fullFormats), [compact])

    useEffect(() => {
        if (active) {
            const t = window.setTimeout(() => {
                try {
                    quillRef.current?.getEditor()?.focus()
                } catch {
                    // editor belum ter-instantiate; abaikan
                }
            }, 0)
            return () => window.clearTimeout(t)
        }
    }, [active])

    const handleFocus = (e: React.FocusEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setActive(true)
    }

    // Nonaktifkan editor hanya saat pengguna berinteraksi DI LUAR editor (pointer).
    // Pakai pointerdown (bukan onBlur) karena onBlur bisa memicu deaktivasi saat
    // mengklik tombol tooltip Quill (formula/link) yang elemennya non-focusable,
    // sehingga insert baru gagal.
    useEffect(() => {
        if (!active) return
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null
            if (!target) return
            if (wrapperRef.current?.contains(target)) return
            if (target.closest(".ql-tooltip, .ql-picker, .formaly-dialog")) return
            setActive(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        return () => document.removeEventListener("pointerdown", onPointerDown)
    }, [active])

    return (
        <div
            ref={wrapperRef}
            onFocus={handleFocus}
            className={`${active ? "rich-editor" : "rich-preview-wrap"} ${compact ? "rich-editor-compact" : ""} ${className}`}
        >
            {active ? (
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    useSemanticHTML={false}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                />
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActive(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setActive(true)
                        }
                    }}
                    className={`rich-preview min-h-[44px] cursor-text border rounded-lg px-3 py-2 text-darks shadow-sm transition-all hover:border-done/50 ${
                        value && sanitizeRichText(value).trim() ? "bg-white border-second" : "bg-base border-second text-tinted hover:shadow-md"
                    }`}
                >
                    {value && sanitizeRichText(value).trim() ? (
                        <RichText html={value} />
                    ) : (
                        <span className="text-tinted">{placeholder}</span>
                    )}
                </div>
            )}
        </div>
    )
}

export default RichTextEditor

export { RichTextEditor, RichText }