import { useState, useCallback, useRef } from "react"
import { motion } from "motion/react"
import { Upload, X, AlertCircle } from "lucide-react"
import { uploadMedia, deleteMedia, getMediaType } from "../lib/mediaStorage"
import { easeOutExpo } from "../lib/motion"

interface MediaUploadProps {
    /** URL media saat ini (jika ada) */
    value?: string | null
    /** Callback saat media berubah (null jika dihapus) */
    onChange: (url: string | null) => void
    /** Label opsional untuk area upload */
    label?: string
    /** Teks bantuan tambahan */
    helpText?: string
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mkv", ".mov", ".avi", ".mp3"]
const MAX_FILE_SIZE = 100 * 1024 * 1024

function MediaUpload({ value, onChange, label = "Media", helpText }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const mediaType = value ? getMediaType(value) : null

    const handleFileSelect = useCallback(
        async (file: File) => {
            // Validasi ekstensi
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
            if (![".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mkv", ".mov", ".avi", ".mp3"].includes(ext)) {
                setError("Format file tidak didukung. Gunakan: JPG, PNG, WebP, MP4, MKV, MOV, AVI, MP3.")
                return
            }

            // Validasi ukuran
            if (file.size > MAX_FILE_SIZE) {
                setError("Ukuran file melebihi batas maksimal 100 MB.")
                return
            }

            setUploading(true)
            setError(null)

            try {
                const url = await uploadMedia(file)
                onChange(url)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Upload gagal. Silakan coba lagi.")
            } finally {
                setUploading(false)
            }
        },
        [onChange]
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setDragActive(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFileSelect(file)
        },
        [handleFileSelect]
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
    }, [])

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
            // Reset input value agar bisa pilih file yang sama lagi
            e.target.value = ""
        },
        [handleFileSelect]
    )

    const handleDelete = useCallback(async () => {
        if (!value) return

        setUploading(true)
        try {
            const success = await deleteMedia(value)
            if (success) {
                onChange(null)
            } else {
                setError("Gagal menghapus media dari server.")
            }
        } catch {
            setError("Gagal menghapus media. Silakan coba lagi.")
        } finally {
            setUploading(false)
        }
    }, [value, onChange])

    const handleClickUpload = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const formatList = ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", ")

    // Preview media berdasarkan tipe
    const renderPreview = () => {
        if (!value || !mediaType) return null

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: easeOutExpo }}
                className="relative group"
            >
                {mediaType === "image" && (
                    <img
                        src={value}
                        alt="Preview media"
                        className="w-full aspect-video object-cover border border-second rounded-none"
                        loading="lazy"
                    />
                )}
                {mediaType === "video" && (
                    <video
                        src={value}
                        controls
                        className="w-full aspect-video object-contain bg-base border border-second rounded-none"
                        preload="metadata"
                    />
                )}
                {mediaType === "audio" && (
                    <audio src={value} controls className="w-full" preload="metadata" />
                )}

                {/* Tombol hapus - muncul saat hover */}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={uploading}
                    aria-label="Hapus media"
                    className="absolute top-2 right-2 p-1.5 bg-darks/80 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-darks disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X className="h-4 w-4" />
                </button>
            </motion.div>
        )
    }

    // Dropzone / tombol upload
    const renderDropzone = () => {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: easeOutExpo }}
                className={`relative border-2 border-dashed rounded-none transition-colors ${
                    dragActive
                        ? "border-done bg-done/5"
                        : "border-second hover:border-done/50 hover:bg-base-50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClickUpload}
            >
                <input
                    ref={(el) => {
                        fileInputRef.current = el
                    }}
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    onChange={handleFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                />

                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <motion.div
                        animate={{ scale: dragActive ? 1.05 : 1 }}
                        transition={{ duration: 0.15 }}
                        className="mb-3"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-base border border-second rounded-none flex-shrink-0">
                            <Upload className="h-8 w-8 text-darks" />
                        </div>
                    </motion.div>

                    <p className="text-sm font-medium text-darks mb-1">
                        {uploading ? "Mengupload..." : `Klik atau tarik file ${label} ke sini`}
                    </p>

                    <p className="text-xs text-tinted mb-2 max-w-xs mx-auto">
                        Format: {formatList} · Maks 100 MB
                    </p>

                    {helpText && <p className="text-xs text-tinted/70 mt-1">{helpText}</p>}

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 text-sm text-wrong flex items-center gap-1.5"
                        >
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </motion.p>
                    )}
                </div>
            </motion.div>
        )
    }

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-darks mb-1.5 ml-1">{label}</label>

            {value ? renderPreview() : renderDropzone()}

            {value && (
                <p className="text-xs text-tinted">
                    File:{" "}
                    <span className="font-mono text-darks">{value.split("/").pop()}</span>
                </p>
            )}
        </div>
    )
}

export default MediaUpload