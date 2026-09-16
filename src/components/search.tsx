import { useState, useRef, useEffect } from "react"
import { Search as SearchIcon } from "lucide-react"
import { Spinner } from "./loading"

interface SearchProps {
    onSearch: (tag: string) => void
    loading?: boolean
}

function Search({ onSearch, loading = false }: SearchProps) {
    const [tag, setTag] = useState("")
    const [focused, setFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleJoin = () => {
        if (!tag.trim()) return
        onSearch(tag.trim())
    }

    const handleClear = () => {
        setTag("")
        inputRef.current?.focus()
    }

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement !== inputRef.current) {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    return (
        <div className="w-full">
            <div
                className={`flex items-center w-full rounded-full border bg-white dark:bg-second transition-all duration-200 ${focused
                        ? "shadow-lg shadow-darks/10"
                        : "border-second dark:border-white/10 shadow-md shadow-darks/5 hover:border-tinted/50"
                    }`}
            >
                <div className="flex-1 relative flex items-center min-w-0">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari berdasarkan tag"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        className="w-full pl-5 pr-9 py-3 border-none outline-none bg-transparent placeholder:text-tinted text-darks"
                    />

                    {tag && (
                        <button
                            onClick={handleClear}
                            className="absolute right-2 w-5 h-5 rounded-full flex items-center justify-center text-tinted hover:text-base-content hover:bg-darks/10 transition-colors duration-150"
                            aria-label="Hapus"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <button
                    className="shrink-0 m-1 h-11 px-5 rounded-full bg-done text-base-100 font-medium flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all duration-150 disabled:opacity-50"
                    onClick={handleJoin}
                    disabled={loading || !tag.trim()}
                >
                    {loading ? (
                        <Spinner size={16} />
                    ) : (
                        <>
                            <SearchIcon className="h-4 w-4" />
                            <span className="hidden sm:block">Cari</span>
                        </>
                    )}
                </button>
            </div>
{/* 
            {tag.trim() && (
                <div className="flex items-center gap-1.5 mt-2 pl-4">
                    <span className="text-xs text-tinted">Mencari:</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-darks/10 text-darks rounded-full px-2.5 py-0.5">
                        @{tag.trim()}
                    </span>
                </div>
            )} */}
        </div>
    )
}

export default Search