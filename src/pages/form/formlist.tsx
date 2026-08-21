import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"

interface Question {
    id: string
    is_required?: boolean
}

interface Answer {
    [key: string]: string | string[]
}

interface LocationState {
    current?: number
    answers?: Answer
    formId?: string
    questions?: Question[]
    deadline?: number
}

function FormList() {
    const navigate = useNavigate()
    const location = useLocation()
    const locationState = location.state as LocationState | null
    const current = locationState?.current || 0
    const answers = locationState?.answers || {}
    const formId = locationState?.formId
    const questions = locationState?.questions || []
    const deadline = locationState?.deadline

    const backToForm = (index: number) => {
        navigate(`/form/${formId}`, { state: { current: index, answers, questions, deadline } })
    }

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
            <div className="w-full max-w-4xl lg:bg-base-200 lg:rounded-md lg:p-6 lg:shadow-sm">
                <div className="mb-5 lg:p-0 lg:mt-0">
                    <h1 className="text-2xl lg:text-4xl font-bold text-darks">Daftar Soal</h1>
                    <p className="hidden sm:block text-xs lg:text-sm text-tinted mt-1">
                        Daftar soal ujian
                    </p>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-6 lg:grid-cols-8 lg:gap-3 lg:mb-6 lg:mt-4">
                    {questions.map((q, index) => {
                        const isCurrent = current === index
                        const isAnsweredQuestion = answers[q.id] !== undefined
                        const needsRequired = !!q.is_required && !isAnsweredQuestion

                        return (
                            <motion.button
                                key={q.id}
                                onClick={() => {
                                    backToForm(index)
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index * 20, 240) / 1000 }}
                                className={`relative aspect-square p-3 rounded-sm flex items-center justify-center text-xl lg:text-sm font-medium
                                    ${isCurrent
                                        ? "ring-2 ring-done ring-offset-1 bg-darks text-white"
                                        : isAnsweredQuestion
                                            ? "bg-darks text-white"
                                            : "bg-base-100 text-tinted border border-second hover:border-darks/50"
                                    }
                                `}
                            >
                                {index + 1}
                                {needsRequired && (
                                    <span className="absolute top-0.5 right-1.5 text-red-600 font-bold text-sm">*</span>
                                )}
                            </motion.button>
                        )
                    })}
                </div>

                <button
                            onClick={() => backToForm(current)}
                    className="hidden lg:block btn w-full h-12 min-h-0 bg-darks text-white rounded-xl hover:opacity-90"
                >
                    Kembali ke soal
                </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 pointer-events-none lg:hidden">
                <div className="bg-base-300 px-4 pb-4 pointer-events-auto">
                    <div className="w-full max-w-3xl mx-auto">
                        <button
                    onClick={() => backToForm(current)}
                            className="btn w-full h-12 mb-3 min-h-0 bg-darks text-white rounded-xl hover:opacity-90"
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