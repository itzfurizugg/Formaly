import { getMediaType } from "../lib/mediaStorage"

interface QuestionMediaProps {
    url: string
    alt?: string
    maxHeight?: string
    className?: string
    onClick?: () => void
}

/**
 * Render media soal (gambar/video/audio) dengan rasio asli terjaga.
 * Gambar & video dibatasi tinggi (max-h) tapi lebarnya mengikuti aspek
 * media asli (tidak dipaksa w-full biar tidak melebar).
 */
export default function QuestionMedia({ url, alt = "Media soal", maxHeight = "max-h-40", className = "", onClick }: QuestionMediaProps) {
    const type = getMediaType(url)

    if (type === "image") {
        return (
            <img
                src={url}
                alt={alt}
                onClick={onClick}
                className={`${maxHeight} object-contain h-auto w-auto max-w-full ${onClick ? "cursor-pointer" : ""} ${className}`}
            />
        )
    }

    if (type === "video") {
        return <video src={url} controls preload="metadata" className={`${maxHeight} max-w-full h-auto w-auto object-contain ${className}`} />
    }

    if (type === "audio") {
        return <audio src={url} controls preload="metadata" className={`w-full ${className}`} />
    }

    return null
}
