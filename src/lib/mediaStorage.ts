// Library untuk upload & hapus media ke storage server custom Formaly.
// Base URL & API Key diambil dari environment variables (Vite).

const STORAGE_BASE_URL = (import.meta.env.VITE_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, "") || "https://storage.formaly.my.id"
const STORAGE_API_KEY = import.meta.env.VITE_STORAGE_API_KEY as string | undefined

// Ekstensi file yang diizinkan (mirror validasi server)
const ALLOWED_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".mp3",
    ".gif"
])

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

/**
 * Validasi ekstensi file di sisi client.
 * @param filename Nama file
 * @returns true jika ekstensi diizinkan
 */
function isAllowedExtension(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."))
    return ALLOWED_EXTENSIONS.has(ext)
}

/**
 * Validasi ukuran file di sisi client.
 * @param size Ukuran file dalam bytes
 * @returns true jika ukuran <= 100 MB
 */
function isAllowedSize(size: number): boolean {
    return size <= MAX_FILE_SIZE
}

/**
 * Ekstrak path relatif dari URL atau path.
 * Server mengembalikan path relatif (mis. "/media/2026/09/03/1234abcd.png").
 * Fungsi ini menerima URL lengkap atau path relatif dan mengembalikan path relatif.
 */
function extractPath(input: string): string {
    try {
        const url = new URL(input)
        return url.pathname
    } catch {
        // Bukan URL valid, anggap sudah path relatif
        return input.startsWith("/") ? input : `/${input}`
    }
}

/** Opsi tambahan untuk proses upload. */
export interface UploadMediaOptions {
    /**
     * Callback progres upload. Dipanggil berulang kali dengan fraksi 0..1
     * selama badan request sedang dikirim ke server (jika browser/mode
     * jaringan mendukung pelaporan progres; tidak selalu tersedia).
     */
    onProgress?: (fraction: number) => void
}

/**
 * Upload file media ke storage server.
 * @param file File yang akan di-upload
 * @param options Opsi tambahan (mis. callback progres upload)
 * @returns Promise yang resolve ke URL lengkap media (base URL + path relatif)
 * @throws Error dengan pesan dalam Bahasa Indonesia jika gagal
 */
export async function uploadMedia(file: File, options?: UploadMediaOptions): Promise<string> {
    // Validasi ekstensi
    if (!isAllowedExtension(file.name)) {
        throw new Error(
            `Ekstensi file tidak didukung. Format yang diizinkan: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}.`
        )
    }

    // Validasi ukuran
    if (!isAllowedSize(file.size)) {
        throw new Error(`Ukuran file melebihi batas maksimal 100 MB.`)
    }

    const formData = new FormData()
    formData.append("file", file)

    // fetch() tidak menyediakan event progres saat upload, jadi pakai
    // XMLHttpRequest supaya progress bar bisa ditampilkan ke user.
    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `${STORAGE_BASE_URL}/upload`)
        if (STORAGE_API_KEY) {
            xhr.setRequestHeader("Authorization", `Bearer ${STORAGE_API_KEY}`)
        }

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && options?.onProgress) {
                options.onProgress(Math.min(e.loaded / e.total, 1))
            }
        }

        xhr.onload = () => {
            try {
                const responseText = xhr.responseText

                if (xhr.status < 200 || xhr.status >= 300) {
                    let errorMessage = `Upload gagal dengan status ${xhr.status}.`
                    try {
                        const errorData = JSON.parse(responseText)
                        if (errorData?.error) {
                            errorMessage = errorData.error
                        }
                    } catch {
                        // Abaikan error parsing JSON
                    }
                    reject(new Error(errorMessage))
                    return
                }

                const data = JSON.parse(responseText)
                const relativePath = data?.url

                if (!relativePath) {
                    reject(new Error("Respons server tidak valid: URL media tidak ditemukan."))
                    return
                }

                // Gabungkan base URL + path relatif
                resolve(`${STORAGE_BASE_URL}${relativePath}`)
            } catch (err) {
                reject(err instanceof Error ? err : new Error("Terjadi kesalahan jaringan saat mengupload media."))
            }
        }

        xhr.onerror = () => reject(new Error("Terjadi kesalahan jaringan saat mengupload media.", { cause: new Error("network error") }))
        xhr.onabort = () => reject(new Error("Upload dibatalkan."))

        xhr.send(formData)
    })
}

/**
 * Hapus file media dari storage server.
 * @param fileUrlOrPath URL lengkap atau path relatif file (mis. "/media/2026/09/03/1234abcd.png")
 * @returns Promise yang resolve ke boolean (true jika berhasil, false jika gagal)
 */
export async function deleteMedia(fileUrlOrPath: string): Promise<boolean> {
    const path = extractPath(fileUrlOrPath)

    const headers: Record<string, string> = {}
    if (STORAGE_API_KEY) {
        headers["Authorization"] = `Bearer ${STORAGE_API_KEY}`
    }

    try {
        const response = await fetch(`${STORAGE_BASE_URL}/delete?path=${encodeURIComponent(path)}`, {
            method: "DELETE",
            headers,
        })

        if (!response.ok) {
            return false
        }

        const data = await response.json()
        return data?.message === "File berhasil dihapus dari server"
    } catch {
        return false
    }
}

/**
 * Tentukan tipe media berdasarkan ekstensi nama file atau URL.
 * @param filenameOrUrl Nama file atau URL
 * @returns 'image' | 'video' | 'audio' | null
 */
export function getMediaType(filenameOrUrl: string): "image" | "video" | "audio" | null {
    const lower = filenameOrUrl.toLowerCase()
    const ext = lower.substring(lower.lastIndexOf("."))

    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        return "image"
    }
    if ([".mp4", ".mkv", ".mov", ".avi", ".gif"].includes(ext)) {
        return "video"
    }
    if ([".mp3"].includes(ext)) {
        return "audio"
    }
    return null
}

/**
 * Format ukuran file untuk ditampilkan ke user.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}