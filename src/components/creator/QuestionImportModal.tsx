import { useRef, useState } from "react"
import { motion } from "motion/react"
import { CheckCircle2, FileUp, Loader2, Pencil, Upload, X } from "lucide-react"
import { type ParsedQuestion, validateParsedQuestion } from "../../lib/parsers/types"
import { supabase } from "../../lib/supabase"
import ModalPortal from "../modalPortal"
import { easeOutExpo, modalBackdrop, modalPanel } from "../../lib/motion"

interface QuestionImportModalProps {
    formId: string
    startingOrder: number
    onClose: () => void
    onImported: (summary: string) => void
}

function extension(file: File) {
    return file.name.split(".").pop()?.toLowerCase()
}

async function parseFile(file: File): Promise<ParsedQuestion[]> {
    switch (extension(file)) {
        case "docx": return (await import("../../lib/parsers/docxQuestionParser")).parseDocxQuestions(file)
        case "csv": return (await import("../../lib/parsers/csvXlsxQuestionParser")).parseCsvQuestions(file)
        case "xlsx": return (await import("../../lib/parsers/csvXlsxQuestionParser")).parseXlsxQuestions(file)
        default: throw new Error("Gunakan file .docx, .csv, atau .xlsx.")
    }
}

export default function QuestionImportModal({ formId, startingOrder, onClose, onImported }: QuestionImportModalProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [rows, setRows] = useState<ParsedQuestion[]>([])
    const [fileName, setFileName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [parsing, setParsing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<number | null>(null)
    const [summary, setSummary] = useState<string | null>(null)

    const chooseFile = async (file?: File) => {
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            setRows([])
            setError("Ukuran file maksimal 10 MB.")
            return
        }
        setParsing(true)
        setError(null)
        setSummary(null)
        try {
            const parsed = await parseFile(file)
            if (!parsed.length) throw new Error("Tidak ada soal yang ditemukan dalam file.")
            setRows(parsed)
            setFileName(file.name)
        } catch (err) {
            setRows([])
            setError(err instanceof Error ? err.message : "File tidak dapat dibaca.")
        } finally {
            setParsing(false)
        }
    }

    const updateRow = (index: number, next: ParsedQuestion) => {
        setRows((current) => current.map((row, rowIndex) => rowIndex === index ? validateParsedQuestion(next) : row))
    }

    const saveImport = async () => {
        const checkedRows = rows.map((row) => validateParsedQuestion(row))
        setRows(checkedRows)
        const validRows = checkedRows.filter((row) => row.parse_status === "ok")
        const invalidCount = checkedRows.length - validRows.length
        if (!validRows.length) {
            setError("Perbaiki setidaknya satu soal sebelum mengimpor.")
            return
        }

        setSaving(true)
        setError(null)
        const { data: insertedQuestions, error: questionError } = await supabase
            .from("questions")
            .insert(validRows.map((row, index) => ({
                form_id: formId,
                question_text: row.question_text,
                question_type: "single_choice",
                score_value: row.score_value ?? 0,
                is_required: row.is_required ?? false,
                order_index: startingOrder + index,
                image_question: null,
            })))
            .select("id")

        if (questionError || !insertedQuestions || insertedQuestions.length !== validRows.length) {
            setSaving(false)
            setError(questionError?.message || "Gagal menyimpan soal.")
            return
        }

        const optionRows = validRows.flatMap((row, questionIndex) => row.options.map((option, optionIndex) => ({
            question_id: insertedQuestions[questionIndex].id,
            option_text: option.text,
            is_correct: option.is_correct,
            order_index: optionIndex,
        })))
        const { error: optionError } = await supabase.from("question_options").insert(optionRows)
        setSaving(false)
        if (optionError) {
            setError(`Soal tersimpan, tetapi pilihan jawaban gagal disimpan: ${optionError.message}`)
            return
        }

        const resultSummary = `${validRows.length} soal berhasil diimpor${invalidCount ? `, ${invalidCount} gagal dan perlu diperbaiki` : ""}.`
        setSummary(resultSummary)
        onImported(resultSummary)
    }

    return (
        <ModalPortal>
        <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-darks/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
        >
            <motion.div variants={modalPanel} className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white border border-second shadow-xl rounded-xl flex flex-col">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-second">
                    <div>
                        <h2 id="import-title" className="font-semibold text-darks">Impor Soal</h2>
                        <p className="text-sm text-tinted mt-1">Unggah DOCX, CSV, atau XLSX. Periksa dan perbaiki data sebelum disimpan.</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-ghost text-tinted" aria-label="Tutup"><X className="h-4 w-4" /></button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {!rows.length && !parsing && (
                        <button onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-second p-10 text-center hover:border-done transition-colors">
                            <FileUp className="h-8 w-8 mx-auto text-done mb-3" />
                            <span className="block font-medium text-darks">Pilih file untuk diimpor</span>
                            <span className="block text-sm text-tinted mt-1">DOCX, CSV, atau XLSX · maksimal 10 MB</span>
                        </button>
                    )}
                    <input ref={inputRef} type="file" accept=".docx,.csv,.xlsx" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />

                    {parsing && <div className="py-12 text-center text-tinted"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Membaca file…</div>}
                    {error && <div role="alert" className="mt-4 text-sm text-wrong bg-wrong/5 border border-wrong/20 px-4 py-3">{error}</div>}
                    {summary && <div role="status" className="mt-4 text-sm text-done bg-done/5 border border-done/20 px-4 py-3 flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{summary}</div>}

                    {rows.length > 0 && (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <p className="text-sm text-tinted"><span className="font-medium text-darks">{fileName}</span> · {rows.length} soal · {rows.filter((row) => row.parse_status === "error").length} perlu diperbaiki</p>
                                <button onClick={() => inputRef.current?.click()} className="btn btn-sm bg-base border border-second text-darks"><Upload className="h-3.5 w-3.5" /> Ganti file</button>
                            </div>
                            <div className="overflow-x-auto border border-second">
                                <table className="table table-sm min-w-[900px]">
                                    <thead><tr className="text-tinted"><th>Status</th><th>Soal</th><th>Pilihan Jawaban</th><th></th></tr></thead>
                                    <tbody>{rows.map((row, index) => (
                                        <motion.tr
                                            key={index}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, ease: easeOutExpo, delay: Math.min(index * 0.04, 0.35) }}
                                            className={row.parse_status === "error" ? "bg-wrong/5" : ""}
                                        >
                                            <td className="align-top w-32"><span className={`badge rounded-full text-xs ${row.parse_status === "ok" ? "badge-success" : "badge-error"}`}>{row.parse_status === "ok" ? "Siap" : "Perlu edit"}</span>{row.error_message && <p className="text-xs text-wrong mt-2 max-w-40">{row.error_message}</p>}</td>
                                            <td className="align-top whitespace-pre-line max-w-xs">{editing === index ? <textarea className="textarea textarea-sm w-full bg-base border-second" value={row.question_text} onChange={(e) => updateRow(index, { ...row, question_text: e.target.value })} /> : row.question_text || <span className="text-tinted">(kosong)</span>}{(row.score_value != null || row.is_required) && <p className="text-xs text-tinted mt-1">{row.score_value != null && <span>{row.score_value} poin</span>}{row.score_value != null && row.is_required && " · "}{row.is_required && <span className="text-wrong">Wajib diisi</span>}</p>}</td>
                                            <td className="align-top"><div className="space-y-1">{row.options.map((option, optionIndex) => <label key={optionIndex} className={`flex gap-2 items-center text-xs ${option.is_correct ? "text-done font-medium" : "text-tinted"}`}><input type="radio" name={`answer-${index}`} checked={option.is_correct} disabled={editing !== index} onChange={() => updateRow(index, { ...row, options: row.options.map((item, itemIndex) => ({ ...item, is_correct: itemIndex === optionIndex })) })} />{editing === index ? <input className="input input-xs h-7 flex-1 bg-base border-second" value={option.text} onChange={(e) => updateRow(index, { ...row, options: row.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, text: e.target.value } : item) })} /> : `${String.fromCharCode(65 + optionIndex)}. ${option.text || "(kosong)"}`}</label>)}</div></td>
                                            <td className="align-top"><button onClick={() => setEditing(editing === index ? null : index)} className="btn btn-sm btn-ghost text-darks"><Pencil className="h-4 w-4" />{editing === index ? "Selesai" : "Edit"}</button></td>
                                        </motion.tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-5 border-t border-second">
                    <button onClick={onClose} className="btn bg-base border border-second text-darks">{summary ? "Tutup" : "Batal"}</button>
                    {!summary && rows.length > 0 && <button onClick={saveImport} disabled={saving} className="btn bg-darks text-base border-none disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Impor soal yang valid</button>}
                </div>
            </motion.div>
        </motion.div>
        </ModalPortal>
    )
}
