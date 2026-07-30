import { Link, useNavigate, useLocation } from "react-router-dom"
import { FileText } from "lucide-react"
import { dummyQuestions } from "../../lib/dummy"
import type { Answer } from "../../lib/dummy"

interface LocationState {
    current?: number
    answers?: Answer
}

function FormList() {
    const navigate = useNavigate()
    const location = useLocation()
    const locationState = location.state as LocationState | null
    const current = locationState?.current || 0
    const answers = locationState?.answers || {}

    return (
        <div className="flex flex-col items-center px-4 py-6 pb-28 min-h-screen bg-base-200">
            <div className="w-full max-w-3xl">
                <div className="p-2 mb-3 lg:mt-10">
                    <h1 className="text-2xl lg:text-4xl font-bold text-darks">AAT Konsentrasi Keahlian Kelas 11 RPL</h1>
                    <p className="text-xs lg:text-xl text-tinted mt-1">
                        Daftar soal ujian
                    </p>
                </div>

                <div className="grid grid-cols-5 lg:grid-cols-7 gap-2 mb-6">
                    {dummyQuestions.map((q, index) => {
                        const isCurrent = current === index
                        const isAnsweredQuestion = answers[q.id] !== undefined

                        return (
                            <button
                                key={q.id}
                                onClick={() => {
                                    navigate('/form', { state: { current: index, answers } })
                                }}
                                className={`aspect-square p-3 rounded-sm transition-all flex items-center justify-center text-xl lg:text-3xl font-medium
                                    ${isCurrent
                                        ? "ring-2 ring-done ring-offset-1 bg-darks text-white"
                                        : isAnsweredQuestion
                                        ? "bg-darks text-white"
                                        : "bg-base-200 text-tinted border border-second hover:border-darks/50"
                                    }
                                `}
                            >
                                {q.id}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Fixed dock di bawah + gradient fade */}
            <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
                <div className="h-20 bg-gradient-to-t from-base-200 to-transparent" />
                <div className="bg-base-200 px-4 pb-4 pointer-events-auto">
                    <div className="w-full max-w-3xl mx-auto">
                        <button
                            onClick={() => navigate(-1, { state: { current } })}
                            className="btn w-full h-12 lg:h-20 min-h-0 lg:mb-5 bg-darks lg:text-2xl text-white rounded-none hover:opacity-90"
                        >
                            Kembali ke soal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FormList