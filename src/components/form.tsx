import { Link } from "react-router-dom"
import { Play, Clock, FileText, ChevronRight } from "lucide-react"

interface FormProps {
    title: string
    author: string
    duration: string
    questions: number
    to: string
    buttonLabel?: string
    state?: Record<string, unknown>
}

function Form({ title, author, duration, questions, to, buttonLabel = "Mulai", state }: FormProps) {
    return (
        <>
            {/* LAYOUT MOBILE (< md) — list row flat tanpa card */}
            <Link
                to={to}
                state={state}
                className="md:hidden flex items-center gap-3 px-1 py-4 border-b border-tinted/15 last:border-b-0 group"
            >
                <span className="shrink-0 w-9 h-9 rounded-full bg-second border border-tinted/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-done" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-darks truncate">{title}</span>
                    <span className="block text-xs text-tinted truncate">
                        Oleh <span className="font-medium text-accents">{author}</span>
                    </span>
                    <span className="flex items-center gap-3 mt-1 text-[11px] text-tinted/70">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {duration}
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {questions} soal
                        </span>
                    </span>
                </span>
                <ChevronRight className="shrink-0 h-4 w-4 text-tinted/50 group-hover:text-done transition-colors" />
            </Link>

            {/* LAYOUT DESKTOP (>= md) — card */}
            <div className="hidden md:block card bg-base border border-second rounded-none">
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
                            state={state}
                            className="btn rounded-none bg-darks text-base border-none h-9 min-h-0"
                        >
                            <Play className="h-3 w-auto" fill="currentColor" strokeWidth={0} />
                            {buttonLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Form
