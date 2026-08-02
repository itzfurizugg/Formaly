import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Library, FileText } from "lucide-react"
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

function Available() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [search, setSearch] = useState("")
    const [forms, setForms] = useState<FormItem[]>([])
    const [loading, setLoading] = useState(true)

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
        const { data } = await supabase
            .from("forms")
            .select(`
                id, title, description, duration,
                users:creator_id ( name ),
                questions ( id )
            `)
            .order("created_at", { ascending: false })

        if (data) {
            setForms(data.map((f: any) => ({
                id: f.id,
                title: f.title,
                description: f.description,
                author_name: f.users?.name || "Creator",
                duration: f.duration || 0,
                question_count: f.questions ? f.questions.length : 0
            })))
        }
        setLoading(false)
    }

    const filtered = forms.filter(
        (f) =>
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.author_name.toLowerCase().includes(search.toLowerCase())
    )

    if (authLoading || !user) return <Loading />

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <Library className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Tersedia</h1>
                </div>
                <p className="text-sm text-tinted mb-6">
                    Formulir yang tersedia untuk dikerjakan.
                </p>

                <div className="join w-full mb-6">
                    <div className="join-item flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cari formulir..."
                            className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">
                            {search ? "Formulir tidak ditemukan." : "Belum ada formulir tersedia."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((f) => (
                            <Card
                                key={f.id}
                                title={f.title}
                                author={f.author_name}
                                duration={`${f.duration} menit`}
                                questions={f.question_count}
                                to="/form/description"
                                buttonLabel="Kerjakan"
                                state={{ form: f }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Available
