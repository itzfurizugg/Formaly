import { useState } from "react"
import { Plus, FileText, FileUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

interface CreateButtonProps {
    onCreate: () => void
    onImport: () => void
    label?: string
}

// Tombol Create dengan dropdown berisi "Buat Soal" & "Import Soal".
// Dropdown di-animasi dengan motion.dev (AnimatePresence untuk enter/exit).
function CreateButton({ onCreate, onImport, label = "Buat" }: CreateButtonProps) {
    const [open, setOpen] = useState(false)

    const pick = (fn: () => void) => {
        setOpen(false)
        fn()
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="btn bg-darks rounded-full text-base border-none h-9 min-h-0 flex items-center gap-2"
            >
                <Plus className="h-4 w-4" /> {label}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="create-backdrop"
                        className="fixed inset-0 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                )}
                {open && (
                    <motion.div
                        key="create-panel"
                        role="menu"
                        className="absolute right-0 top-full mt-2 z-50 min-w-[13rem] rounded-2xl bg-white border border-second shadow-xl overflow-hidden origin-top-right"
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                        <button
                            role="menuitem"
                            onClick={() => pick(onCreate)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-darks hover:bg-base transition-colors text-left"
                        >
                            <FileText className="h-4 w-4 text-done" /> Buat Soal
                        </button>
                        <button
                            role="menuitem"
                            onClick={() => pick(onImport)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-darks hover:bg-base transition-colors text-left border-t border-base"
                        >
                            <FileUp className="h-4 w-4 text-done" /> Import Soal
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default CreateButton