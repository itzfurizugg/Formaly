import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search as SearchIcon, FileText } from "lucide-react"
import Search from "../components/search"
import Card from "../components/card"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth"
import Loading from "../components/loading"

interface FormItem {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
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
    const [search, setSearch] = useState("")
    const [forms, setForms] = useState<FormItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTag, setActiveTag] = useState("")
    const [tagLoading, setTagLoading] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        loadForms()
    }, [user, authLoading, navigate])

    async function loadForms() {
        setLoading(true)
        const { data, error } = await supabase
            .from("forms")
            .select(`
                id,
                title,
                description,
                duration,
                created_at,
                users:creator_id (
                    name
                ),
                questions (
                    id
                )
            `)
            .order("created_at", { ascending: false })

        if (data) {
            const formatted = (data as unknown as FormRecord[]).map((f) => ({
                id: f.id,
                title: f.title,
                description: f.description,
                author_name: f.users?.name || "Creator",
                duration: f.duration || 0,
                question_count: f.questions ? f.questions.length : 0
            }))
            setForms(formatted)
        }

        if (error) {
            console.error("Gagal memuat form:", error)
        }

        setLoading(false)
    }

    const handleTagSearch = async (tag: string) => {
        setActiveTag(tag)
        setTagLoading(true)
        try {
            const { data: tagRow } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tag)
                .maybeSingle()

            if (!tagRow) {
                setForms([])
                return
            }

            const { data: rel } = await supabase
                .from("form_tags")
                .select("form_id")
                .eq("tag_id", tagRow.id)

            if (!rel || rel.length === 0) {
                setForms([])
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

            if (matches.length === 1) {
                navigate("/form/description", { state: { form: matches[0] } })
            } else if (matches.length > 1) {
                setForms(matches)
            }
        } finally {
            setTagLoading(false)
        }
    }

    const filtered = forms.filter(
        (f) =>
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.author_name.toLowerCase().includes(search.toLowerCase())
    )

    if (authLoading || !user) return <Loading />

    return (
        <div>
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 pt-5 pb-6 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-darks">
                    Mulai mengerjakan!
                </h1>
                <p className="text-tinted mt-3 max-w-md">
                    Cari formulir berdasarkan tag yang kamu ketahui, lalu kerjakan.
                </p>

                <div className="w-full max-w-xl mt-8">
                    <Search onSearch={handleTagSearch} loading={tagLoading} />
                    {activeTag && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <span className="text-sm text-tinted">Tag:</span>
                            <button
                                onClick={() => {
                                    setActiveTag("")
                                    loadForms()
                                }}
                                className="badge badge-ghost text-tinted rounded-full text-xs cursor-pointer hover:text-wrong"
                                title="Hapus filter tag"
                            >
                                {activeTag} &times;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Home