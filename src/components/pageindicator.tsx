import { ChevronLeft, ChevronRight } from "lucide-react"

interface PageIndicatorProps {
    total: number
    current: number
    onPrev: () => void
    onNext: () => void
    onListClick: () => void
}

function PageIndicator({ total, current, onPrev, onNext, onListClick }: PageIndicatorProps) {
    const isLast = current >= total - 1

    return (
        <div className="join">
            <button
                className="join-item btn h-12 min-h-0 px-4 rounded-l-full"
                onClick={onPrev}
                disabled={current === 0}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                onClick={onListClick}
                // Di halaman terakhir tombol next tidak dirender, jadi sisi kanan
                // tombol ini jadi ujung grup join dan dibulatkan.
                className={`join-item btn h-12 min-h-0 px-4 bg-base-400 ${isLast ? "rounded-r-full" : ""}`}
            >
                Soal {current + 1}
            </button>
            {!isLast && (
                <button
                    className="join-item btn h-12 min-h-0 px-4 rounded-r-full"
                    onClick={onNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

export default PageIndicator