import Papa from "papaparse"
import * as XLSX from "xlsx"
import { OPTION_LETTERS, type ParsedQuestion, validateParsedQuestion } from "./types"

type SourceRow = Record<string, unknown>

function value(row: SourceRow, key: string): string {
    const matchingKey = Object.keys(row).find((column) => column.trim().toLowerCase() === key)
    return matchingKey ? String(row[matchingKey] ?? "").trim() : ""
}

function parseRows(rows: SourceRow[]): ParsedQuestion[] {
    return rows
        .filter((row) => Object.values(row).some((cell) => String(cell ?? "").trim()))
        .map((row) => {
            const answer = value(row, "correct_answer").toLowerCase()
            const options = OPTION_LETTERS.map((letter) => ({
                text: value(row, `option_${letter}`),
                is_correct: answer === letter,
            })).filter((option) => option.text !== "")
            const parsed = validateParsedQuestion({
                question_text: value(row, "question_text"),
                options,
                raw_block: JSON.stringify(row),
            })
            if (answer && !/^[a-z]$/.test(answer)) {
                return { ...parsed, parse_status: "error" as const, error_message: "correct_answer harus berupa huruf A–Z." }
            }
            return parsed
        })
}

export async function parseCsvQuestions(file: File): Promise<ParsedQuestion[]> {
    const csv = await file.text()
    return new Promise((resolve, reject) => {
        Papa.parse<SourceRow>(csv, {
            header: true,
            skipEmptyLines: "greedy",
            complete: (result) => {
                if (result.errors.length) reject(new Error(result.errors[0].message))
                else resolve(parseRows(result.data))
            },
            error: (error: Error) => reject(error),
        })
    })
}

export async function parseXlsxQuestions(file: File): Promise<ParsedQuestion[]> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!firstSheet) return []
    return parseRows(XLSX.utils.sheet_to_json<SourceRow>(firstSheet, { defval: "" }))
}
