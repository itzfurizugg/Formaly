import * as XLSX from "xlsx"
import { supabase } from "./supabase"

interface QuestionRow {
    id: string
    question_text: string
    question_type: string
    score_value: number | null
    order_index: number | null
    question_options: { id: string; option_text: string; is_correct: boolean; order_index: number | null }[] | null
}

interface SubmissionRow {
    id: string
    total_score: number | null
    status: string
    started_at: string | null
    submitted_at: string | null
    user: { name: string } | null
    token: { token_code: string } | null
}

function typeLabel(t: string) {
    if (t === "multiple_choice") return "Pilihan Ganda"
    if (t === "text") return "Isian"
    return "Pilihan Tunggal"
}

function statusLabel(s: string) {
    if (s === "SUBMITTED") return "Selesai"
    if (s === "IN_PROGRESS") return "Proses"
    return s
}

function fmtDate(d: string | null) {
    if (!d) return ""
    return new Date(d).toLocaleString("id-ID")
}

function sanitizeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "form"
}

export async function exportFormXlsx({ formId, formTitle }: { formId: string; formTitle: string }) {
    const [qRes, subRes] = await Promise.all([
        supabase
            .from("questions")
            .select("id, question_text, question_type, score_value, order_index, question_options ( id, option_text, is_correct, order_index )")
            .eq("form_id", formId)
            .order("order_index", { ascending: true }),
        supabase
            .from("submissions")
            .select("id, total_score, status, started_at, submitted_at, user:user_id ( name ), token:token_id ( token_code )")
            .eq("form_id", formId)
            .order("submitted_at", { ascending: false }),
    ])

    if (qRes.error) throw new Error(qRes.error.message)
    if (subRes.error) throw new Error(subRes.error.message)

    const questions = (qRes.data || []) as unknown as QuestionRow[]
    const submissions = (subRes.data || []) as unknown as SubmissionRow[]

    const maxOptions = questions.reduce((max, q) => Math.max(max, q.question_options?.length || 0), 0)
    const qHeader = ["No", "Soal", "Tipe", "Skor", ...Array.from({ length: maxOptions }, (_, i) => `Pilihan ${i + 1}`), ...(maxOptions > 0 ? ["Kunci"] : [])]
    const qRows = questions.map((q, index) => {
        const opts = [...(q.question_options || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        const cells = Array.from({ length: maxOptions }, (_, j) => opts[j]?.option_text || "")
        const kunci = opts
            .filter((o) => o.is_correct)
            .map((o) => `${String.fromCharCode(65 + opts.indexOf(o))}`)
            .join(", ")
        return [index + 1, q.question_text, typeLabel(q.question_type), q.score_value ?? "", ...cells, ...(maxOptions > 0 ? [kunci] : [])]
    })

    const sHeader = ["No", "Nama", "Token", "Status", "Skor", "Mulai", "Dikirim"]
    const sRows = submissions.map((s, index) => [
        index + 1,
        s.user?.name || "",
        s.token?.token_code || "",
        statusLabel(s.status),
        s.total_score ?? "",
        fmtDate(s.started_at),
        fmtDate(s.submitted_at),
    ])

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([qHeader, ...qRows]), "Soal")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([sHeader, ...sRows]), "Submission")
    XLSX.writeFile(workbook, `${sanitizeFileName(formTitle)}.xlsx`)
}
