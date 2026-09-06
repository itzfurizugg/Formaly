import type { DateTimeVariant } from "../lib/questionConfig"

interface DateTimeAnswerProps {
    variant: DateTimeVariant
    /** Nilai saat ini sebagai string ISO (YYYY-MM-DD, HH:mm, atau kombinasi dateTime). */
    value: string
    onChange: (iso: string) => void
}

/**
 * Input jawaban untuk soal tipe "date_time" (sisi responden).
 *
 * TODO(backend): kolom penyimpanan jawaban tanggal/jam menyusul; untuk sekarang
 * nilai dikirim sebagai string ISO lewat field answer_text.
 */
export default function DateTimeAnswer({ variant, value, onChange }: DateTimeAnswerProps) {
    const [date, time] = splitValue(value)

    const emit = (d: string, t: string) => {
        if (variant === "date_only") {
            onChange(d || "")
        } else if (variant === "time_only") {
            onChange(t || "")
        } else {
            onChange(d || t ? `${d}${d && t ? "T" : ""}${t}` : "")
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {(variant === "date_only" || variant === "date_and_time") && (
                <input
                    type="date"
                    value={date}
                    onChange={(e) => emit(e.target.value, time)}
                    className="input bg-white border-second focus:border-done focus:outline-none rounded-lg text-sm"
                />
            )}
            {(variant === "time_only" || variant === "date_and_time") && (
                <input
                    type="time"
                    value={time}
                    onChange={(e) => emit(date, e.target.value)}
                    className="input bg-white border-second focus:border-done focus:outline-none rounded-lg text-sm"
                />
            )}
        </div>
    )
}

function splitValue(value: string): [string, string] {
    if (!value) return ["", ""]
    if (value.includes("T")) {
        const [d, t] = value.split("T")
        return [d, (t || "").slice(0, 5)]
    }
    if (value.includes(":")) return ["", value.slice(0, 5)]
    return [value, ""]
}