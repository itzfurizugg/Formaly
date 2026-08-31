import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ReactQuill from "react-quill-new"
import type Quill from "quill"
import { Delta } from "quill"
import "react-quill-new/dist/quill.snow.css"
import katex from "katex"
import "katex/dist/katex.min.css"
import { motion, AnimatePresence } from "motion/react"
import { Sigma, Link2, X, SquareFunction, Braces } from "lucide-react"
import { sanitizeRichText, inlineRichText, embedsToText } from "../lib/richtext"
import { enhanceVideoIframes } from "../lib/videoGui"
import { modalBackdrop, modalPanel } from "../lib/motion"

// Quill v2 module "formula" membutuhkan KaTeX pada window.
;(window as unknown as { katex: typeof katex }).katex = katex

/** Merender teks kaya (rich text) hasil sanitasi, tanpa editor.
 * enhanceMedia=false untuk tampilan ringkas (kartu daftar): iframe embed
 * ditampilkan sebagai link biasa, bukan player penuh. */
function RichText({ html, as = "div", className = "", enhanceMedia = true }: { html?: string | null; as?: "div" | "p" | "span"; className?: string; enhanceMedia?: boolean }) {
    // Memoize objek dangerouslySetInnerHTML: React membandingkan prop tsb by-reference,
    // jadi objek baru tiap render akan me-RE-APPLY innerHTML (iframe video ikut ke-reload).
    const inner = useMemo(
        () => {
            if (!html) return null
            let clean = as === "span" ? inlineRichText(html) : sanitizeRichText(html)
            if (!enhanceMedia) clean = embedsToText(clean)
            return { __html: clean }
        },
        [html, as, enhanceMedia]
    )
    const ref = useRef<HTMLElement>(null)

    // Tingkatkan iframe video YouTube menjadi player dengan GUI auto-hide.
    // Dijalankan setelah innerHTML diterapkan; dibersihkan saat konten berganti.
    useEffect(() => {
        if (!enhanceMedia || !inner || !ref.current) return
        const enhancer = enhanceVideoIframes(ref.current)
        return () => enhancer.destroy()
    }, [inner, enhanceMedia])

    if (!inner) return null
    const Tag = as
    return <Tag ref={ref as React.Ref<HTMLDivElement>} className={`rich-content ${className}`} dangerouslySetInnerHTML={inner} />
}

// "header" dipertahankan di daftar format (kompatibilitas konten tersimpan & hasil
// paste), tetapi KONTROL heading (H1..H5) sudah DIHAPUS dari toolbar editor.
const fullFormats = ["header", "bold", "italic", "underline", "strike", "list", "link", "formula", "video", "code-block"]
const compactFormats = ["bold", "italic", "underline", "link"]

interface LaTeXTemplate {
    id: string
    label: string
    tex: string
    block: boolean
}

// Kumpulan template LaTeX siap pakai untuk soal matematika/rumus.
const LATEX_TEMPLATES: LaTeXTemplate[] = [
    { id: "frac", label: "Pecahan", tex: "\\frac{a}{b}", block: true },
    { id: "sqrt", label: "Akar", tex: "\\sqrt{x}", block: true },
    { id: "power", label: "Pangkat", tex: "x^{n}", block: false },
    { id: "sub", label: "Subskrip", tex: "x_{1}", block: false },
    { id: "int", label: "Integral", tex: "\\int_{a}^{b} f(x)\\,dx", block: true },
    { id: "sum", label: "Penjumlahan (Σ)", tex: "\\sum_{i=1}^{n} x_i", block: true },
    { id: "matrix", label: "Matriks", tex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", block: true },
    { id: "limit", label: "Limit", tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x}", block: true },
]

// Beberapa template sering dipakai; sisanya diklik ke modal untuk disisipkan
// ke input LaTeX (auto-fill), lalu hasilnya dirender sebagai elemen KaTeX.

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    compact?: boolean
}

interface FormulaModalState {
    open: boolean
    /** Delta index di mana formula berada — dipakai untuk RE-EDIT rumus yang sudah ada. */
    index: number | null
    block: boolean
}

function katexPreview(latex: string): string {
    try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true })
    } catch {
        return ""
    }
}

// Rumus block (display) dirender dengan mode display KaTeX agar tampil besar,
// jelas berbeda dari rumus inline. Kita menegaskan lewat perintah LaTeX
// `\displaystyle` yang valid di editor maupun viewer (sanitizeRichText).
const DISPLAY_PREFIX = "\\displaystyle "
const toBlockLatex = (latex: string) => DISPLAY_PREFIX + latex
const fromBlockLatex = (latex: string) => latex.replace(/^\\displaystyle\s+/, "")

/**
 * Editor WYSIWYG yang hanya menampilkan toolbar saat field sedang aktif (digunakan).
 * Saat tidak aktif, tampil sebagai teks kaya polos / placeholder.
 *
 * Fitur:
 *  - Toolbar bersih tanpa opsi ukuran heading.
 *  - Tombol "Sisipkan Rumus (Σ)" membuka MODAL input LaTeX dengan template
 *    siap pakai di bawahnya; rumus dirender sebagai elemen visual (KaTeX).
 *  - Rumus yang sudah ada bisa diklik untuk RE-EDIT LaTeX-nya lewat modal sama.
 *  - Semua input yang butuh dialog tambahan (insert link) memakai modal,
 *    bukan popup/bubble bawaan Quill.
 */
function RichTextEditor({ value, onChange, placeholder, className = "", compact = false }: RichTextEditorProps) {
    const [active, setActive] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const quillRef = useRef<ReactQuill | null>(null)
    const [formulaModal, setFormulaModal] = useState<FormulaModalState>({ open: false, index: null, block: false })
    const [formulaLatex, setFormulaLatex] = useState("")
    const [linkModalOpen, setLinkModalOpen] = useState(false)
    const [linkText, setLinkText] = useState("")
    const [linkUrl, setLinkUrl] = useState("")
    const [linkTarget, setLinkTarget] = useState("")
    // Simpan rentang seleksi saat modal link dibuka: fokus berpindah ke modal,
    // jadi seleksi asli di editor harus disimpan agar commit tetap menimpa area
    // yang benar (bukan posisi kursor setelah fokus hilang).
    const linkRangeRef = useRef<{ index: number; length: number } | null>(null)

    const getEditor = (): Quill | null => {
        try {
            return quillRef.current?.getEditor() ?? null
        } catch {
            return null
        }
    }

    const openFormulaModal = (index: number | null, block: boolean) => {
        setFormulaLatex("")
        setFormulaModal({ open: true, index, block })
    }

    // Toolbar Quill: tanpa heading, tombol link memakai handler modal, plus
    // kolom custom (formula) disisipkan manual setelah toolbar ter-render.
    const modules = useMemo(
        () => ({
            toolbar: compact
                ? [["bold", "italic", "underline", "link", "clean"]]
                : {
                    container: [
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link", "video"],
                        ["code-block"],
                        ["clean"],
                    ],
                    handlers: {
                        link: function () {
                            const quill = (this as unknown as { quill: Quill }).quill
                            const range = quill.getSelection(true)
                            const hasSelection = range && range.length > 0
                            // Simpan seleksi agar commit memakai area yang benar.
                            linkRangeRef.current = range ? { index: range.index, length: range.length } : { index: quill.getLength(), length: 0 }
                            const existingUrl = hasSelection ? "" : (() => {
                                const formats = quill.getFormat(range ? range.index : 0, range ? range.length : 0)
                                return typeof formats.link === "string" ? formats.link : ""
                            })()
                            const existingText = hasSelection
                                ? quill.getText(range.index, range.length)
                                : ""
                            setLinkUrl(existingUrl)
                            setLinkText(existingText)
                            setLinkTarget(existingUrl ? "new" : "")
                            setLinkModalOpen(true)
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

    // Sisipkan tombol "Sisipkan Rumus (Σ)" ke dalam toolbar Quill setelah editor aktif.
    useEffect(() => {
        if (!active) return
        let cancelled = false
        const t = window.setTimeout(() => {
            if (cancelled) return
            const quill = quillRef.current?.getEditor()
            if (!quill) return
            const toolbarEl = (quill.getModule("toolbar") as { container?: HTMLElement } | undefined)?.container
            if (!toolbarEl) return
            if (toolbarEl.querySelector(".formaly-tex-trigger")) return

            const formats = toolbarEl.querySelector(".ql-formats")?.parentElement || toolbarEl

            const group = document.createElement("span")
            group.className = "ql-formats"

            const btn = document.createElement("button")
            btn.type = "button"
            btn.className = "ql-formaly-tex-trigger"
            btn.setAttribute("aria-label", "Sisipkan rumus LaTeX")
            btn.setAttribute("title", "Sisipkan rumus / template LaTeX")
            btn.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>'

            btn.addEventListener("pointerdown", (e) => {
                e.preventDefault()
                e.stopPropagation()
                openFormulaModal(null, false)
            })

            group.appendChild(btn)
            formats.appendChild(group)
        }, 0)
        return () => {
            cancelled = true
            window.clearTimeout(t)
        }
    }, [active])

    // Klik pada rumus (elemen .ql-formula) di dalam editor membuka modal RE-EDIT.
    useEffect(() => {
        if (!active) return
        const editor = wrapperRef.current
        if (!editor) return

        const onClick = (e: MouseEvent) => {
            const target = e.target as Element | null
            const formulaEl = target?.closest<HTMLElement>(".ql-editor span.ql-formula, .ql-editor .ql-formula")
            if (!formulaEl || !wrapperRef.current?.contains(formulaEl)) return

            e.preventDefault()
            e.stopPropagation()

            const quill = getEditor()
            if (!quill) return

            // Cari blot (inline) dari elemen DOM dan indeksnya di dokumen.
            const blot = handleQuillFind(formulaEl)
            let index = 0
            if (blot) {
                try {
                    index = quill.getIndex(blot)
                } catch {
                    index = 0
                }
            }
            const rawLatex = formulaEl.getAttribute("data-value") || ""

            // Deteksi blok: elemen rumus satu-satunya di baris/paragrafnya → display.
            let block = false
            const p = formulaEl.parentElement
            if (p && p.tagName === "P") {
                const text = (p.textContent || "").replace(formulaEl.textContent || "", "").trim()
                const otherChildren = [...p.children].filter((c) => c !== formulaEl)
                block = otherChildren.length === 0 && text === ""
            }

            // Tampilkan LaTeX bersih (tanpa prefiks \displaystyle) untuk diedit ulang.
            setFormulaLatex(fromBlockLatex(rawLatex))
            setFormulaModal({ open: true, index, block })
        }

        editor.addEventListener("click", onClick)
        return () => {
            editor.removeEventListener("click", onClick)
        }
    }, [active])

    const handleFocus = (e: React.FocusEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setActive(true)
    }

    // Nonaktifkan editor hanya saat pengguna berinteraksi DI LUAR editor.
    useEffect(() => {
        if (!active) return
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null
            if (!target) return
            if (wrapperRef.current?.contains(target)) return
            if (target.closest(".ql-tooltip, .ql-picker, .formaly-dialog, .ql-toolbar")) return
            if ((target as HTMLElement).closest?.(".formaly-modal")) return
            setActive(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        return () => document.removeEventListener("pointerdown", onPointerDown)
    }, [active])

    // Penyisipan rumus saat modal submit.
    const commitFormula = () => {
        const latex = formulaLatex.trim()
        if (!latex) return
        const quill = getEditor()
        setFormulaModal((prev) => ({ ...prev, open: false }))
        if (!quill) return

        const index = formulaModal.index
        const block = formulaModal.block
        // Block → dirender besar (display) via \displaystyle supaya jelas beda dgn inline.
        const stored = block ? toBlockLatex(latex) : latex

        if (index !== null && index >= 0) {
            // RE-EDIT: replace formula yang sudah ada di posisi tersebut.
            quill.updateContents(new Delta().retain(index).delete(1).insert({ formula: stored }))
        } else {
            // INSERT baru di posisi kursor.
            const sel = quill.getSelection()
            const insertIndex = sel ? sel.index : quill.getLength()
            if (block) {
                quill.insertText(insertIndex, "\n", "user")
                quill.insertEmbed(insertIndex + 1, "formula", stored, "user")
                quill.insertText(insertIndex + 2, "\n", "user")
                quill.setSelection(insertIndex + 2, 0)
            } else {
                quill.insertEmbed(insertIndex, "formula", latex, "user")
                quill.setSelection(insertIndex + 1, 0)
            }
        }
        setFormulaLatex("")
    }

    const applyTemplate = (tpl: LaTeXTemplate) => {
        setFormulaLatex((prev) => (prev ? `${prev} ${tpl.tex}` : tpl.tex))
        setFormulaModal((prev) => ({ ...prev, block: tpl.block }))
    }

    const commitLink = () => {
        const url = linkUrl.trim()
        const quill = getEditor()
        setLinkModalOpen(false)
        if (!quill || !url) return

        const { index, length } = linkRangeRef.current ?? { index: quill.getLength(), length: 0 }
        const hasSelection = length > 0
        const displayText = hasSelection ? quill.getText(index, length) : linkText.trim() || url

        if (hasSelection) {
            quill.formatText(index, length, "link", url, "user")
        } else {
            if (linkText.trim()) {
                quill.insertText(index, displayText, { link: url }, "user")
            } else {
                quill.insertText(index, url, { link: url }, "user")
            }
        }
        setLinkText("")
        setLinkUrl("")
        setLinkTarget("")
        linkRangeRef.current = null
    }

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
                        <span className="text-tinted lg:ml-2">{placeholder}</span>
                    )}
                </div>
            )}

            {/* ---- Modal Insert Link (pengganti tooltip/popup bawaan Quill) ---- */}
            <AnimatePresence>
                {active && linkModalOpen && (
                    <LinkModal
                        text={linkText}
                        url={linkUrl}
                        target={linkTarget}
                        onTextChange={setLinkText}
                        onUrlChange={setLinkUrl}
                        onTargetChange={setLinkTarget}
                        onCancel={() => setLinkModalOpen(false)}
                        onConfirm={commitLink}
                    />
                )}
            </AnimatePresence>

            {/* ---- Modal Insert/Edit Formula LaTeX ---- */}
            <AnimatePresence>
                {active && formulaModal.open && (
                    <FormulaModal
                        latex={formulaLatex}
                        block={formulaModal.block}
                        editing={formulaModal.index !== null && formulaModal.index >= 0}
                        onLatexChange={setFormulaLatex}
                        onBlockChange={(block) => setFormulaModal((prev) => ({ ...prev, block }))}
                        onApplyTemplate={applyTemplate}
                        onCancel={() => {
                            setFormulaModal({ open: false, index: null, block: false })
                            setFormulaLatex("")
                        }}
                        onConfirm={commitFormula}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

// Quill.find tidak diekspor sebagai tipe publis; wrapper kecil untuk menghindari typecast berulang.
type GetIndexBlot = Parameters<Quill["getIndex"]>[0]
function handleQuillFind(node: HTMLElement | null): GetIndexBlot | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QuillCtor = (ReactQuill as unknown as { Quill?: any }).Quill
    if (QuillCtor && typeof QuillCtor.find === "function") return QuillCtor.find(node) as GetIndexBlot | null
    return null
}

function LinkModal({
    text,
    url,
    target,
    onTextChange,
    onUrlChange,
    onTargetChange,
    onCancel,
    onConfirm,
}: {
    text: string
    url: string
    target: string
    onTextChange: (v: string) => void
    onUrlChange: (v: string) => void
    onTargetChange: (v: string) => void
    onCancel: () => void
    onConfirm: () => void
}) {
    return createPortal(
        <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            className="formaly-modal fixed inset-0 z-[100] flex items-center justify-center bg-darks/45 p-4"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel()
            }}
        >
            <motion.div
                variants={modalPanel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="formaly-link-title"
                className="w-full max-w-md rounded-2xl border border-second bg-white p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="bg-base rounded-lg p-2">
                            <Link2 className="h-4 w-4 text-done" />
                        </span>
                        <h2 id="formaly-link-title" className="text-lg font-semibold text-darks">Sisipkan Link</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Tutup"
                        className="btn btn-square btn-ghost btn-sm text-tinted"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <label className="block text-sm font-medium text-darks mb-1.5 ml-1">URL</label>
                <input
                    autoFocus
                    type="url"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={(e) => e.key === "Enter" && onConfirm()}
                    className="input w-full rounded-xl border border-second bg-base text-darks focus:border-done focus:outline-none"
                />

                {!text && (
                    <>
                        <label className="block text-sm font-medium text-darks mb-1.5 mt-4 ml-1">Teks link (opsional)</label>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => onTextChange(e.target.value)}
                            placeholder="Teks yang ditampilkan"
                            onKeyDown={(e) => e.key === "Enter" && onConfirm()}
                            className="input w-full rounded-xl border border-second bg-base text-darks focus:border-done focus:outline-none"
                        />
                    </>
                )}

                <button
                    type="button"
                    onClick={() => onTargetChange(target === "new" ? "" : "new")}
                    className="mt-4 flex items-center gap-2.5 w-full text-sm text-darks rounded-lg px-3 py-2 hover:bg-second/60 transition-colors"
                >
                    <span
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            target === "new" ? "bg-done border-done" : "border-tinted"
                        }`}
                    >
                        {target === "new" && (
                            <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </span>
                    Buka di tab baru
                </button>

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn rounded-xl border border-second bg-base text-darks hover:bg-second">
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!url.trim()}
                        className="btn rounded-xl border-none bg-darks text-base hover:opacity-90 disabled:opacity-50"
                    >
                        <Link2 className="h-4 w-4" /> Sisipkan
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    )
}

function FormulaModal({
    latex,
    block,
    editing,
    onLatexChange,
    onBlockChange,
    onApplyTemplate,
    onCancel,
    onConfirm,
}: {
    latex: string
    block: boolean
    editing: boolean
    onLatexChange: (v: string) => void
    onBlockChange: (v: boolean) => void
    onApplyTemplate: (tpl: LaTeXTemplate) => void
    onCancel: () => void
    onConfirm: () => void
}) {
    const preview = useMemo(() => katexPreview(latex), [latex])

    return createPortal(
        <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            className="formaly-modal fixed inset-0 z-[100] flex items-center justify-center bg-darks/45 p-4"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onCancel()
            }}
        >
            <motion.div
                variants={modalPanel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="formaly-formula-title"
                className="w-full max-w-lg rounded-2xl border border-second bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-second bg-base/60">
                    <div className="flex items-center gap-2.5">
                        <h2 id="formaly-formula-title" className="text-base font-semibold text-darks">
                            {editing ? "Ubah Rumus LaTeX" : "Sisipkan Rumus LaTeX"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Tutup"
                        className="btn btn-square btn-ghost btn-sm text-tinted"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-5 py-4 border-b border-second bg-base/20">
                    {/* Pratinjau hasil rumus secara realtime */}
                    <div className="rounded-xl border border-second bg-base/40 px-4 py-4 flex items-center justify-center min-h-[72px] overflow-x-auto">
                        {preview ? (
                            <span dangerouslySetInnerHTML={{ __html: preview }} />
                        ) : (
                            <span className="text-sm text-tinted/60 italic">Pratinjau rumus akan muncul di sini...</span>
                        )}
                    </div>
                </div>

                <div className="p-5 overflow-y-auto scrollbar-none flex-1 flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-tinted mb-2 ml-1">LaTeX Input</label>
                        <textarea
                            autoFocus
                            value={latex}
                            onChange={(e) => onLatexChange(e.target.value)}
                            onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onConfirm()
                            }}
                            rows={3}
                            placeholder={`contoh: ${LATEX_TEMPLATES[0].tex}`}
                            className="textarea w-full rounded-xl border border-second bg-base text-darks font-mono text-sm focus:border-done focus:ring-1 focus:ring-done/40 focus:outline-none resize-y p-3 transition-all"
                        />
                    </div>

                    {/* Mode tampilan: inline / blok (display) */}
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-tinted mb-2 ml-1">Tampilan</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onBlockChange(false)}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    !block ? "bg-darks text-white shadow-sm" : "bg-base text-tinted hover:bg-second border border-transparent"
                                }`}
                            >
                                Di tengah kalimat
                            </button>
                            <button
                                type="button"
                                onClick={() => onBlockChange(true)}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    block ? "bg-darks text-white shadow-sm" : "bg-base text-tinted hover:bg-second border border-transparent"
                                }`}
                            >
                                Di baris sendiri
                            </button>
                        </div>
                    </div>

                    {/* Daftar template siap pakai DI BAWAH input */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-tinted mb-2 ml-1">
                            Template Rumus
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {LATEX_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => onApplyTemplate(tpl)}
                                    className="flex items-center gap-3 rounded-xl border border-second bg-base/40 px-3.5 py-3 text-left transition-all hover:border-done/40 hover:bg-white hover:shadow-sm group"
                                    title={`${tpl.block ? "Di baris sendiri" : "Di tengah kalimat"}: ${tpl.tex}`}
                                >
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-darks group-hover:text-done transition-colors">{tpl.label}</span>
                                        <code className="block text-[0.68rem] text-tinted/80 truncate font-mono mt-0.5">{tpl.tex}</code>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-second bg-base/60">
                    <div className="flex justify-end gap-3 w-full sm:w-auto">
                        <button type="button" onClick={onCancel} className="btn rounded-xl border border-second bg-base text-darks hover:bg-second font-medium px-5">
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={!latex.trim()}
                            className="btn rounded-xl border-none bg-darks text-white hover:opacity-90 disabled:opacity-50 font-medium px-5 flex items-center gap-2"
                        >
                            <Sigma className="h-4 w-4" />
                            {editing ? "Perbarui" : "Sisipkan"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    )
}

export default RichTextEditor

export { RichTextEditor, RichText }
