import "cally"

interface CalendarProps {
    value?: string | null
    onChange?: (value: string) => void
    min?: string
    max?: string
    disabled?: boolean
}

function Calendar({ value, onChange, min, max, disabled }: CalendarProps) {
    return (
        <calendar-date
            className="cally bg-base-100 border border-base-300 shadow-lg rounded-box"
            value={value ?? ""}
            onchange={(e: Event) => {
                const target = e.target as HTMLElement & { value?: string }
                if (onChange && target.value) onChange(target.value)
            }}
            min={min}
            max={max}
            disabled={disabled ? true : undefined}
        >
            <svg aria-label="Previous" className="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
            <svg aria-label="Next" className="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
            <calendar-month></calendar-month>
        </calendar-date>
    )
}

export default Calendar
