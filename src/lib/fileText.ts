import mammoth from "mammoth"
import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString()

const MAX_CHARS = 60_000

function truncate(text: string): string {
    return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n… (terpotong)` : text
}

async function extractTxt(file: File): Promise<string> {
    return truncate((await file.text()).trim())
}

async function extractDocx(file: File): Promise<string> {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return truncate(result.value.trim())
}

async function extractPdf(file: File): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
    const doc = await loadingTask.promise
    const chunks: string[] = []
    try {
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i)
            const content = await page.getTextContent()
            const text = content.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" ")
                .replace(/\s+/g, " ")
                .trim()
            chunks.push(text)
            page.cleanup?.()
        }
    } finally {
        await loadingTask.destroy()
    }
    return truncate(chunks.filter(Boolean).join("\n\n"))
}

/** Baca isi dokumen berformat teks (txt/md/doc/docx/pdf) menjadi teks polos.
 *  Hasil dipakai sebagai konteks untuk model AI yang tidak menerima file mentah
 *  (provider selain Gemini), supaya isi lampiran tetap terbaca. */
export async function extractFileText(file: File): Promise<string> {
    const name = file.name.toLowerCase()
    const mime = file.type.toLowerCase()

    if (mime === "application/pdf" || name.endsWith(".pdf")) return extractPdf(file)
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
        return extractDocx(file)
    }
    if (mime === "application/msword" || name.endsWith(".doc")) {
        throw new Error("Format .doc lama belum didukung. Simpan sebagai .docx lalu coba lagi.")
    }
    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".text") || mime.startsWith("text/")) {
        return extractTxt(file)
    }

    throw new Error("Tipe file tidak didukung untuk dibaca. Gunakan file .docx, .pdf, .txt, atau .md.")
}