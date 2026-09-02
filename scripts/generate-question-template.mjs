// Generator template soal .docx untuk Formaly.
//
// Menghasilkan public/template-soal.docx yang konvensi formatnya PERSIS sama
// dengan parser bulk import (src/lib/parsers/docxQuestionParser.ts):
//   - Soal diberi nomor urut diikuti titik ("1. ...")
//   - Pilihan jawaban diberi label huruf a–e diikuti titik ("a. ...")
//   - Baris "Kunci Jawaban: X" menandai jawaban benar
//   - Opsional: "Poin Jawaban: N" dan "Wajib diisi: ya"
//
// Template dihasilkan sebagai .docx minimal (bukan ikatan ke library Word),
// cukup: [Content_Types].xml, _rels/.rels, dan word/document.xml. Mammoth
// (mammoth.extractRawText) membaca word/document.xml dari ZIP ini tanpa
// masalah, jadi file hasil generate bisa langsung diupload ulang ke form.
//
// Pemakaian:
//   node scripts/generate-question-template.mjs
//
// (membutuhkan CLI `zip` yang tersedia di sistem.)

import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, "..", "public", "template-soal.docx")

// Tiap string di sini menjadi SATU paragraf di dalam dokumen.
const paragraphs = [
    "",
    "FORMAT SOAL FORMALY",
    "",
    "Gunakan format di bawah ini untuk mengimpor soal ke Formaly:",
    "- Nomori tiap soal dengan angka diikuti titik (1., 2., 3., dst).",
    "- Tulis pilihan jawaban dengan huruf a sampai e diikuti titik (a., b., c., dst).",
    "- Tulis baris \"Kunci Jawaban: X\" untuk menandai pilihan yang benar.",
    "- Opsional: tambahkan baris \"Poin Jawaban: N\" dan \"Wajib diisi: ya\".",
    "",
    "Contoh soal di bawah ini sudah mengikuti format dan bisa langsung diimport:",
    "",
    "1. Berapa hasil dari 7 dikali 6?",
    "a. 40",
    "b. 42",
    "c. 44",
    "d. 48",
    "e. 56",
    "Kunci Jawaban: b",
    "Poin Jawaban: 1",
    "Wajib diisi: ya",
    "",
    "2. Ibu kota Indonesia adalah...",
    "a. Jakarta",
    "b. Medan",
    "c. Surabaya",
    "d. Bandung",
    "e. Yogyakarta",
    "Kunci Jawaban: a",
    "",
    "3. Akar kuadrat dari 144 adalah?",
    "a. 10",
    "b. 11",
    "c. 12",
    "d. 13",
    "e. 14",
    "Kunci Jawaban: c",
    "Poin Jawaban: 2",
    "",
    "Hapus contoh soal di atas, lalu ganti dengan soal kamu sendiri.",
]

function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

function buildDocumentXml() {
    const runs = paragraphs
        .map(
            (text) =>
                `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
        )
        .join("")
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${runs}
  </w:body>
</w:document>
`
}

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
`

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`

const files = {
    "[Content_Types].xml": contentTypesXml,
    "_rels/.rels": relsXml,
    "word/document.xml": buildDocumentXml(),
}

const tmpDir = mkdtempSync(join(tmpdir(), "formaly-template-"))
try {
    for (const [name, content] of Object.entries(files)) {
        const fullPath = join(tmpDir, name)
        mkdirSync(dirname(fullPath), { recursive: true })
        writeFileSync(fullPath, content, "utf8")
    }
    // Zip dengan path relatif agar entry di dalam archive benar.
    execFileSync("zip", ["-q", "-r", OUT_PATH, "."], { cwd: tmpDir })
    console.log(`Template berhasil dibuat: ${OUT_PATH}`)
} finally {
    rmSync(tmpDir, { recursive: true, force: true })
}