import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { easeOutExpo } from "../../lib/motion"

interface Question {
    id: string
    is_required?: boolean
}

interface Answer {
    [key: string]: string | string[]
}

interface SectionNav {
    id: string
    title: string
    questionIds: string[]
}

interface LocationState {
    current?: number
    answers?: Answer
    formId?: string
    questions?: Question[]
    deadline?: number
    submissionId?: string
    rages?: Record<string, boolean>
    sections?: SectionNav[]
    layoutMode?: string | null
}

// Daftar soal — mode quiz menampilkan grid nomor soal; mode standard
// menampilkan grid section (bagian/lanjutan antar bagian).
function FormList() {
    const navigate = useNavigate()
    const location = useLocation()
    const locationState = location.state as LocationState | null
    const current = locationState?.current || 0
    const answers = locationState?.answers || {}
    const formId = locationState?.formId
    const questions = locationState?.questions || []
    const deadline = locationState?.deadline
    const submissionId = locationState?.submissionId
    const rages = locationState?.rages || {}
    const sections = locationState?.sections || []
    const isStandard = !!sections.length && sections.length > 0
    const raguCount = questions.filter((q) => rages[q.id]).length

    const backToForm = (index: number) => {
        navigate(`/form/${formId}`, {
            state: {
                current: index,
                answers,
                questions,
                submissionId,
                deadline,
                rages,
                sections: isStandard ? sections : undefined,
                layoutMode: locationState?.layoutMode,
            },
        })
    }

    if (questions.length === 0 && sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-3.5">
                <p className="text-tinted mb-4">Tidak ada data soal.</p>
                <button onClick={() => navigate("/")} className="btn bg-darks text-base border-none">
                    Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center px-3.5 py-6 pb-28 min-h-screen bg-base-300 lg:justify-center lg:pb-6">
            <div className="w-full max-w-2xl lg:bg-base-200 lg:dark:bg-second lg:rounded-xl lg:p-6 lg:shadow-sm">
                <div className="mb-5 lg:p-0 lg:mt-0">
                    <h1 className="text-2xl lg:text-4xl font-bold text-darks">{isStandard ? "Daftar Bagian" : "Daftar Soal"}</h1>
                    <p className="hidden sm:block text-xs lg:text-sm text-tinted mt-1">
                        {isStandard ? "Lanjutkan ke bagian yang belum dikerjakan" : "Daftar soal ujian"}
                    </p>
                </div>

                {!isStandard ? (
                    <div className="grid grid-cols-5 gap-2 mb-6 lg:grid-cols-5 lg:gap-3 lg:mb-6 lg:mt-4">
                        {questions.map((q, index) => {
                            const isCurrent = current === index
                            const isAnsweredQuestion = answers[q.id] !== undefined
                            const needsRequired = !!q.is_required && !isAnsweredQuestion
                            const isRagu = !!rages[q.id]

                            return (
                                <motion.button
                                    key={q.id}
                                    onClick={() => {
                                        backToForm(index)
                                    }}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: easeOutExpo, delay: Math.min(index * 20, 240) / 1000 }}
                                    title={isRagu ? `Soal ${index + 1} ditandai ragu-ragu` : `Ke soal ${index + 1}`}
                                    className={`relative aspect-square w-full h-full p-3 rounded-xl flex items-center justify-center text-xl lg:text-4xl font-medium cursor-pointer transition-all duration-300 active:scale-[0.95]
                                        ${isCurrent
                                            ? "ring-2 ring-darks ring-offset-3 bg-white dark:bg-second text-darks shadow-lg shadow-darks/10"
                                            : isAnsweredQuestion
                                                ? "bg-done/30 text-done hover:shadow-lg hover:shadow-done/20"
                                                : "bg-white dark:bg-second text-tinted border border-second hover:shadow-lg hover:shadow-darks/5"
                                        }
                                        ${isRagu && !isCurrent ? "ring-1 ring-warning/80" : ""}
                                    `}
                                >
                                    {index + 1}
                                    {needsRequired && (
                                        <span className="absolute top-0.5 right-1.5 text-red-600 font-bold text-sm">*</span>
                                    )}
                                    {isRagu && (
                                        <span
                                            aria-label="Ragu-ragu"
                                            className="absolute bottom-1 left-1.5 h-2.5 w-2.5 rounded-full bg-warning shadow-sm"
                                        />
                                    )}
                                </motion.button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 lg:mb-6 lg:mt-4">
                        {sections.map((section, index) => {
                            const isCurrent = current === index
                            const sectionQuestions = section.questionIds.map((qid) => questions.find((q) => q.id === qid)).filter((q): q is Question => Boolean(q))
                            const answered = sectionQuestions.filter((q) => answers[q.id] !== undefined).length
                            const totalInSection = sectionQuestions.length
                            const needsRequired = sectionQuestions.some((q) => q.is_required && answers[q.id] === undefined)
                            const isComplete = totalInSection > 0 && answered === totalInSection

                            return (
                                <motion.button
                                    key={section.id}
                                    onClick={() => backToForm(index)}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: easeOutExpo, delay: Math.min(index * 40, 300) / 1000 }}
                                    className={`relative w-full p-4 rounded-xl flex flex-col gap-1 text-left cursor-pointer transition-all duration-300 active:scale-[0.97]
                                        ${isCurrent
                                            ? "ring-2 ring-darks ring-offset-3 bg-white dark:bg-second text-darks shadow-lg shadow-darks/10"
                                            : isComplete
                                                ? "bg-done/30 text-done hover:shadow-lg hover:shadow-done/20"
                                                : "bg-white dark:bg-second text-tinted border border-second hover:shadow-lg hover:shadow-darks/5"
                                        }
                                    `}
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wide text-tinted/70">Bagian {index + 1}</span>
                                    <span className="text-sm font-medium text-darks truncate">{section.title || "Tanpa judul"}</span>
                                    <span className="text-xs text-tinted">
                                        {answered} dari {totalInSection} soal dijawab
                                    </span>
                                    {needsRequired && (
                                        <span className="absolute top-3 right-3 text-red-600 font-bold text-sm">*</span>
                                    )}
                                </motion.button>
                            )
                        })}
                    </div>
                )}

                {raguCount > 0 && !isStandard && (
                    <p className="text-center text-xs text-tinted mb-6 flex items-center justify-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" />
                        {raguCount} soal ditandai ragu-ragu
                    </p>
                )}

                <button
                    onClick={() => backToForm(current)}
                    className="hidden lg:block btn w-fit px-5 mx-auto h-14 min-h-0 bg-darks text-lg text-white dark:text-second rounded-full hover:opacity-90"
                >
                    Kembali ke {isStandard ? "bagian" : "soal"}
                </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 pointer-events-none lg:hidden">
                <div className="bg-base-300 px-3.5 pb-4 pointer-events-auto">
                    <div className="w-full max-w-3xl">
                        <button
                            onClick={() => backToForm(current)}
                            className="btn flex w-auto p-6 h-16 mb-3 min-h-0 bg-darks text-lg text-white dark:text-second hover:opacity-90 rounded-full mx-auto items-center justify-center"
                        >
                            Kembali ke {isStandard ? "bagian" : "soal"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FormList