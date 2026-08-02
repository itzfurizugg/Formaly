import { Link } from "react-router-dom"
import { Clock, FileText, Check, X } from "lucide-react"

interface CardProps {
    title: string
    author: string
    duration: string
    questions: number
    score: number
    to: string
    buttonLabel?: string
    state?: Record<string, unknown>
    passingScore?: number | null
}

function HistoryCard({ title, author, duration, questions, score, to, buttonLabel = "Lihat Hasil", state, passingScore = null }: CardProps) {
    return (
        <div className="card bg-base border border-second rounded-none">
            <div className="card-body">
                <span
                    className={`badge border-none ${
                        passingScore != null && score < passingScore ? "bg-wrong/10 text-wrong" : "bg-done/10 text-done"
                    }`}
                >
                    {passingScore != null && score < passingScore ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {passingScore != null && score < passingScore ? "Gagal" : "Selesai"}
                </span>
                <span className={`flex items-center gap-1 font-semibold ${passingScore != null && score < passingScore ? "text-wrong" : "text-done"}`}>
                    Skor: {score}
                </span>
                <div className="flex items-start justify-between gap-3">
                    <h2 className="card-title text-darks">{title}</h2>
                </div>
                <p className="text-sm text-tinted">Oleh <span className="font-semibold text-accents">{author}</span></p>
                <div className="flex items-center gap-4 mt-3 text-xs text-tinted/70">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {duration}
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {questions} soal
                    </span>
                </div>
                <div className="card-actions justify-end mt-3">
                    <Link
                        to={to}
                        state={state}
                        className="btn rounded-none bg-darks text-base border-none h-9 min-h-0"
                    >
                        {buttonLabel}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default HistoryCard
