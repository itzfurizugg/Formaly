import { useState, useRef, useEffect } from "react"

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
            {/* Single rounded-full container with overflow-hidden — no join/join-item,
                so every child corner just gets clipped by this one radius. No fighting radii. */}
            <div
                className={`flex items-stretch w-full rounded-full overflow-hidden bg-base-100 transition-all duration-200 ${focused
                        ? "ring-2 ring-darks/50 shadow-md"
                        : "ring-1 ring-tinted/50 shadow-sm hover:ring-tinted/80"
                    }`}
            >
                <div className="flex-1 relative flex items-center min-w-0">
                    <span
                        className={`absolute left-4 text-base font-medium pointer-events-none select-none transition-colors duration-200 ${focused ? "text-darks" : "text-tinted"
                            }`}
                    >
                        @
                    </span>

                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari berdasarkan tag..."
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        className="w-full h-full pl-11 pr-9 py-3 border-none outline-none bg-transparent"
                    />

                    {tag && (
                        <button
                            onClick={handleClear}
                            className="absolute right-2 w-5 h-5 rounded-full flex items-center justify-center text-tinted hover:text-base-content hover:bg-tinted/20 transition-colors duration-150"
                            aria-label="Hapus"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <button
                    className="shrink-0 bg-darks text-base-100 px-6 font-medium hover:brightness-110 active:scale-95 transition-all duration-150 disabled:opacity-60"
                    onClick={handleJoin}
                    disabled={loading || !tag.trim()}
                >
                    {loading ? <span className="loading loading-spinner loading-xs"></span> : "Cari"}
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