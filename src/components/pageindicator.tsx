import { ChevronLeft, ChevronRight } from "lucide-react"

interface PageIndicatorProps {
    total: number
    current: number
    answers: Record<number, number>
    onPrev: () => void
    onNext: () => void
    onListClick: () => void
}

function PageIndicator({ total, current, answers, onPrev, onNext, onListClick }: PageIndicatorProps) {
    const isLast = current >= total - 1

    return (
        <div className="join">
            <button
                className="join-item btn h-12 min-h-0 px-4 rounded-none"
                onClick={onPrev}
                disabled={current === 0}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                onClick={onListClick}
                className="join-item btn h-12 min-h-0 px-4 bg-base-400 rounded-none"
            >
                Soal {current + 1}
            </button>
            {!isLast && (
                <button
                    className="join-item btn h-12 min-h-0 px-4 rounded-none"
                    onClick={onNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

export default PageIndicator