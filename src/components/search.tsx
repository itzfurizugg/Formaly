import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

interface FormResult {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
    question_count: number
}

function Search() {
    const navigate = useNavigate()
    const [token, setToken] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleJoin = async () => {
        if (!token.trim()) return
        setLoading(true)
        setError("")

        const { data, error: rpcError } = await supabase.rpc("get_form_by_token", {
            p_token: token.trim(),
        })

        setLoading(false)

        if (rpcError || !data || data.length === 0) {
            setError("Token tidak valid!")
            return
        }

        const form = data[0] as FormResult
        navigate("/form/description", { state: { form } })
    }

    return (
        <div className="join">
            <div>
                <label className="input validator join-item border-tinted">
                    <input
                        type="text"
                        placeholder="Masukan token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        required
                    />
                </label>
                {error && <div className="text-wrong text-sm mt-1">{error}</div>}
            </div>
            <button
                className="btn join-item bg-darks text-base border-none"
                onClick={handleJoin}
                disabled={loading}
            >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : "Join"}
            </button>
        </div>
    )
}

export default Search
