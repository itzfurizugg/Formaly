import { useEffect, useState, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "motion/react"
import { FileText, CheckCircle2, ClipboardList, ChevronRight, ChartNoAxesColumn } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DistributionChart, type BarDatum } from "../../components/charts"
import { colors } from "../../lib/colorbase"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo } from "../../lib/motion"
import BackButton from "../../components/backButton"

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

interface RecentSubmission {
    id: string
    total_score: number | null
    submitted_at: string | null
    form: { id: string; title: string } | null
    user: { name: string } | null
}

interface DashboardCache {
    stats: Stats
    barData: BarDatum[]
    recent: RecentSubmission[]
}

function CreatorDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    // Cache ringkasan dashboard supaya kembali dari halaman lain cukup fade-in
    // tanpa overlay loading; data di-refresh diam-diam di background.
    const [cached] = useState<DashboardCache | undefined>(() =>
        user ? pageGet<DashboardCache>(`dashboard:${user.id}`) : undefined
    )
    const [stats, setStats] = useState<Stats>(cached?.stats ?? { total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(!cached)
    const [barData, setBarData] = useState<BarDatum[]>(cached?.barData ?? [])
    const [recent, setRecent] = useState<RecentSubmission[]>(cached?.recent ?? [])

    const loadStats = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)

        // Keempat query dijalankan paralel (Promise.all): total waktu dibatasi
        // query paling lambat, bukan jumlah semuanya. Submission difilter lewat
        // relasi forms.creator_id sehingga tidak perlu menunggu daftar form
        // selesai dulu — hasilnya identik dengan filter .in("form_id", ids).
        const [formsRes, subCountRes, scoreRes, recentRes] = await Promise.all([
            supabase
                .from("forms")
                .select("id, title, status, passing_score")
                .eq("creator_id", user.id),
            supabase
                .from("submissions")
                .select("id, forms!inner(creator_id)", { count: "exact", head: true })
                .eq("forms.creator_id", user.id),
            supabase
                .from("submissions")
                .select("id, total_score, form_id, forms!inner(creator_id)")
                .eq("forms.creator_id", user.id),
            supabase
                .from("submissions")
                .select(
                    "id, total_score, submitted_at, form:form_id ( id, title ), user:user_id ( name ), forms!inner(creator_id)"
                )
                .eq("forms.creator_id", user.id)
                .order("submitted_at", { ascending: false })
                .limit(6),
        ])

        const formRows = (formsRes.data || []) as FormRow[]
        const subsCount = subCountRes.count || 0
        const score = (scoreRes.data || []).reduce((s, r) => s + (Number(r.total_score) || 0), 0)
        const subRows = (scoreRes.data || []) as SubmissionRow[]
        const recent = (recentRes.data as unknown as RecentSubmission[]) || []

        const total = formRows.length
        const active = formRows.filter((f) => String(f.status).toLowerCase() === "published").length
        const nextBarData = formRows
            .map((f) => ({
                name: f.title.length > 14 ? f.title.slice(0, 14) + "…" : f.title,
                value: subRows.filter((s) => s.form_id === f.id).length,
                formId: f.id,
            }))
            .filter((d) => d.value > 0)

        setStats({ total, active, submissions: subsCount, score })
        setRecent(recent)
        setBarData(nextBarData)

        if (user) {
            pageSet(`dashboard:${user.id}`, {
                stats: { total, active, submissions: subsCount, score },
                recent,
                barData: nextBarData,
            })
        }

        setLoading(false)
    }, [user, cached])

    useEffect(() => {
        if (!user) return
        loadStats()
    }, [user, loadStats])

    return (
        <div className="flex flex-col items-center px-3 py-10 sm:py-23">
            <div className="xl:max-w-7xl lg:max-w-5xl w-full">
                <BackButton to="/" />
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-3xl lg:text-6xl font-bold font-display text-darks">Dashboard Creator</h1>
                </div>
                <p className="text-sm text-tinted mb-3 sm:mb-6">Ringkasan formulir milik kamu.</p>

                {!loading && (
                    <div className="flex flex-col">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 w-full">
                            <div className="relative overflow-hidden bg-white border border-second rounded-lg shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-darks/5" />
                                <div className="relative flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Total Form</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.total}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Semua formulir kamu</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-darks/10 text-darks p-2 hidden xl:flex">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden bg-white border border-second rounded-lg shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-done/10" />
                                <div className="relative flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Form Aktif</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.active}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Status public</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-done/10 text-done p-2 hidden sm:flex">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden bg-white border border-second rounded-lg shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-second/40" />
                                <div className="relative flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Total Submission</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.submissions}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Jumlah pengerjaan</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-tinted/10 text-tinted p-2 hidden sm:flex">
                                        <ClipboardList className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            {/* <div className="relative overflow-hidden bg-white border border-second rounded-lg shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-pass/10" />
                                <div className="relative flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Rata-rata Skor</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">
                                            {stats.submissions ? (stats.score / stats.submissions).toFixed(1) : 0}
                                        </div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Skor rata-rata pengerjaan</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-pass/10 text-pass p-2 hidden sm:flex">
                                        <Target className="h-5 w-5" />
                                    </div>
                                </div>
                            </div> */}
                        </div>

                        {/* Di mobile tidak ada sidebar, jadi akses halaman lewat dashboard. */}
                        <div className="lg:hidden flex flex-col gap-2 sm:gap-3 mt-8">
                            {[{ to: "/creator/forms", label: "Kelola Form", icon: FileText }, { to: "/creator/responden", label: "Responden", icon: ChartNoAxesColumn }].map((item, index) => (
                                <motion.div
                                    key={item.to}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.08, 0.3) }}
                                >
                                    <Link
                                        to={item.to}
                                        className="flex items-center justify-between bg-white border border-second rounded-lg shadow-sm p-4 transition-colors hover:bg-base-200"
                                    >
                                        <span className="flex items-center gap-2.5 text-darks font-medium">
                                            <item.icon className="h-4 w-4" /> {item.label}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-tinted" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>


                        <div className="grid gap-4 mt-8 lg:grid-cols-2">
                            <div className="rounded-xl hidden sm:block">
                                {barData.length > 0 ? (
                                    <DistributionChart
                                        title="Submission per Form"
                                        subtitle="Jumlah submission tiap formulir."
                                        data={barData}
                                        barColor={colors.done}
                                        onBarClick={(id) => navigate(`/creator/forms/${id}`)}
                                    />
                                ) : (
                                    <div className="bg-white border border-second p-5 shadow-sm rounded-lg flex items-center justify-center h-[260px]">
                                        <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 hidden sm:block">
                                <h2 className="text-xl lg:text-2xl font-bold text-darks ml-3 sm:ml-1 mb-4">Submission Terbaru</h2>
                                <div className="min-w-0 space-y-3">
                                    {recent.length > 0 ? (
                                        recent.map((s, index) => (
                                            <motion.div
                                                key={s.id}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                                            >
                                            <button
                                                onClick={() => navigate(`/creator/forms/${s.form?.id}/submissions/${s.id}`)}
                                                className="bg-white border border-second rounded-lg shadow-sm p-4 w-full text-left hover:bg-base-200 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-darks truncate">{s.user?.name || "Pengguna"}</p>
                                                        <p className="text-xs text-tinted mt-0.5 truncate">{s.form?.title || "Form"}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        {s.total_score != null && (
                                                            <span className="text-darks font-bold">{s.total_score}</span>
                                                        )}
                                                        <span className="text-xs text-tinted mt-0.5">
                                                            {s.submitted_at ? new Date(s.submitted_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="bg-white border border-second p-5 shadow-sm rounded-lg flex items-center justify-center h-[260px]">
                                            <p className="text-sm text-tinted">Belum ada submission.</p>
                                        </div>
                                    )}
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