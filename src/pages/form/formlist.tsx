import { useNavigate, useLocation } from "react-router-dom"

interface Question {
    id: number
    text: string
    options: string[]
}

interface Answer {
    [key: number]: number
}

interface LocationState {
    current?: number
    answers?: Answer
    formId?: string
    questions?: Question[]
}

function FormList() {
    const navigate = useNavigate()
    const location = useLocation()
    const locationState = location.state as LocationState | null
    const current = locationState?.current || 0
    const answers = locationState?.answers || {}
    const formId = locationState?.formId
    const questions = locationState?.questions || []

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <p className="text-tinted mb-4">Tidak ada data soal.</p>
                <button onClick={() => navigate("/")} className="btn bg-darks text-base border-none">
                    Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center px-4 py-6 pb-28 min-h-screen bg-base-300 lg:justify-center lg:pb-6">
            <div className="w-full max-w-3xl bg-base-300 lg:max-w-sm lg:bg-base-200 lg:rounded-md lg:p-6 lg:shadow-sm">
                <div className="p-2 mb-3 lg:p-0 lg:mt-0">
                    <h1 className="text-2xl lg:text-2xl font-bold text-darks">Daftar Soal</h1>
                    <p className="text-xs lg:text-sm text-tinted mt-1">
                        Daftar soal ujian
                    </p>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6 lg:grid-cols-5 lg:gap-2 lg:mb-6 lg:mt-4">
                    {questions.map((q, index) => {
                        const isCurrent = current === index
                        const isAnsweredQuestion = answers[q.id] !== undefined

                        return (
                            <button
                                key={q.id}
                                onClick={() => {
                                    navigate('/form', { state: { current: index, answers, formId, questions } })
                                }}
                                className={`aspect-square p-3 rounded-sm transition-all flex items-center justify-center text-xl lg:text-sm font-medium
                                    ${isCurrent
                                        ? "ring-2 ring-done ring-offset-1 bg-darks text-white"
                                        : isAnsweredQuestion
                                            ? "bg-darks text-white"
                                            : "bg-base-100 text-tinted border border-second hover:border-darks/50"
                                    }
                                `}
                            >
                                {index + 1}
                            </button>
                        )
                    })}
                </div>

                <button
                    onClick={() => navigate('/form', { state: { current, answers, formId, questions } })}
                    className="hidden lg:block btn w-full h-12 min-h-0 bg-darks text-white rounded-none hover:opacity-90"
                >
                    Kembali ke soal
                </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 pointer-events-none lg:hidden">
                <div className="bg-base-300 px-4 pb-4 pointer-events-auto">
                    <div className="w-full max-w-3xl mx-auto">
                        <button
                            onClick={() => navigate('/form', { state: { current, answers, formId, questions } })}
                            className="btn w-full h-12 min-h-0 bg-darks text-white rounded-none hover:opacity-90"
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