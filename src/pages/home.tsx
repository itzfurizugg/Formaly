import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Search from "../components/search"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import Loading from "../components/loading"

interface FormData {
    id: string
    title: string
    description: string
    duration: number
    author_name: string
    question_count: number
}

interface FormRecord {
    id: string
    title: string
    description: string
    duration: number
    users: { name: string } | null
    questions: { id: string }[]
}

function Home() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
    }, [user, authLoading, navigate])

    const handleTagSearch = async (tag: string) => {
        setSearching(true)
        setError("")
        try {
            const { data: tagRow } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tag)
                .maybeSingle()

            if (!tagRow) {
                setError(`Formulir dengan tag "${tag}" tidak ditemukan.`)
                return
            }

            const { data: rel } = await supabase
                .from("form_tags")
                .select("form_id")
                .eq("tag_id", tagRow.id)

            if (!rel || rel.length === 0) {
                setError(`Formulir dengan tag "${tag}" tidak ditemukan.`)
                return
            }

            const ids = rel.map((r) => r.form_id as string)
            const { data } = await supabase
                .from("forms")
                .select(`
                    id,
                    title,
                    description,
                    duration,
                    users:creator_id ( name ),
                    questions ( id )
                `)
                .in("id", ids)
                .order("created_at", { ascending: false })

            const matches = (data as unknown as FormRecord[]).map((f) => ({
                id: f.id,
                title: f.title,
                description: f.description,
                author_name: f.users?.name || "Creator",
                duration: f.duration || 0,
                question_count: f.questions ? f.questions.length : 0
            }))

            if (matches.length >= 1) {
                navigate("/form/description", { state: { form: matches[0] as FormData } })
            } else {
                setError(`Tag "${tag}" tidak ditemukan.`)
            }
        } finally {
            setSearching(false)
        }
    }

    if (authLoading || !user) return <Loading />

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-10 text-left lg:text-center">
            <div className="w-full max-w-xl">
                <h1 className="w-full text-4xl md:text-5xl font-bold text-darks">
                    Mulai mengerjakan!
                </h1>
                <p className="w-full text-tinted mt-3">
                    Cari formulir berdasarkan tag yang kamu ketahui, lalu kerjakan.
                </p>

                <div className="mt-8">
                    <Search onSearch={handleTagSearch} loading={searching} />
                    {error && <p className="text-sm text-wrong mt-3">{error}</p>}
                    {/* {activeTag && !error && (
                        <div className="flex items-center justify-start lg:justify-center gap-2 mt-3">
                            <span className="text-sm text-tinted">Tag:</span>
                            <button
                                onClick={clearTag}
                                className="badge badge-ghost text-tinted rounded-full text-xs cursor-pointer hover:text-wrong"
                                title="Hapus tag"
                            >
                                {activeTag} &times;
                            </button>
                        </div>
                    )} */}
                </div>
            </div>
        </div>
    )
}

export default Home