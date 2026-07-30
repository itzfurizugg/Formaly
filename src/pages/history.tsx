import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, RotateCcwClock, FileText } from "lucide-react"
import Card from "../components/card"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth"

interface HistoryItem {
    id: string
    form_id: string
    forms: {
        title: string
        author_name: string
        duration: number
        question_count: number
    }
}

function History() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [search, setSearch] = useState("")
    const [items, setItems] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            navigate("/login")
            return
        }
        loadHistory()
    }, [user])

    async function loadHistory() {
        if (!user) return
        setLoading(true)
        const { data } = await supabase
            .from("submissions")
            .select(`
                id, form_id,
                forms ( title, author_name, duration, question_count )
            `)
            .eq("user_id", user.id)
            .order("submitted_at", { ascending: false })

        if (data) setItems(data as unknown as HistoryItem[])
        setLoading(false)
    }

    const filtered = items.filter(
        (item) =>
            item.forms?.title?.toLowerCase().includes(search.toLowerCase()) ||
            item.forms?.author_name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <RotateCcwClock className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Histori</h1>
                </div>
                <p className="text-sm text-tinted mb-6">
                    Formulir yang pernah kamu kerjakan.
                </p>

                <div className="join w-full mb-6">
                    <div className="join-item flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cari histori..."
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
                            {search ? "Histori tidak ditemukan." : "Belum ada histori formulir."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((item) => (
                            <Card
                                key={item.id}
                                title={item.forms?.title || "Form"}
                                author={item.forms?.author_name || "-"}
                                duration={item.forms?.duration ? `${item.forms.duration} menit` : "-"}
                                questions={item.forms?.question_count || 0}
                                to="/form/description"
                                buttonLabel="Lihat"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default History
