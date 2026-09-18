import { motion } from "motion/react"
import { X } from "lucide-react"
import { RichText } from "../../components/richText"
import BackButton from "../backButton"

interface PreviewQuestion {
    id: string
    question_text: string
}

interface QuestionPreviewSidebarProps {
    title: string
    questions: PreviewQuestion[]
    onClose: () => void
    onSelect: (question: PreviewQuestion) => void
}

function QuestionPreviewSidebar({ title, questions, onClose, onSelect }: QuestionPreviewSidebarProps) {
    return (
        <motion.div
            className="fixed inset-0 z-[90] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} />
            <motion.aside
                className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-4 shadow-2xl dark:bg-second"
                onClick={(e) => e.stopPropagation()}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.8 }}
            >
                <BackButton />
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-darks">Preview Soal</h2>
                        <p className="text-xs text-tinted mt-0.5">{title}</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-ghost"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                    {questions.map((question, index) => (
                        <button key={question.id} onClick={() => onSelect(question)} className="w-full rounded-xl border border-second p-3 text-left hover:bg-base-200">
                            <span className="text-xs font-semibold text-tinted">Soal {index + 1}</span>
                            <div className="mt-1 text-sm text-darks"><RichText html={question.question_text} /></div>
                        </button>
                    ))}
                </div>
            </motion.aside>
        </motion.div>
    )
}

export default QuestionPreviewSidebar
