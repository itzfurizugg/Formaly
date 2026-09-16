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
}

function PageIndicator({ total, current, onPrev, onNext, onListClick, isRagu = false, onRaguToggle, onRequestSubmit, submitting, groupRagu = false, label = "Soal", hideRagu = false }: PageIndicatorProps) {
    const isLast = current >= total - 1

    const nav = (
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
                // Di halaman terakhir tombol "Lanjut" tidak dirender, jadi sisi kanan
                // tombol ini jadi ujung grup join dan dibulatkan.
                className={`join-item btn h-12 min-h-0 px-4 bg-base-400 ${isLast ? "rounded-r-full" : ""}`}
            >
                {label} {current + 1}
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
        <>
            {hideRagu ? (
                nav
            ) : groupRagu ? (
                <div className="flex items-center gap-3">
                    {nav}
                    {ragu}
                </div>
            ) : (
                <>
                    {nav}
                    {ragu}
                </>
            )}
            {isLast && (
                <button
                    onClick={onRequestSubmit}
                    disabled={submitting}
                    className="btn text-white dark:text-second h-12 min-h-0 px-3.5 bg-done border-none rounded-full hover:opacity-90 disabled:opacity-25"
                >
                    {submitting ? <Spinner size={16} /> : <Check className="h-4 w-4" />}
                    {submitting ? "Mengirim..." : "Kirim"}
                </button>
            )}
        </>
    )
}

export default PageIndicator