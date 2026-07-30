import { Link } from "react-router-dom"
import { Play, Clock, FileText } from "lucide-react"

interface CardProps {
    title: string
    author: string
    duration: string
    questions: number
    to: string
    buttonLabel?: string
}

function Card({ title, author, duration, questions, to, buttonLabel = "Mulai" }: CardProps) {
    return (
        <div className="card bg-base border border-second rounded-none">
            <div className="card-body">
                <h2 className="card-title text-darks">{title}</h2>
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
                        className="btn rounded-none bg-darks text-base border-none h-9 min-h-0"
                    >
                        <Play className="h-3 w-auto" fill="currentColor" strokeWidth={0} />
                        {buttonLabel}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Card
