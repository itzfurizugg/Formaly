import * as XLSX from "xlsx"
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

    const sHeader = ["No", "Nama Responden", "Email", "Nilai", "Status", "Token", "Waktu Mulai", "Waktu Dikirim"]
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
    const sheet = XLSX.utils.aoa_to_sheet([sHeader, ...sRows])
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
    return "Pilihan Tunggal"
}

// null = soal tanpa kunci jawaban / isian (tidak dapat dinilai benar/salah).
function isAnswerCorrect(a: ExportAnswerDetail): boolean | null {
    const q = a.question
    if (!q || q.question_type === "text") return null
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
    if (q.question_type === "text") return a.answer_text ? richTextToPlain(a.answer_text) : "-"
    const selected =
        q.question_type === "multiple_choice"
            ? a.selected_options || []
            : a.selected_option_id
                ? [a.selected_option_id]
                : []
    const texts = q.question_options.filter((o) => selected.includes(o.id)).map((o) => richTextToPlain(o.option_text))
    return texts.length ? texts.join(", ") : "-"
}

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
    const sHeader = ["No", "Nama Responden", "Email", "Nilai", "Status", "Token", "Waktu Mulai", "Waktu Dikirim"]
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
    const jHeader = ["No", "Soal", "Tipe", "Jawaban", "Hasil", "Skor Diperoleh"]
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([sHeader, ...sRows]), "Ringkasan")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([jHeader, ...jRows]), "Jawaban")
    XLSX.writeFile(workbook, `Jawaban-Responden-${sanitizeFileName(formTitle)}.xlsx`)
}
