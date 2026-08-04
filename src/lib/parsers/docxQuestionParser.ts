import * as mammoth from "mammoth"
import { OPTION_LETTERS, type ParsedOption, type ParsedQuestion, validateParsedQuestion } from "./types"

const questionNumberPattern = /^\s*\d+\.\s+(.+)\s*$/
const optionPattern = /^\s*([a-e])\s*(?:[.)\-:]\s*)+(.+)\s*$/i
const anyOptionPattern = /^\s*([a-z])\s*(?:[.)\-:]\s*)+(.+)\s*$/i
const answerKeyPattern = /^\s*kunci\s*jawaban\s*:\s*([a-e])\s*$/i

function parseBlock(rawBlock: string): ParsedQuestion {
    const lines = rawBlock.split("\n").map((line) => line.trim()).filter(Boolean)
    const firstLine = lines.shift()
    const questionMatch = firstLine?.match(questionNumberPattern)
    if (!questionMatch) {
        return { question_text: "", options: [], parse_status: "error", raw_block: rawBlock, error_message: "Format nomor soal tidak valid." }
    }

    const questionLines = [questionMatch[1].trim()]
    const optionsByLetter = new Map<string, string>()
    let answerLetter: string | undefined
    let foundOption = false
    let errorMessage = ""

    for (const line of lines) {
        const answerMatch = line.match(answerKeyPattern)
        if (answerMatch) {
            answerLetter = answerMatch[1].toLowerCase()
            continue
        }

        const optionMatch = line.match(optionPattern)
        if (optionMatch) {
            foundOption = true
            const letter = optionMatch[1].toLowerCase()
            if (optionsByLetter.has(letter)) errorMessage = `Pilihan ${letter.toUpperCase()} ditulis lebih dari sekali.`
            optionsByLetter.set(letter, optionMatch[2].trim())
            continue
        }
        if (anyOptionPattern.test(line)) {
            errorMessage = "Pilihan jawaban hanya boleh berlabel A sampai E."
            continue
        }

        if (!foundOption) questionLines.push(line)
    }

    const options: ParsedOption[] = OPTION_LETTERS.map((letter) => ({
        text: optionsByLetter.get(letter) || "",
        is_correct: answerLetter === letter,
    }))
    const parsed = validateParsedQuestion({
        question_text: questionLines.join(" "),
        options,
        raw_block: rawBlock.trim(),
    })

    if (errorMessage) return { ...parsed, parse_status: "error", error_message: errorMessage }
    if (!answerLetter) return { ...parsed, parse_status: "error", error_message: "Kunci Jawaban tidak ditemukan atau tidak valid." }
    if (optionsByLetter.size !== OPTION_LETTERS.length) {
        return { ...parsed, parse_status: "error", error_message: "Pilihan jawaban harus lengkap dari A sampai E." }
    }
    return parsed
}

export async function parseDocxQuestions(file: File): Promise<ParsedQuestion[]> {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    const text = result.value.replace(/\r\n?/g, "\n").trim()
    if (!text) return []

    const blocks: string[] = []
    let currentBlock: string[] = []
    for (const line of text.split("\n")) {
        if (questionNumberPattern.test(line) && currentBlock.length) {
            const block = currentBlock.join("\n").trim()
            if (block) blocks.push(block)
            currentBlock = []
        }
        currentBlock.push(line)
    }
    const finalBlock = currentBlock.join("\n").trim()
    if (finalBlock) blocks.push(finalBlock)

    return blocks
        .filter((block) => block.split("\n").some((line) => questionNumberPattern.test(line)))
        .map(parseBlock)
}
