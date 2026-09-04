import { Link } from "react-router-dom"
import { Clock, FileText } from "lucide-react"
import FormHeader from "./creator/formHeader"

interface CardProps {
    formId: string
    title: string
    author: string
    duration: string
    questions: number
    score: number
    to: string
    state?: Record<string, unknown>
    passingScore?: number | null
    hideScore?: boolean
    headerImage?: string | null
    headerColor?: string | null
    headerMedia?: string | null
}

function HistoryCard({ formId, title, author, duration, questions, score, to, state, passingScore = null, hideScore = false, headerImage = null, headerColor = null, headerMedia = null }: CardProps) {
    const failed = !hideScore && passingScore != null && score < passingScore

    return (
        <Link
            to={to}
            state={state}
            className="card bg-white border border-second rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-darks/5 active:scale-[0.98] overflow-hidden cursor-pointer h-full"
        >
            <FormHeader formId={formId} title={title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
            <div className="card-body gap-4 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold font-display text-darks break-words leading-snug">
                            {title}
                        </h2>
                        <p className="text-sm text-tinted mt-0.5">Oleh <span className="font-semibold text-darks">{author}</span></p>
                    </div>
                    <span
                        className={`shrink-0 badge rounded-full text-xs font-medium px-2 border-none ${hideScore
                            ? "bg-tinted/10 text-tinted"
                            : failed
                                ? "bg-wrong/10 text-wrong"
                                : "bg-done/10 text-done"
                        }`}
                    >
                        {hideScore ? "Selesai" : failed ? <> Gagal</> : <> Lulus</>}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinted">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> {questions} soal
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default HistoryCard
