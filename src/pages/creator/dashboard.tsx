import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, CheckCircle2, ClipboardList, ArrowLeft, Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DistributionChart, type BarDatum } from "../../components/charts"
import { colors } from "../../lib/colorbase"
import FormList from "../../components/creator/formList"
import Loading from "../../components/loading"

interface Stats {
    total: number
    active: number
    submissions: number
    score: number
}

interface FormRow {
    id: string
    title: string
    status: string
    passing_score: number | null
}

interface SubmissionRow {
    id: string
    total_score: number | null
    form_id: string
}

function CreatorDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(true)
    const [barData, setBarData] = useState<BarDatum[]>([])

    const loadStats = useCallback(async () => {
        if (!user) return
        setLoading(true)

        const { data: forms } = await supabase
            .from("forms")
            .select("id, title, status, passing_score")
            .eq("creator_id", user.id)

        const formRows = (forms || []) as FormRow[]
        const formIds = formRows.map((f) => f.id)

        let subs = { count: 0 }
        let score = 0
        let subRows: SubmissionRow[] = []
        if (formIds.length > 0) {
            const [subRes, scoreRes] = await Promise.all([
                supabase
                    .from("submissions")
                    .select("id", { count: "exact", head: true })
                    .in("form_id", formIds),
                supabase
                    .from("submissions")
                    .select("id, total_score, form_id")
                    .in("form_id", formIds),
            ])
            subs = { count: subRes.count || 0 }
            score = (scoreRes.data || []).reduce((s, r) => s + (Number(r.total_score) || 0), 0)
            subRows = (scoreRes.data || []) as SubmissionRow[]
        }

        const total = formRows.length
        const active = formRows.filter((f) => String(f.status).toLowerCase() === "published").length

        setStats({ total, active, submissions: subs.count || 0, score })
        setBarData(
            formRows
                .map((f) => ({
                    name: f.title.length > 14 ? f.title.slice(0, 14) + "…" : f.title,
                    value: subRows.filter((s) => s.form_id === f.id).length,
                    formId: f.id,
                }))
                .filter((d) => d.value > 0)
        )

        setLoading(false)
    }, [user])

    useEffect(() => {
        if (!user) return
        loadStats()
    }, [user, loadStats])

    return (
        <div className="flex flex-col items-center px-4 py-10 lg:h-screen lg:overflow-hidden">
            <div className="max-w-7xl w-full lg:h-full lg:flex lg:flex-col lg:min-h-0">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-xs sm:text-sm text-tinted hover:text-darks mb-4 sm:mb-6 lg:hidden transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl lg:text-4xl font-bold text-darks">Dashboard Creator</h1>
                </div>
                <p className="text-sm text-tinted mb-6">Ringkasan formulir milik kamu.</p>

                {loading ? (
                    <Loading />
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                    <div className="grid grid-cols-3 sm:stats sm:stats-horizontal shadow w-full bg-white border border-second rounded-none divide-x divide-second">
                        <div className="stat p-3 sm:p-4">
                            <div className="stat-figure text-darks hidden sm:block">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div className="stat-title text-tinted text-[11px] sm:text-sm">Total Form</div>
                            <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.total}</div>
                            <div className="stat-desc text-tinted hidden sm:block">Semua formulir kamu</div>
                        </div>

                        <div className="stat p-3 sm:p-4">
                            <div className="stat-figure text-done hidden sm:block">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="stat-title text-tinted text-[11px] sm:text-sm">Form Aktif</div>
                            <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.active}</div>
                            <div className="stat-desc text-tinted hidden sm:block">Status public</div>
                        </div>

                        <div className="stat p-3 sm:p-4">
                            <div className="stat-figure text-tinted hidden sm:block">
                                <ClipboardList className="h-8 w-8" />
                            </div>
                            <div className="stat-title text-tinted text-[11px] sm:text-sm">Total Submission</div>
                            <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.submissions}</div>
                            <div className="stat-desc text-tinted hidden sm:block">Jumlah pengerjaan</div>
                        </div>
                    </div>

                    <div className="grid gap-4 mt-8 lg:grid-cols-2 lg:flex-1 lg:min-h-0">
                        <div className="lg:min-h-0 lg:overflow-y-auto rounded-none hidden sm:block">
                            {barData.length > 0 ? (
                                <DistributionChart
                                    title="Submission per Form"
                                    subtitle="Jumlah submission tiap formulir."
                                    data={barData}
                                    barColor={colors.done}
                                    onBarClick={(id) => navigate(`/creator/forms/${id}`)}
                                />
                            ) : (
                                <div className="bg-white border border-second p-5 shadow-sm rounded-none flex items-center justify-center h-[260px]">
                                    <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h2 className="text-xl lg:text-2xl font-bold text-darks">Kelola Form</h2>
                                <Link to="/creator/forms/new" className="btn bg-darks text-base border-none h-9 min-h-0">
                                    <Plus className="h-4 w-4" /> Buat Form
                                </Link>
                            </div>
                            <div className="lg:min-h-0 lg:overflow-y-auto">
                                <FormList />
                            </div>
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CreatorDashboard