import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Check, Clock } from "lucide-react"
import PageIndicator from "../../components/pageindicator"
import { dummyQuestions } from "../../lib/dummy"
import type { Answer } from "../../lib/dummy"

interface LocationState {
    current?: number
    answers?: Answer
}

function FormPage(props) {
    const location = useLocation()
    const locationState = location.state as LocationState | null

    const [current, setCurrent] = useState(locationState?.current || 0)
    const [answers, setAnswers] = useState<Answer>(locationState?.answers || {})
    const [timeLeft, setTimeLeft] = useState(300)

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    const question = dummyQuestions[current]
    const total = dummyQuestions.length
    
    const selectOption = (index: number) => {
        setAnswers({ ...answers, [question.id]: index })
    }

    const next = () => {
        if (current < total - 1) setCurrent(current + 1)
    }

    const prev = () => {
        if (current > 0) setCurrent(current - 1)
    }

    const navigate = useNavigate()

    const goToList = () => {
        navigate('/form/list', { state: { current, answers } })
    }

    return (
        <div className="flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-3xl xl:mt-15">
                <div className="p-2 mb-3 hidden sm:block">
                    <h1 className="text-l xl:text-4xl font-bold text-darks">AAT Konsentrasi Keahlian Kelas 11 RPL</h1>
                    <p className="text-xs text-tinted mt-1">
                        {current + 1} dari {total} soal
                    </p>
                </div>
                {/* 
                <div className="w-full bg-second rounded-full h-2 mt-4 mb-2">
                    <div
                        className="bg-done h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div> */}

                {/* <div className="mb-4">
                    <Indicator
                        total={total}
                        current={current}
                        answered={answers}
                        onSelect={goTo}
                    />
                </div> */}

                <div className="bg-white rounded-2xl border border-second p-6 shadow-sm rounded-none">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-s text-tinted font-semibold">Soal {current + 1}</p>
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${timeLeft <= 300
                                ? "bg-red-500/10 text-red-600"
                                : "bg-done/10 text-done"
                                }`}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {formattedTime}
                        </span>
                    </div>
                    <p className="text-base font-medium text-darks leading-relaxed">
                        {question.text}
                    </p>

                    <div className="mt-6 space-y-3">
                        {question.options.map((option, i) => {
                            const selected = answers[question.id] === i
                            return (
<button
                                        key={i}
                                        onClick={() => selectOption(i)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${selected
                                            ? "bg-darks border-darks text-white font-medium"
                                            : "bg-white border-second text-darks hover:border-darks/50"
                                            }`}
                                    >
                                    <span className="flex items-center gap-3">
                                        <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-darks bg-darks" : "border-tinted"
                                            }`}>
                                            {selected && <Check className="h-3 w-3 text-base" strokeWidth={3} />}
                                        </span>
                                        {option}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <PageIndicator total={total} current={current} answers={answers} onPrev={prev} onNext={next} onListClick={goToList} />
                    {current >= total - 1 && (
                        <button
                            className="btn text-white h-12 min-h-0 px-4 bg-done border-none rounded-none hover:opacity-90 disabled:opacity-25"
                            disabled={answers[dummyQuestions[total - 1].id] === undefined}
                        >
                            <Check className="h-4 w-4" />
                            Kirim
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FormPage
