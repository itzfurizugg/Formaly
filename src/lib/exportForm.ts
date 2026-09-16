import * as XLSX from "xlsx-js-style"
import { supabase } from "./supabase"
import { richTextToPlain } from "./richtext"

export interface ExportRespondentItem {
    id: string
    total_score: number | null
    status: string
    started_at: string | null
    submitted_at: string | null
    user: { name: string; email?: string } | null
    token: { token_code: string } | null
}

function statusLabel(s: string) {
    if (s === "SUBMITTED") return "Selesai"
    if (s === "IN_PROGRESS") return "Proses"
    return s
}

function fmtDate(d: string | null) {
    if (!d) return "-"
    return new Date(d).toLocaleString("id-ID")
}

function sanitizeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "form"
}

// ---------------------------------------------------------------------------
// Styling helpers — dipakai bersama oleh exportFormXlsx & exportSubmissionXlsx
// biar tampilan semua sheet konsisten.
// ---------------------------------------------------------------------------

type CellStyle = Record<string, unknown>
type ColAlign = "left" | "center" | "right"

const FONT_NAME = "Arial"

const BORDER_THIN = { style: "thin", color: { rgb: "E2E2E2" } }
const CELL_BORDER = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN }

const TITLE_STYLE: CellStyle = {
    font: { name: FONT_NAME, sz: 14, bold: true, color: { rgb: "111827" } },
    alignment: { horizontal: "left", vertical: "center" },
}

const SUBTITLE_STYLE: CellStyle = {
    font: { name: FONT_NAME, sz: 10, italic: true, color: { rgb: "6B7280" } },
    alignment: { horizontal: "left", vertical: "center" },
}

const HEADER_STYLE: CellStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "0F766E" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: CELL_BORDER,
}

function bodyStyle(fillColor: string | undefined, align: ColAlign, fontColor = "1F2937", bold = false): CellStyle {
    return {
        font: { name: FONT_NAME, sz: 10, color: { rgb: fontColor }, bold },
        ...(fillColor ? { fill: { patternType: "solid", fgColor: { rgb: fillColor } } } : {}),
        alignment: { horizontal: align, vertical: "center", wrapText: align === "left" },
        border: CELL_BORDER,
    }
}

interface HighlightRule {
    colIndex: number
    colorFor: (value: string | number | undefined) => { fill: string; font: string } | null
}

function setCellStyle(ws: XLSX.WorkSheet, addr: string, style: CellStyle) {
    const cell = (ws as Record<string, { s?: CellStyle } | undefined>)[addr]
    if (cell) cell.s = style
}

/**
 * Bangun satu worksheet bergaya: judul + subjudul (merge selebar tabel),
 * header berwarna, body dengan border + zebra-striping, kolom auto-width,
 * freeze header, dan autofilter. Dipakai untuk semua sheet export.
 */
function createStyledSheet(
    title: string,
    subtitle: string,
    headers: string[],
    rows: (string | number)[][],
    colAligns: ColAlign[],
    colWidths: number[],
    highlight?: HighlightRule,
) {
    const lastCol = headers.length - 1
    const headerRowIdx = 3 // baris ke-4 (0-based): 0=judul, 1=subjudul, 2=kosong, 3=header
    const dataStartIdx = headerRowIdx + 1
    const dataEndIdx = dataStartIdx + rows.length - 1

    const aoa: (string | number)[][] = [[title], [subtitle], [], headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // Merge baris judul & subjudul selebar tabel
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ]

    setCellStyle(ws, XLSX.utils.encode_cell({ r: 0, c: 0 }), TITLE_STYLE)
    setCellStyle(ws, XLSX.utils.encode_cell({ r: 1, c: 0 }), SUBTITLE_STYLE)

    for (let c = 0; c <= lastCol; c++) {
        setCellStyle(ws, XLSX.utils.encode_cell({ r: headerRowIdx, c }), HEADER_STYLE)
    }

    for (let r = dataStartIdx; r <= dataEndIdx; r++) {
        const isEven = (r - dataStartIdx) % 2 === 1
        for (let c = 0; c <= lastCol; c++) {
            const addr = XLSX.utils.encode_cell({ r, c })
            const cellObj = (ws as Record<string, { v?: string | number } | undefined>)[addr]
            const align = colAligns[c] || "left"
            let fillColor = isEven ? "F9FAFB" : undefined
            let fontColor = "1F2937"
            let bold = false

            if (highlight && c === highlight.colIndex) {
                const res = highlight.colorFor(cellObj?.v)
                if (res) {
                    fillColor = res.fill
                    fontColor = res.font
                    bold = true
                }
            }

            setCellStyle(ws, addr, bodyStyle(fillColor, align, fontColor, bold))
        }
    }

    ws["!cols"] = colWidths.map((wch) => ({ wch }))
    ws["!rows"] = [{ hpx: 28 }, { hpx: 18 }, { hpx: 6 }, { hpx: 22 }]

    ws["!views"] = [
        {
            state: "frozen",
            xSplit: 0,
            ySplit: dataStartIdx,
            topLeftCell: XLSX.utils.encode_cell({ r: dataStartIdx, c: 0 }),
            activePane: "bottomLeft",
        },
    ]

    ws["!autofilter"] = {
        ref: XLSX.utils.encode_range({ s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx, c: lastCol } }),
    }

    return ws
}

function statusColor(value: string | number | undefined): { fill: string; font: string } | null {
    if (value === "Selesai") return { fill: "DCFCE7", font: "15803D" }
    if (value === "Proses") return { fill: "FEF3C7", font: "92400E" }
    return null
}

function hasilColor(value: string | number | undefined): { fill: string; font: string } | null {
    if (value === "Benar") return { fill: "DCFCE7", font: "15803D" }
    if (value === "Salah") return { fill: "FEE2E2", font: "B91C1C" }
    if (value === "Tanpa Penilaian") return { fill: "F3F4F6", font: "6B7280" }
    return null
}

const RESPONDEN_HEADERS = ["No", "Nama Responden", "Email", "Nilai", "Status", "Token", "Waktu Mulai", "Waktu Dikirim"]
const RESPONDEN_ALIGNS: ColAlign[] = ["center", "left", "left", "center", "center", "center", "left", "left"]
const RESPONDEN_WIDTHS = [5, 26, 28, 10, 12, 14, 20, 20]
const RESPONDEN_STATUS_COL = 4

/**
 * Export data responden form (bukan soal) dalam bentuk spreadsheet .xlsx.
 * Menyertakan Nama, Email, Nilai / Skor, Status, Token, Waktu Mulai, dan Waktu Dikirim.
 */
export async function exportFormXlsx({
    formId,
    formTitle,
    data,
}: {
    formId: string
    formTitle: string
    data?: ExportRespondentItem[]
}) {
    let submissions = data

    if (!submissions) {
        const { data: fetched, error: subErr } = await supabase
            .from("submissions")
            .select(`
                id,
                total_score,
                status,
                started_at,
                submitted_at,
                user:user_id ( name, email ),
                token:token_id ( token_code )
            `)
            .eq("form_id", formId)
            .order("submitted_at", { ascending: false })

        if (subErr) throw new Error(subErr.message)
        submissions = (fetched || []) as unknown as ExportRespondentItem[]
    }

    const sRows = submissions.map((s, index) => [
        index + 1,
        s.user?.name || "-",
        s.user?.email || "-",
        s.total_score != null ? s.total_score : "-",
        statusLabel(s.status),
        s.token?.token_code || "-",
        fmtDate(s.started_at),
        fmtDate(s.submitted_at),
    ])

    const workbook = XLSX.utils.book_new()
    const sheet = createStyledSheet(
        `Data Responden - ${formTitle}`,
        `Diekspor pada ${new Date().toLocaleString("id-ID")} • Total responden: ${submissions.length}`,
        RESPONDEN_HEADERS,
        sRows,
        RESPONDEN_ALIGNS,
        RESPONDEN_WIDTHS,
        { colIndex: RESPONDEN_STATUS_COL, colorFor: statusColor },
    )
    XLSX.utils.book_append_sheet(workbook, sheet, "Data Responden")
    XLSX.writeFile(workbook, `Data-Responden-${sanitizeFileName(formTitle)}.xlsx`)
}

interface ExportAnswerDetail {
    id: string
    selected_option_id: string | null
    selected_options: string[] | null
    answer_text: string | null
    score_obtained: number | null
    question: {
        id: string
        question_text: string
        question_type: string
        score_value: number
        order_index: number
        question_options: { id: string; option_text: string; is_correct: boolean }[]
    } | null
}

function typeLabel(t: string) {
    if (t === "multiple_choice") return "Pilihan Ganda"
    if (t === "text") return "Isian"
    if (t === "dropdown") return "Dropdown"
    if (t === "file_upload") return "Upload File"
    if (t === "date_time") return "Tanggal & Jam"
    return "Pilihan Tunggal"
}

// Tipe soal tanpa pilihan jawaban (tidak dinilai benar/salah otomatis).
function isOpenType(t: string | null | undefined) {
    return t === "text" || t === "file_upload" || t === "date_time"
}

function fmtAnswerText(t: string | null | undefined, text: string | null | undefined): string {
    if (!text) return "-"
    const s = String(text)
    if (t === "date_time") {
        if (s.includes("T")) return new Date(s).toLocaleString("id-ID")
        if (s.includes(":")) return s
        return new Date(s + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    }
    return richTextToPlain(s)
}

// null = soal tanpa kunci jawaban / isian (tidak dapat dinilai benar/salah).
function isAnswerCorrect(a: ExportAnswerDetail): boolean | null {
    const q = a.question
    if (!q || isOpenType(q.question_type)) return null
    const keys = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
    if (keys.length === 0) return null
    const selected =
        q.question_type === "multiple_choice"
            ? a.selected_options || []
            : a.selected_option_id
                ? [a.selected_option_id]
                : []
    return selected.length === keys.length && selected.every((id) => keys.includes(id))
}

function answerText(a: ExportAnswerDetail): string {
    const q = a.question
    if (!q) return "-"
    const raw = a.answer_text
    if (isOpenType(q.question_type)) return fmtAnswerText(q.question_type, raw)
    const selected =
        q.question_type === "multiple_choice"
            ? a.selected_options || []
            : a.selected_option_id
                ? [a.selected_option_id]
                : []
    const texts = q.question_options.filter((o) => selected.includes(o.id)).map((o) => richTextToPlain(o.option_text))
    return texts.length ? texts.join(", ") : "-"
}

const JAWABAN_HEADERS = ["No", "Soal", "Tipe", "Jawaban", "Hasil", "Skor Diperoleh"]
const JAWABAN_ALIGNS: ColAlign[] = ["center", "left", "center", "left", "center", "center"]
const JAWABAN_WIDTHS = [5, 45, 14, 40, 16, 14]
const JAWABAN_HASIL_COL = 4

/**
 * Export jawaban milik satu submission/responden tertentu (revisi #10).
 * Berisi ringkasan responden + rincian jawaban per soal dalam satu file .xlsx.
 */
export async function exportSubmissionXlsx({
    formId,
    submissionId,
    formTitle,
}: {
    formId: string
    submissionId: string
    formTitle: string
}) {
    const { data: subData, error: subErr } = await supabase
        .from("submissions")
        .select(`
            id, total_score, status, started_at, submitted_at,
            user:user_id ( name, email ),
            token:token_id ( token_code )
        `)
        .eq("id", submissionId)
        .eq("form_id", formId)
        .single()
    if (subErr) throw new Error(subErr.message)
    const sub = (subData as unknown as ExportRespondentItem) || null
    if (!sub) throw new Error("Submission tidak ditemukan.")

    const { data: ansData, error: ansErr } = await supabase
        .from("answers")
        .select(`
            id, selected_option_id, selected_options, answer_text, score_obtained,
            question:question_id (
                id, question_text, question_type, score_value, order_index,
                question_options ( id, option_text, is_correct )
            )
        `)
        .eq("submission_id", submissionId)
    if (ansErr) throw new Error(ansErr.message)

    const rows = ((ansData || []) as unknown as ExportAnswerDetail[])
        .slice()
        .sort(
            (a, b) =>
                (a.question?.order_index ?? Number.MAX_SAFE_INTEGER) -
                (b.question?.order_index ?? Number.MAX_SAFE_INTEGER)
        )

    // Sheet 1: ringkasan responden.
    const sRows = [[
        1,
        sub.user?.name || "-",
        sub.user?.email || "-",
        sub.total_score != null ? sub.total_score : "-",
        statusLabel(sub.status),
        sub.token?.token_code || "-",
        fmtDate(sub.started_at),
        fmtDate(sub.submitted_at),
    ]]

    // Sheet 2: jawaban tiap soal dari responden tersebut.
    const jRows = rows.map((a, i) => {
        const correct = isAnswerCorrect(a)
        const hasil = correct === null ? "Tanpa Penilaian" : correct ? "Benar" : "Salah"
        return [
            i + 1,
            richTextToPlain(a.question?.question_text || "-"),
            a.question ? typeLabel(a.question.question_type) : "-",
            answerText(a),
            hasil,
            a.score_obtained != null ? a.score_obtained : "-",
        ]
    })

    const workbook = XLSX.utils.book_new()

    const ringkasanSheet = createStyledSheet(
        `Ringkasan Responden - ${formTitle}`,
        `Diekspor pada ${new Date().toLocaleString("id-ID")}`,
        RESPONDEN_HEADERS,
        sRows,
        RESPONDEN_ALIGNS,
        RESPONDEN_WIDTHS,
        { colIndex: RESPONDEN_STATUS_COL, colorFor: statusColor },
    )
    XLSX.utils.book_append_sheet(workbook, ringkasanSheet, "Ringkasan")

    const jawabanSheet = createStyledSheet(
        `Jawaban ${sub.user?.name || "Responden"} - ${formTitle}`,
        `Total soal: ${jRows.length} • Skor: ${sub.total_score != null ? sub.total_score : "-"}`,
        JAWABAN_HEADERS,
        jRows,
        JAWABAN_ALIGNS,
        JAWABAN_WIDTHS,
        { colIndex: JAWABAN_HASIL_COL, colorFor: hasilColor },
    )
    XLSX.utils.book_append_sheet(workbook, jawabanSheet, "Jawaban")

    XLSX.writeFile(workbook, `Jawaban-Responden-${sanitizeFileName(formTitle)}.xlsx`)
}