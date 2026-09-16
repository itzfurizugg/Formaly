import { Check } from "lucide-react"
import { LAYOUT_QUIZ, LAYOUT_STANDARD, type FormLayoutMode } from "../../lib/formPages"

interface ModeSelectorProps {
    value: FormLayoutMode
    onChange: (mode: FormLayoutMode) => void
    /** Read-only display mode (e.g. on a section header). */
    disabled?: boolean
}

interface ModeOption {
    key: FormLayoutMode
    title: string
    description: string
    badge: string
}

const OPTIONS: ModeOption[] = [
    {
        key: LAYOUT_QUIZ,
        title: "Quiz / Ujian",
        description: "1 soal per halaman. Soal baru otomatis membuat halaman sendiri.",
        badge: "1 soal = 1 halaman",
    },
    {
        key: LAYOUT_STANDARD,
        title: "Form Biasa",
        description: "Beberapa soal dalam satu halaman (section). Bebas mengelompokkan soal.",
        badge: "Banyak soal per halaman",
    },
]

// Dua kartu pilihan mode form (Quiz/Ujian vs Form Biasa).
// Mode menentukan constraint soal, bukan cuma tampilan.
function ModeSelector({ value, onChange, disabled = false }: ModeSelectorProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIONS.map((opt) => {
                const selected = value === opt.key
                return (
                    <button
                        key={opt.key}
                        type="button"
                        disabled={disabled}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(opt.key)}
                        className={`relative text-left rounded-xl border p-4 transition-all duration-200 focus:outline-none ring-offset-2 ring-offset-white ${
                            selected
                                ? "border-done bg-done/5 ring-2 ring-done/30"
                                : "border-second bg-white hover:border-done/50 hover:shadow-sm"
                        } ${disabled ? "opacity-100 cursor-default" : "cursor-pointer"}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold ${selected ? "text-done" : "text-darks"}`}>
                                    {opt.title}
                                </p>
                                <p className="text-xs text-tinted mt-1 leading-relaxed">{opt.description}</p>
                                <span className="inline-flex mt-2.5 items-center gap-1.5 rounded-full bg-base border border-second px-2.5 py-0.5 text-[11px] text-tinted">
                                    {opt.badge}
                                </span>
                            </div>
                            <span
                                className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                    selected ? "border-done bg-done" : "border-tinted/40 bg-white"
                                }`}
                            >
                                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                            </span>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

export default ModeSelector