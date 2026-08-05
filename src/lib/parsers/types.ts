export type ParseStatus = "ok" | "error"

export interface ParsedOption {
    text: string
    is_correct: boolean
}

export interface ParsedQuestion {
    question_text: string
    options: ParsedOption[]
    parse_status: ParseStatus
    raw_block?: string
    error_message?: string
}

export const OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const

export function validateParsedQuestion(question: Omit<ParsedQuestion, "parse_status" | "error_message">): ParsedQuestion {
    const questionText = question.question_text.trim()
    const options = question.options.map((option) => ({
        text: option.text.trim(),
        is_correct: option.is_correct,
    }))

    let errorMessage = ""
    if (!questionText) errorMessage = "Teks soal wajib diisi."
    else if (options.length < 1) errorMessage = "Setiap soal harus memiliki minimal satu pilihan jawaban."
    else if (options.length > OPTION_LETTERS.length) errorMessage = "Pilihan jawaban maksimal 5 (A–E)."
    else if (options.some((option) => !option.text)) errorMessage = "Semua pilihan jawaban wajib diisi."
    else if (options.filter((option) => option.is_correct).length !== 1) errorMessage = "Tentukan tepat satu jawaban yang benar."

    return {
        question_text: questionText,
        options,
        raw_block: question.raw_block,
        parse_status: errorMessage ? "error" : "ok",
        error_message: errorMessage || undefined,
    }
}
