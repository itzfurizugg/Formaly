import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { FileText } from "lucide-react"
import HistoryCard from "../components/historyCard"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { easeOutExpo } from "../lib/motion"

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
        show_score: boolean
        header_image: string | null
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
                    id, title, duration, passing_score, show_score_to_respondent, header_image,
                    users:creator_id ( name ),
                    questions ( id )
                )
            `)
            .eq("user_id", user.id)
            .order("submitted_at", { ascending: false })

        if (data) {
            setItems((data as unknown as HistoryRow[]).map((item) => {
                const f = item.forms as unknown as { title: string; duration: number; passing_score?: number | null; show_score_to_respondent?: boolean | null; header_image?: string | null; users?: { name: string } | null; questions?: { id: string }[] | null }
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
                        show_score: f?.show_score_to_respondent !== false,
                        header_image: f?.header_image || null,
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

    if (authLoading || !user) return null

    return (
        <>
            {!authLoading && user && !loading && (
                <div className="flex flex-col items-center px-3.5 sm:px-6 py-5">
                    <div className="max-w-6xl grid w-full lg:mt-10">
                        <div className="ml-2 sm:ml-3 lg:ml-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl lg:text-4xl text-darks font-bold font-display">Riwayat</h1>
                            </div>
                            <p className="text-sm text-tinted mb-6">
                                Formulir yang pernah kamu kerjakan.
                            </p>
                        </div>

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

                        {filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                                <p className="text-tinted">Belum ada histori formulir.</p>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-2 gap-3">
                                {filtered.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                                    >
                                        <HistoryCard
                                            formId={item.form_id}
                                            title={item.forms?.title || "Form"}
                                            author={item.forms?.author_name || "-"}
                                            duration={item.forms?.duration ? `${item.forms.duration} menit` : "Tanpa Waktu"}
                                            questions={item.forms?.question_count || 0}
                                            score={item.total_score || 0}
                                            passingScore={item.forms?.passing_score ?? null}
                                            hideScore={!item.forms?.show_score}
                                            headerImage={item.forms?.header_image || null}
                                            to={`/form/result/${item.id}`}

                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default History