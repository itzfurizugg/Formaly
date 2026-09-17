import { Check, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react"
import { Spinner } from "./loading"

interface PageIndicatorProps {
    total: number
    current: number
    onPrev: () => void
    onNext: () => void
    onListClick: () => void
    isRagu?: boolean
    onRaguToggle: () => void
    onRequestSubmit: () => void
    submitting: boolean
    groupRagu?: boolean
    /** Label tampilan, mis. "Soal" (quiz) atau "Bagian" (standard). Default "Soal". */
    label?: string
    /** Sembunyikan tombol Ragu (mode standard — tanda ragu per soal tidak relevan). */
    hideRagu?: boolean
    compact?: boolean
}

function PageIndicator({ total, current, onPrev, onNext, onListClick, isRagu = false, onRaguToggle, onRequestSubmit, submitting, label = "Soal", hideRagu = false, compact = false }: PageIndicatorProps) {
    const isLast = current >= total - 1

    const nav = (
        <div className="join">
            <button
                className={`join-item btn min-h-0 rounded-l-full ${compact ? "h-9 px-2.5 text-xs" : "h-12 px-4"}`}
                onClick={onPrev}
                disabled={current === 0}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                onClick={onListClick}
                // Di halaman terakhir tombol "Lanjut" tidak dirender, jadi sisi kanan
                // tombol ini jadi ujung grup join dan dibulatkan.
                className={`join-item btn min-h-0 px-2.5 bg-base-400 text-xs ${compact ? "h-9" : "h-12"} ${isLast ? "rounded-r-full" : ""}`}
            >
                {label} {current + 1}
            </button>
            {!isLast && (
                <button
                    className={`join-item btn min-h-0 rounded-r-full ${compact ? "h-9 px-2.5" : "h-12 px-4"}`}
                    onClick={onNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            )}
        </div>
    )

    const ragu = (
        <button
            onClick={onRaguToggle}
            title={isRagu ? "Hapus tanda ragu-ragu" : "Tandai ragu-ragu"}
            className={`btn h-12 min-h-0 px-3.5 rounded-full ${isRagu ? "bg-warning text-white dark:text-second border-warning" : "bg-base text-tinted"}`}
        >
            <HelpCircle className="h-4 w-4" />
            Ragu
        </button>
    )

    return (
        <div className="flex w-full items-center gap-3">
            {nav}
            {!hideRagu && !isLast && <div className="ml-auto">{ragu}</div>}
            {!hideRagu && isLast && ragu}
            {isLast && (
                <button
                    onClick={onRequestSubmit}
                    disabled={submitting}
                    className={`btn ml-auto text-white dark:text-second min-h-0 px-3 bg-done border-none rounded-full hover:opacity-90 disabled:opacity-25 ${compact ? "h-9 text-xs" : "h-12"}`}
                >
                    {submitting ? <Spinner size={16} /> : <Check className="h-4 w-4" />}
                    {submitting ? "Mengirim..." : "Kirim"}
                </button>
            )}
        </div>
    )
}

export default PageIndicator