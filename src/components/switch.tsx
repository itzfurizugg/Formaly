interface SwitchProps {
    checked: boolean
    onChange: () => void
    label: string
    className?: string
    disabled?: boolean
}

function Switch({ checked, onChange, label, className = "", disabled = false }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-done/40 ${
                checked ? "bg-done" : "bg-darks/20 dark:bg-white/25"
            } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        >
            <span
                className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    )
}

export default Switch
