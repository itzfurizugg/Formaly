import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Play, FileText, Clock, User } from "lucide-react"

interface FormData {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
    question_count: number
}

function FormDescription() {
    const navigate = useNavigate()
    const location = useLocation()
    const form = (location.state as { form?: FormData })?.form

    if (!form) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <p className="text-tinted mb-4">Form tidak ditemukan.</p>
                <button onClick={() => navigate("/")} className="btn bg-darks text-base border-none">
                    Kembali ke Beranda
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center px-4 py-6 sm:px-6 sm:py-10">
            <div className="w-full max-w-2xl">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1 text-xs text-tinted hover:text-darks transition-colors mb-4"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Kembali
                </button>

                <div className="bg-white rounded-2xl border border-second p-5 sm:p-8 shadow-sm rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-darks leading-snug">
                            {form.title}
                        </h1>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 mt-4 text-xs sm:text-sm text-tinted">
                        <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            {form.author_name}
                        </span>
                        <span className="flex items-center gap-4 sm:gap-4">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {form.duration} menit
                            </span>
                            <span className="flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                {form.question_count} soal
                            </span>
                        </span>
                    </div>

                    <p className="text-sm text-tinted mt-4 leading-relaxed">
                        {form.description}
                    </p>

                    <button
                        className="btn bg-darks text-base border-none w-full mt-6 hover:opacity-90 transition-opacity rounded-none"
                        onClick={() => navigate("/form", { state: { formId: form.id } })}
                    >
                        <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                        Mulai Mengerjakan
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FormDescription
