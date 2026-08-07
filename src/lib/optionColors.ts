// Warna untuk opsi jawaban (Opsi A, Opsi B, ...) yang deterministik.
// Opsi pada posisi yang sama selalu mendapat warna yang sama persis di semua
// bar, legend, dan tooltip — karena warna di-generate dari index posisi opsi,
// bukan random per soal. Mendukung jumlah opsi berapa pun (tidak terbatas 5).

const OPTION_PALETTE = [
    "#3B82F6", // A - biru
    "#14B8A6", // B - toska
    "#EAB308", // C - kuning
    "#8B5CF6", // D - ungu
    "#F97316", // E - oranye
    "#EC4899", // F - pink
    "#22C55E", // G - hijau
    "#F43F5E", // H - rose
    "#06B6D4", // I - cyan
    "#F59E0B", // J - amber
    "#6366F1", // K - indigo
    "#84CC16", // L - lime
    "#0EA5E9", // M - sky
    "#A855F7", // N - ungu terang
    "#FACC15", // O - kuning terang
    "#10B981", // P - emerald
    "#FB7185", // Q - rose terang
    "#2DD4BF", // R - teal terang
]

// Indeks posisi opsi -> warna. Menghasilkan nilai yang sama setiap kali
// dipanggil untuk index yang sama (deterministik).
export function getOptionColor(index: number): string {
    if (index >= 0 && index < OPTION_PALETTE.length) {
        return OPTION_PALETTE[index]
    }
    // Melebihi palette: generate deterministik via hue HSL yang di-spasi merata
    // (golden angle) sehingga opsi berikutnya tetap punya warna berbeda.
    const hue = (index * 137.508) % 360
    return `hsl(${hue.toFixed(1)}, 70%, 45%)`
}
