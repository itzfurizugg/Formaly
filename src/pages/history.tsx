import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FileText } from "lucide-react"
import HistoryCard from "../components/historyCard"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import Loading from "../components/loading"

interface HistoryItem {
    id: string
    form_id: string
    total_score: number
    forms: {
        title: string
        author_name: string
        duration: number
        question_count: number
        passing_score: number | null
    }
}

interface HistoryRow {
    id: string
    form_id: string
    forms: unknown
}

function History() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [items, setItems] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    const loadHistory = useCallback(async () => {
        if (!user) return
        setLoading(true)
        const { data } = await supabase
            .from("submissions")
            .select(`
                id, form_id, total_score,
                forms (
                    id, title, duration, passing_score,
                    users:creator_id ( name ),
                    questions ( id )
                )
            `)
            .eq("user_id", user.id)
            .order("submitted_at", { ascending: false })

        if (data) {
            setItems((data as unknown as HistoryRow[]).map((item) => {
                const f = item.forms as unknown as { title: string; duration: number; passing_score?: number | null; users?: { name: string } | null; questions?: { id: string }[] | null }
                return {
                    id: item.id,
                    form_id: item.form_id,
                    total_score: Number((item as unknown as { total_score?: number }).total_score) || 0,
                    forms: {
                        title: f?.title || "Form",
                        author_name: f?.users?.name || "Creator",
                        duration: f?.duration || 0,
                        question_count: f?.questions?.length || 0,
                        passing_score: f?.passing_score ?? null,
                    },
                }
            }))
        }
        setLoading(false)
    }, [user])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        loadHistory()
    }, [user, authLoading, navigate, loadHistory])

    const filtered = items

    if (authLoading || !user) return <Loading />

    return (
        <div className="flex flex-col items-center px-4 py-5">
            <div className="max-w-4xl grid w-full lg:mt-10">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl lg:text-4xl font-bold text-darks">Histori</h1>
                </div>
                <p className="text-sm text-tinted mb-6">
                    Formulir yang pernah kamu kerjakan.
                </p>

                {/* {!loading && (
                    <div className="join w-full mb-6">
                        <div className="join-item flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Memuat..."
                                className="input w-full pl-5 bg-base focus:outline-none transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                )} */}

                {loading ? (
                    <Loading />
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">Belum ada histori formulir.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((item) => (
                            <HistoryCard
                                key={item.id}
                                title={item.forms?.title || "Form"}
                                author={item.forms?.author_name || "-"}
                                duration={item.forms?.duration ? `${item.forms.duration} menit` : "Tanpa Waktu Pengerjaan"}
                                questions={item.forms?.question_count || 0}
                                score={item.total_score || 0}
                                passingScore={item.forms?.passing_score ?? null}
                                to={`/form/result/${item.id}`}
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