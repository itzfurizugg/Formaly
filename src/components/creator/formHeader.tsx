import { useState } from "react"

const GRADIENTS = [
    "from-slate-600 to-slate-800",
    "from-emerald-600 to-emerald-800",
    "from-indigo-500 to-indigo-700",
    "from-teal-600 to-teal-800",
    "from-rose-500 to-rose-700",
    "from-violet-500 to-violet-700",
    "from-cyan-600 to-cyan-800",
    "from-amber-500 to-amber-700",
]

function hashString(str: string) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

interface FormHeaderProps {
    formId: string
    title: string
    headerImage?: string | null
    /** Warna latar hex pilihan creator; menang atas gambar header bila diatur. */
    headerColor?: string | null
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function FormHeader({ formId, title, headerImage, headerColor }: FormHeaderProps) {
    const [failed, setFailed] = useState(false)

    // Gambar header menang atas warna kustom: kalau link foto sudah ada,
    // gunakan versi foto. Warna hanya dipakai bila gambar kosong/gagal dimuat.
    if (headerImage && !failed) {
        return (
            <img
                src={headerImage}
                alt={`Header ${title}`}
                loading="lazy"
                onError={() => setFailed(true)}
                className="w-full aspect-[3105/1100] object-cover border-b border-second"
            />
        )
    }

    // Warna kustom dari creator dipakai bila tidak ada gambar (atau gagal dimuat).
    const useCustomColor = !!headerColor && HEX_COLOR_RE.test(headerColor)

    if (useCustomColor) {
        return (
            <div
                aria-hidden="true"
                className="relative flex w-full aspect-[3105/1100] items-center overflow-hidden border-b border-second px-5 sm:px-10"
                style={{ backgroundColor: headerColor! }}
            >
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                        backgroundSize: "16px 16px",
                    }}
                />
                <div className="absolute -top-10 -right-10 h-35 w-35 rounded-full bg-white/15" />
                <div className="absolute -bottom-12 -left-8 h-30 w-30 rounded-full bg-white/10" />

                <span className="relative z-10 line-clamp-2 max-w-[85%] text-xl font-semibold text-white drop-shadow-sm sm:text-4xl">
                    {title}
                </span>
            </div>
        )
    }

    const gradient = GRADIENTS[formId ? hashString(formId) % GRADIENTS.length : 0]

    return (
        <div
            aria-hidden="true"
            className={`relative flex w-full aspect-[3105/1100] items-center overflow-hidden border-b border-second px-5 sm:px-10 bg-gradient-to-br ${gradient}`}
        >
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                }}
            />
            <div className="absolute -top-10 -right-10 h-35 w-35 rounded-full bg-white/15" />
            <div className="absolute -bottom-12 -left-8 h-30 w-30 rounded-full bg-white/10" />

            <span className="relative z-10 line-clamp-2 max-w-[85%] text-xl font-semibold text-white drop-shadow-sm sm:text-4xl">
                {title}
            </span>
        </div>
    )
}

export default FormHeader