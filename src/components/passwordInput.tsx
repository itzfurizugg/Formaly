import { useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
    value: string
    onChange: (value: string) => void
    className?: string
}

function PasswordInput({ value, onChange, className = "", ...rest }: PasswordInputProps) {
    const [visible, setVisible] = useState(false)

    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...rest}
                className={`input w-full bg-base border-second focus:border-done focus:outline-none transition-colors font-sans text-sm pr-11 placeholder:[-webkit-text-fill-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)] ${
                    visible
                        ? "text-darks"
                        : "text-transparent [-webkit-text-fill-color:transparent] caret-darks select-none selection:bg-transparent [&::selection]:text-transparent [&::selection]:[-webkit-text-fill-color:transparent]"
                }`}
            />
            {!visible && (
                <div
                    className="pointer-events-none absolute inset-y-0 left-3 right-11 flex items-center font-sans text-sm text-darks"
                    aria-hidden="true"
                >
                    {Array.from({ length: value.length }).map((_, i) => (
                        <svg key={i} width="0.6em" height="0.6em" viewBox="0 0 8 8" className="shrink-0">
                            <circle cx="4" cy="4" r="3" fill="currentColor" />
                        </svg>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tinted hover:text-darks transition-colors"
                aria-label={visible ? "Sembunyikan password" : "Lihat password"}
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    )
}

export default PasswordInput
