import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileText, CheckCircle2, ClipboardList, Trophy, Plus } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

interface Stats {
    total: number
    active: number
    submissions: number
    score: number
}

function CreatorDashboard() {
    const { user } = useAuth()
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        loadStats()
    }, [user])

    async function loadStats() {
        if (!user) return

        const { data: forms } = await supabase
            .from("forms")
            .select("id, status")
            .eq("creator_id", user.id)

        const formIds = (forms || []).map((f) => f.id)

        let subs = { count: 0 }
        let score = 0
        if (formIds.length > 0) {
            const [subRes, scoreRes] = await Promise.all([
                supabase
                    .from("submissions")
                    .select("id", { count: "exact", head: true })
                    .in("form_id", formIds),
                supabase
                    .from("submissions")
                    .select("total_score")
                    .in("form_id", formIds),
            ])
            subs = { count: subRes.count || 0 }
            score = (scoreRes.data || []).reduce((s, r) => s + (Number(r.total_score) || 0), 0)
        }

        const total = forms?.length || 0
        const active = (forms || []).filter((f) => String(f.status).toLowerCase() === "published").length

        setStats({ total, active, submissions: subs.count || 0, score })
        setLoading(false)
    }

    const cards = [
        { label: "Total Form", value: stats.total, icon: FileText, color: "text-darks" },
        { label: "Form Aktif", value: stats.active, icon: CheckCircle2, color: "text-done" },
        { label: "Total Submission", value: stats.submissions, icon: ClipboardList, color: "text-accents" },
        { label: "Total Skor", value: stats.score, icon: Trophy, color: "text-amber-500" },
    ]

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-darks">Dashboard Creator</h1>
                    <Link to="/creator/forms/new" className="btn bg-darks text-base border-none h-9 min-h-0">
                        <Plus className="h-4 w-4" /> Buat Form
                    </Link>
                </div>
                <p className="text-sm text-tinted mb-6">Ringkasan formulir milik kamu.</p>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {cards.map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="bg-white border border-second p-5 shadow-sm rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-tinted">{label}</p>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                    <p className="text-2xl font-bold text-darks">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link to="/creator/forms" className="btn bg-darks text-base border-none">
                                <FileText className="h-4 w-4" /> Kelola Form
                            </Link>
                            <Link to="/creator/forms/new" className="btn bg-base text-darks border border-second hover:bg-second">
                                <Plus className="h-4 w-4" /> Buat Form Baru
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default CreatorDashboard
