import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { motion } from "motion/react"
import { Upload, X, AlertCircle } from "lucide-react"
import { uploadMedia, deleteMedia, getMediaType } from "../lib/mediaStorage"
import { easeOutExpo } from "../lib/motion"

/** Jenis media yang bisa dipilih. */
export type MediaType = "image" | "video" | "audio"

const TYPE_EXTENSIONS: Record<MediaType, string[]> = {
    image: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    video: [".mp4", ".mkv", ".mov", ".avi"],
    audio: [".mp3"],
}

interface MediaUploadProps {
    /** URL media saat ini (jika ada) */
    value?: string | null
    /**
     * Callback saat media berubah (null jika dihapus).
     * Kalau ini melakukan autosave ke server (mis. update Supabase), kembalikan
     * Promise yang reject kalau gagal — MediaUpload akan rollback (hapus file
     * yang baru diupload) kalau autosave-nya gagal, biar tidak ada file
     * nyangkut di storage tanpa referensi di database.
     */
    onChange: (url: string | null) => void | Promise<void>
    /** Label opsional untuk area upload */
    label?: string
    /** Teks bantuan tambahan */
    helpText?: string
    /** Jenis media yang boleh di-upload. Default: semua (gambar, video, audio). */
    allow?: MediaType[]
    /** Variant ringkas: satu baris (tombol + nama file + progres) alih-alih dropzone besar. */
    compact?: boolean
    /** Diberitahu setiap kali status upload berubah — dipakai parent (mis. tombol simpan modal) untuk menahan aksi selama upload. */
    onUploadingChange?: (uploading: boolean) => void
}

const MAX_FILE_SIZE = 100 * 1024 * 1024

function MediaUpload({ value, onChange, label = "Media", helpText, allow = ["image", "video", "audio"], compact = false, onUploadingChange }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const onUploadingChangeRef = useRef(onUploadingChange)
    useEffect(() => {
        onUploadingChangeRef.current = onUploadingChange
    }, [onUploadingChange])

    const setUploadingState = useCallback((v: boolean) => {
        setUploading(v)
        onUploadingChangeRef.current?.(v)
    }, [])

    const allowedExtensions = useMemo(
        () => allow.flatMap((type) => TYPE_EXTENSIONS[type]),
        [allow]
    )

    const mediaType = value ? getMediaType(value) : null

    const handleFileSelect = useCallback(
        async (file: File) => {
            // Validasi ekstensi
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
            if (!allowedExtensions.includes(ext as never)) {
                setError(`Format file tidak didukung. Gunakan: ${allowedExtensions.join(", ").toUpperCase()}.`)
                return
            }

            // Validasi ukuran
            if (file.size > MAX_FILE_SIZE) {
                setError("Ukuran file melebihi batas maksimal 100 MB.")
                return
            }

            setUploadingState(true)
            setUploadProgress(0)
            setError(null)

            // Simpan referensi media lama sebelum diganti, untuk dihapus nanti
            // kalau replace-nya berhasil.
            const previousValue = value

            let uploadedUrl: string
            try {
                uploadedUrl = await uploadMedia(file, { onProgress: setUploadProgress })
            } catch (err) {
                setError(err instanceof Error ? err.message : "Upload gagal. Silakan coba lagi.")
                setUploadingState(false)
                setUploadProgress(0)
                return
            }

            try {
                await Promise.resolve(onChange(uploadedUrl))
            } catch (err) {
                // Autosave/commit gagal setelah file berhasil diupload ke storage.
                // Jangan biarkan file nyangkut tanpa referensi, langsung hapus lagi.
                await deleteMedia(uploadedUrl).catch(() => {
                    console.error("Gagal rollback (hapus) media setelah autosave gagal:", uploadedUrl)
                })
                setError(err instanceof Error ? err.message : "Gagal menyimpan media. Silakan coba lagi.")
                setUploadingState(false)
                setUploadProgress(0)
                return
            }

            // Autosave berhasil. Kalau ini menggantikan media lama, hapus yang
            // lama dari storage (best-effort, tidak mem-block UI kalau gagal).
            if (previousValue && previousValue !== uploadedUrl) {
                deleteMedia(previousValue).catch(() => {
                    console.error("Gagal menghapus media lama saat replace:", previousValue)
                })
            }

            setUploadingState(false)
        },
        [onChange, value, allowedExtensions, setUploadingState]
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

        setUploadingState(true)
        setError(null)
        const targetUrl = value

        try {
            // Commit dulu ke server (mis. set kolom media_url jadi null) sebelum
            // menghapus file fisiknya, biar tidak ada state di mana DB masih
            // merujuk ke file yang sudah tidak ada.
            await Promise.resolve(onChange(null))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menghapus media. Silakan coba lagi.")
            setUploadingState(false)
            return
        }

        const success = await deleteMedia(targetUrl)
        if (!success) {
            console.error("Gagal menghapus file dari storage:", targetUrl)
        }

        setUploadingState(false)
    }, [value, onChange, setUploadingState])

    const handleClickUpload = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const formatList = allowedExtensions.map((ext) => ext.toUpperCase()).join(", ")

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

    // Variant ringkas: baris kecil berisi preview mini, nama file, dan tombol
    // aksi — dipakai di dalam modal/panel sempit supaya tidak memakan tempat.
    const renderCompact = () => {
        const fileName = value ? value.split("/").pop() : null

        return (
            <div>
                <div
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                        dragActive ? "border-done bg-done/5" : "border-second bg-base"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 h-9 w-12 rounded-md border border-second bg-white overflow-hidden flex items-center justify-center">
                            {value && mediaType === "image" ? (
                                <img src={value} alt="Preview media" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                                <Upload className="h-4 w-4 text-darks" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-darks truncate">
                                {fileName ?? "Upload media"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center shrink-0 gap-1.5">
                        {uploading ? (
                            <span className="text-xs font-medium text-done tabular-nums">
                                {Math.round(uploadProgress * 100)}%
                            </span>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleClickUpload}
                                    className="btn btn-xs bg-white text-darks border border-second hover:bg-second transition-colors"
                                >
                                    <Upload className="h-3 w-3" />
                                    {value ? "Ganti" : "Upload"}
                                </button>
                                {value && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        aria-label="Hapus media"
                                        className="btn btn-xs bg-white text-wrong border border-wrong/25 hover:bg-wrong/10 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {uploading && (
                    <div
                        className="mt-2"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(uploadProgress * 100)}
                        aria-label="Progres upload media"
                    >
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-second">
                            {uploadProgress > 0 ? (
                                <div
                                    className="h-full rounded-full bg-done transition-[width] duration-200 ease-out"
                                    style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                                />
                            ) : (
                                <motion.div
                                    className="h-full w-1/3 rounded-full bg-done"
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "320%" }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="mt-1.5 text-xs text-wrong flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        {error}
                    </p>
                )}
            </div>
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
                        Format: {formatList} · Maks 5 MB
                    </p>

                    {helpText && <p className="text-xs text-tinted/70 mt-1">{helpText}</p>}

                    {uploading ? (
                        <div
                            className="w-full max-w-xs mt-3"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(uploadProgress * 100)}
                            aria-label="Progres upload media"
                        >
                            <div className="h-2 w-full overflow-hidden rounded-full bg-second">
                                {uploadProgress > 0 ? (
                                    <div
                                        className="h-full rounded-full bg-done transition-[width] duration-200 ease-out"
                                        style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                                    />
                                ) : (
                                    <motion.div
                                        className="h-full w-1/3 rounded-full bg-done"
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "320%" }}
                                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}
                            </div>
                            <p className="mt-1.5 text-xs font-medium text-tinted">
                                {uploadProgress > 0 ? `${Math.round(uploadProgress * 100)}%` : "Menunggu proses server..."}
                            </p>
                        </div>
                    ) : (
                        error && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 text-sm text-wrong flex items-center gap-1.5"
                            >
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </motion.p>
                        )
                    )}
                </div>
            </motion.div>
        )
    }

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-darks mb-1.5 ml-1">{label}</label>

            <input
                ref={(el) => {
                    fileInputRef.current = el
                }}
                type="file"
                accept={allowedExtensions.join(",")}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploading}
            />

            {compact ? renderCompact() : value ? renderPreview() : renderDropzone()}

            {!compact && value && (
                <p className="text-xs text-tinted">
                    File:{" "}
                    <span className="font-mono text-darks">{value.split("/").pop()}</span>
                </p>
            )}
        </div>
    )
}

export default MediaUpload