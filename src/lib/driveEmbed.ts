// Dukungan embed Google Drive untuk editor Quill.
//
// Link berbagi Drive (mis. https://drive.google.com/file/d/FILE_ID/view?usp=sharing)
// dikonversi menjadi iframe https://drive.google.com/file/d/FILE_ID/preview agar
// gambar/video/PDF ditayangkan langsung tanpa kena rate-limit uc?export=view.
//
// Jenis media ditandai eksplisit lewat fragment URL (#media=audio|photo; tanpa
// fragment berarti video). Penanda ikut tersimpan di konten sehingga renderer
// (mediaGui.ts) tahu player apa yang harus dibangun — 100% deterministik dan
// persist di Supabase.
//
// Catatan penting: link yang di-paste/diketik di badan editor TETAP menjadi
// link biasa — tidak ada konversi otomatis. Embed hanya dibuat lewat tombol
// toolbar Video/Audio/Foto (handler media) yang menyisipkan URL bertanda,
// lalu patch static sanitize blot "formats/video" menormalkannya sebelum
// iframe dibuat.
//
// File yang tidak dibagikan publik tetap aman: iframe /preview akan menampilkan
// UI "request access" milik Google sendiri, tanpa penanganan khusus.

import { Quill } from "react-quill-new"

/** Jenis media yang dikenali renderer untuk lampiran Drive. */
export type DriveMediaKind = "video" | "audio" | "photo"

/** Ambil FILE_ID dari berbagai bentuk link Google Drive:
 * /file/d/ID[/view][?usp=sharing], open?id=ID, uc?id=ID, atau sudah /preview. */
export function extractDriveFileId(src: string): string | null {
    const file = src.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/)
    if (file) return file[1]
    const param = src.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
    if (param) return param[1]
    return null
}

/** Baca penanda jenis media dari fragment URL. Default: video. */
export function extractDriveMediaKind(src: string): DriveMediaKind {
    const m = src.match(/#media=(audio|photo)\b/i)
    return m ? (m[1].toLowerCase() as DriveMediaKind) : "video"
}

/** Susun URL embed /preview beserta penanda jenis (fragment #media=…). */
export function buildDrivePreviewUrl(fileId: string, kind: DriveMediaKind = "video"): string {
    const base = `https://drive.google.com/file/d/${fileId}/preview`
    return kind === "video" ? base : `${base}#media=${kind}`
}

/** Ubah link Google Drive menjadi URL embed /preview; null bila bukan link Drive.
 * Penanda jenis pada input dipertahankan agar tidak hilang saat disanitasi ulang. */
export function toDrivePreviewUrl(src: string): string | null {
    const trimmed = src.trim()
    const id = extractDriveFileId(trimmed)
    if (!id) return null
    return buildDrivePreviewUrl(id, extractDriveMediaKind(trimmed))
}

/** Siapkan URL dari input creator untuk tombol toolbar media: link Drive
 * dinormalisasi ke /preview bertanda jenis; link lain (YouTube, dll)
 * diteruskan apa adanya. */
export function buildMediaEmbedUrl(rawUrl: string, kind: DriveMediaKind): string {
    const trimmed = rawUrl.trim()
    const id = extractDriveFileId(trimmed)
    if (!id) return trimmed
    return buildDrivePreviewUrl(id, kind)
}

interface VideoBlotStatic {
    sanitize: (url: string) => string
}

let installed = false

/**
 * Patch sekali di level modul: normalisasi URL pada blot video Quill sehingga
 * link Drive yang dimasukkan lewat toolbar video otomatis menjadi /preview
 * sebelum iframe dibuat (berlaku juga saat konten di-parse ulang dari HTML).
 * Perilaku URL non-Drive dipertahankan persis seperti sanitize bawaan Quill.
 */
export function installDriveEmbedSupport(): void {
    if (installed) return
    const VideoBlot = Quill.import("formats/video") as unknown as (VideoBlotStatic & Record<string, unknown>) | undefined
    if (!VideoBlot || typeof VideoBlot.sanitize !== "function") return

    const originalSanitize = VideoBlot.sanitize
    VideoBlot.sanitize = (url: string): string => {
        const preview = toDrivePreviewUrl((url ?? "").trim())
        if (preview) return preview
        return originalSanitize.call(VideoBlot, url)
    }
    installed = true
}
