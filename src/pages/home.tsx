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

function Home() {
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
    }, [user, authLoading])

    async function loadForms() {
        setLoading(true)
        const { data } = await supabase
            .from("forms")
            .select("id, title, description, author_name, duration, question_count")
            .order("created_at", { ascending: false })

        if (data) setForms(data)
        setLoading(false)
    }

    const filtered = forms.filter(
        (f) =>
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.author_name.toLowerCase().includes(search.toLowerCase())
    )

    if (authLoading || !user) return <Loading />

    return (
        <div>
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 pt-10 pb-6 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-darks">
                    Mulai mengerjakan!
                </h1>
                <p className="text-tinted mt-3 max-w-md">
                    Masukan token yang diberikan untuk mulai mengerjakan.
                </p>

                <div className="w-full max-w-xl mt-8">
                    <Search />
                </div>
            </div>

            <div className="flex flex-col items-center px-6 pb-10">
                <div className="max-w-4xl w-full">
                    <div className="join w-full mb-6">
                        <div className="join-item flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Cari formulir tersedia..."
                                className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10">
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
        </div>
    )
}

export default Home
