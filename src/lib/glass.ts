/**
 * Deteksi dukungan backdrop-filter (blur di belakang elemen).
 *
 * Beberapa browser yang dipakai untuk membuka versi deploy (System WebView
 * Android lama, tab-in-app, dll.) tidak menerapkan backdrop-filter sehingga
 * efek liquid glass tampak "hilang". Komponen memakai hasil boolean ini untuk
 * memilih kelas glass versi solid (fallback) vs versi transparan + blur.
 *
 * CATATAN: sengaja dipakai deteksi JS, bukan @supports di CSS, karena
 * Lightning CSS (mesin Tailwind v4) melepas wrapper @supports saat build
 * sehingga fallback malah bocor ke semua browser.
 */

function detectBackdropFilterSupport(): boolean {
    if (typeof window === "undefined") return true
    const s = window.CSS?.supports
    if (typeof s !== "function") return true
    return s("backdrop-filter", "blur(1px)") || s("-webkit-backdrop-filter", "blur(1px)")
}

/** Dihitung sekali saat module dimuat (SPA, tanpa SSR). */
export const BACKDROP_FILTER_SUPPORTED = detectBackdropFilterSupport()