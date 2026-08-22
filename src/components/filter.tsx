interface FilterOption {
    value: string
    label: string
}

interface FilterProps {
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
    name?: string
}

function Filter({ options, value, onChange, name = "filter" }: FilterProps) {
    return (
        <div className="filter flex flex-wrap items-center">
            <input
                className={`btn btn-square h-8 min-h-0 w-8 rounded-full! mb-1 ${value === "" ? "hidden" : ""}`}
                type="reset"
                value="×"
                onClick={() => onChange("")}
            />
            {options.map((opt) => (
                <input
                    key={opt.value}
                    className="btn h-8 min-h-0 rounded-full mb-1"
                    type="radio"
                    name={name}
                    aria-label={opt.label}
                    checked={value === opt.value}
                    onChange={() => onChange(opt.value)}
                />
            ))}
        </div>
    )
}

export default Filter
