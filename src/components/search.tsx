import { useState } from "react"

interface SearchProps {
    onSearch: (tag: string) => void
    loading?: boolean
}

function Search({ onSearch, loading = false }: SearchProps) {
    const [tag, setTag] = useState("")

    const handleJoin = () => {
        if (!tag.trim()) return
        onSearch(tag.trim())
    }

    return (
        <div className="join w-full">
            <div className="join-item flex-1">
                <label className="input validator join-item border-tinted w-full">
                    <input
                        type="text"
                        placeholder="Masukkan tag formulir"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        required
                    />
                </label>
            </div>
            <button
                className="btn join-item bg-darks text-base border-none"
                onClick={handleJoin}
                disabled={loading}
            >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : "Cari"}
            </button>
        </div>
    )
}

export default Search