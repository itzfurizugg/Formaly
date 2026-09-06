import { useCallback, useRef, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { FILE_UPLOAD_DEFAULTS } from "../lib/questionConfig"

interface FileAnswerUploadProps {
    /** File jawaban saat ini (untuk soal tipe file_upload). */
    value: File | null
    onChange: (file: File | null) => void
    accept?: string
    maxMB?: number
}

/**
 * Komponen upload file untuk jawaban soal "file_upload" (sisi responden).
 *
 * TODO(backend): kolom penyimpanan URL jawaban file & endpoint upload
 * (storage.formaly.my.id) ke tabel answers menyusul. Untuk sekarang file hanya
 * disimpan di state saat mengerjakan form; submit handler di halaman soal
 * belum mengirim file ke server (masih placeholder).
 */
export default function FileAnswerUpload({
    value,
    onChange,
    accept = FILE_UPLOAD_DEFAULTS.types.join(","),
    maxMB = FILE_UPLOAD_DEFAULTS.maxMB,
}: FileAnswerUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFile = useCallback(
        (file: File | null) => {
            if (!file) return
            if (file.size > maxMB * 1024 * 1024) {
                setError(`Ukuran file melebihi batas maksimal ${maxMB} MB.`)
                return
            }
            setError(null)
            onChange(file)
        },
        [onChange, maxMB]
    )

    if (value) {
        return (
            <div className="flex items-center gap-2 px-3.5 py-3 bg-base border border-second rounded-lg">
                <FileText className="h-4 w-4 text-darks shrink-0" />
                <span className="text-sm text-darks truncate flex-1">{value.name}</span>
                <span className="text-xs text-tinted shrink-0">
                    {(value.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label="Hapus file"
                    className="text-tinted hover:text-wrong transition-colors shrink-0"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        )
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full text-left px-3.5 py-4 rounded-lg border-2 border-dashed border-second hover:border-done/60 text-darks transition-colors flex items-center justify-center gap-2"
            >
                <Upload className="h-4 w-4" />
                <span className="text-sm">Klik untuk mengunggah file jawaban</span>
            </button>
            <p className="text-xs text-tinted mt-1 px-1">
                Format: {FILE_UPLOAD_DEFAULTS.types.join(", ")} · Maks {maxMB} MB
            </p>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    handleFile(e.target.files?.[0] ?? null)
                    e.target.value = ""
                }}
            />
            {error && <p className="text-xs text-wrong mt-1 px-1">{error}</p>}
        </div>
    )
}