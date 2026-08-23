import { useState } from "react"
import { X } from "lucide-react"
import { isValidImageUrl } from "../../lib/imageUrl"

interface ImageUrlInputProps {
    value: string
    onChange: (value: string) => void
    label?: string
    placeholder?: string
}

// Input URL gambar untuk soal: validasi format http/https secara langsung,
// tombol hapus cepat, dan preview gambar di bawah input saat URL valid.
// Gambar tidak di-upload (storage terbatas); creator memakai link eksternal.
function ImageUrlInput({ value, onChange, label = "URL Gambar", placeholder = "https://..." }: ImageUrlInputProps) {
    const url = value.trim()
    const validFormat = isValidImageUrl(value)
    // Catat URL terakhir yang gagal dimuat agar pesan error hanya menempel
    // pada URL yang sedang diketik, bukan sisa URL sebelumnya.
    const [brokenUrl, setBrokenUrl] = useState<string | null>(null)

    return (
        <div>
            <label className="block text-sm font-medium text-darks mb-1.5 ml-1">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    className={`input w-full bg-base border pr-9 focus:outline-none transition-colors ${
                        url && !validFormat ? "border-wrong focus:border-wrong" : "border-second focus:border-done"
                    }`}
                    value={value}
                    onChange={(e) => {
                        setBrokenUrl(null)
                        onChange(e.target.value)
                    }}
                    placeholder={placeholder}
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => {
                            setBrokenUrl(null)
                            onChange("")
                        }}
                        aria-label="Hapus URL gambar"
                        title="Hapus URL gambar"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-tinted hover:text-darks transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {url && !validFormat && (
                <p className="text-xs text-wrong mt-1 ml-1">URL harus diawali http:// atau https://.</p>
            )}

            {validFormat && (
                <div className="mt-2 border border-second bg-base rounded-lg p-2 flex items-center justify-center min-h-[110px]">
                    {/* key={url} memaksa elemen dibuat ulang tiap ganti URL sehingga
                        event error dipicu lagi untuk link yang baru. */}
                    <img
                        key={url}
                        src={url}
                        alt="Preview gambar soal"
                        className="max-h-44 object-contain"
                        loading="lazy"
                        onError={() => setBrokenUrl(url)}
                    />
                </div>
            )}

            {validFormat && brokenUrl === url && (
                <p className="text-xs text-wrong mt-1 ml-1">
                    Gambar gagal dimuat. Pastikan link langsung menunjuk ke file gambarnya, bukan halaman share-nya.
                </p>
            )}
        </div>
    )
}

export default ImageUrlInput
