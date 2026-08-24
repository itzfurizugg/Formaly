import * as mammoth from "mammoth"
import { OPTION_LETTERS, type ParsedOption, type ParsedQuestion, validateParsedQuestion } from "./types"

const questionNumberPattern = /^\s*\d+\.\s+(.+)\s*$/
const optionPattern = /^\s*([a-z])\s*(?:[.)\-:]\s*)+(.+)\s*$/i
const answerKeyPattern = /^\s*kunci\s*jawaban\s*:\s*([a-z])\s*$/i
const pointPattern = /^\s*poin\s*jawaban\s*:\s*([1-9]\d*)\s*$/i
const requiredPattern = /^\s*wajib\s*diisi\s*:\s*(\S+)\s*$/i
const requiredTrueWords = new Set(["ya", "iya", "yes", "true", "1"])

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
    let scoreValue: number | undefined
    let isRequired: boolean | undefined
    let foundOption = false
    let errorMessage = ""

    for (const line of lines) {
        const answerMatch = line.match(answerKeyPattern)
        if (answerMatch) {
            answerLetter = answerMatch[1].toLowerCase()
            continue
        }

        const pointMatch = line.match(pointPattern)
        if (pointMatch) {
            scoreValue = Number(pointMatch[1])
            continue
        }

        const requiredMatch = line.match(requiredPattern)
        if (requiredMatch) {
            isRequired = requiredTrueWords.has(requiredMatch[1].toLowerCase())
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

        if (!foundOption) questionLines.push(line)
    }

    const presentLetters = OPTION_LETTERS.filter((letter) => optionsByLetter.has(letter))
    if (presentLetters.length > 0) {
        const isContiguous = presentLetters.every((letter, index) => letter === OPTION_LETTERS[index])
        if (!isContiguous) errorMessage = "Pilihan jawaban harus berurutan dari A."
    }

    const options: ParsedOption[] = presentLetters.map((letter) => ({
        text: optionsByLetter.get(letter) || "",
        is_correct: answerLetter === letter,
    }))
    const parsed = validateParsedQuestion({
        question_text: questionLines.join(" "),
        options,
        score_value: scoreValue,
        is_required: isRequired,
        raw_block: rawBlock.trim(),
    })

    if (errorMessage) return { ...parsed, parse_status: "error", error_message: errorMessage }
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
