import { useEffect, useState, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "motion/react"
import { FileText, CheckCircle2, ClipboardList, ChevronRight, ChartNoAxesColumn } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DistributionChart, MiniDistributionChart, type BarDatum } from "../../components/charts"
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

interface DashboardCache {
    stats: Stats
    barData: BarDatum[]
}

// Hanya chart yang sesuai breakpoint yang di-mount, supaya chart tersembunyi
// (sebelumnya `lg:hidden`/`hidden lg:block`) tidak ikut menghitung ukuran ulang
// dan merender saat resize.
function useIsLg() {
    const [isLg, setIsLg] = useState(
        typeof window !== "undefined" ? window.innerWidth >= 1024 : false
    )
    useEffect(() => {
        const onResize = () => setIsLg(window.innerWidth >= 1024)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])
    return isLg
}

function CreatorDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const isLg = useIsLg()
    // Cache ringkasan dashboard supaya kembali dari halaman lain cukup fade-in
    // tanpa overlay loading; data di-refresh diam-diam di background.
    const [cached] = useState<DashboardCache | undefined>(() =>
        user ? pageGet<DashboardCache>(`dashboard:${user.id}`) : undefined
    )
    const [stats, setStats] = useState<Stats>(cached?.stats ?? { total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(!cached)
    const [barData, setBarData] = useState<BarDatum[]>(cached?.barData ?? [])

    const loadStats = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)

        // Tiga query dijalankan paralel (Promise.all): total waktu dibatasi
        // query paling lambat, bukan jumlah semuanya. Submission difilter lewat
        // relasi forms.creator_id sehingga tidak perlu menunggu daftar form
        // selesai dulu — hasilnya identik dengan filter .in("form_id", ids).
        const [formsRes, subCountRes, scoreRes] = await Promise.all([
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
        ])

        const formRows = (formsRes.data || []) as FormRow[]
        const subsCount = subCountRes.count || 0
        const score = (scoreRes.data || []).reduce((s, r) => s + (Number(r.total_score) || 0), 0)
        const subRows = (scoreRes.data || []) as SubmissionRow[]

        const total = formRows.length
        const active = formRows.filter((f) => String(f.status).toLowerCase() === "published").length
        // Hitung banyak submission per form dalam satu pass (Map), menghindari
        // filter bersarang O(form × submission) saat data besar.
        const countByForm = new Map<string, number>()
        for (const s of subRows) {
            countByForm.set(s.form_id, (countByForm.get(s.form_id) ?? 0) + 1)
        }
        const nextBarData = formRows
            .map((f) => ({
                name: f.title.length > 14 ? f.title.slice(0, 14) + "…" : f.title,
                value: countByForm.get(f.id) ?? 0,
                formId: f.id,
            }))
            .filter((d) => d.value > 0)

        setStats({ total, active, submissions: subsCount, score })
        setBarData(nextBarData)

        if (user) {
            pageSet(`dashboard:${user.id}`, {
                stats: { total, active, submissions: subsCount, score },
                barData: nextBarData,
            })
        }

        setLoading(false)
    }, [user, cached])

    useEffect(() => {
        if (!user) return
        loadStats()
    }, [user, loadStats])

    // Handler dipanggil dari chart (recharts). Reference disetabilkan supaya
    // prop chart tetap sama antar render dan React.memo pada chart bekerja.
    const goToForm = useCallback((id: string) => {
        navigate(`/creator/forms/${id}`)
    }, [navigate])

    return (
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10 lg:py-23">
            <div className="xl:max-w-7xl lg:max-w-5xl w-full">
                <BackButton to="/" />

                <div className="ml-1">
                    <div className="flex items-center justify-between mb-1">
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display text-darks">Dashboard Creator</h1>
                    </div>
                    <p className="text-xs sm:text-lg text-tinted mb-4 sm:mb-6">Ringkasan formulir milik kamu.</p>
                </div>

                {!isLg && (
                    <div className="mt-3 mb-4">
                        {barData.length > 0 ? (
                            <MiniDistributionChart
                                data={barData}
                                barColor={colors.done}
                                onBarClick={goToForm}
                            />
                        ) : (
                            <div className="bg-white border border-second p-5 shadow-sm rounded-xl flex items-center justify-center h-44 sm:h-[260px]">
                                <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                            </div>
                        )}
                    </div>
                )}

                {!loading && (
                    <div className="flex flex-col">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                            <div className="relative overflow-hidden bg-white border border-second rounded-xl shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-darks/5" />
                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Total Form</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.total}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Semua formulir kamu</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-darks/10 text-darks p-1.5 sm:p-2 flex">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative overflow-hidden bg-white border border-second rounded-xl shadow-sm p-3 sm:p-4 min-w-0">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-done/10" />
                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Form Aktif</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.active}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Status public</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-done/10 text-done p-1.5 sm:p-2 flex">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Hanya tampil di lg ke atas */}
                            <div className="relative overflow-hidden bg-white border border-second rounded-xl shadow-sm p-3 sm:p-4 min-w-0 hidden lg:block">
                                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-second/40" />
                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-tinted text-[11px] sm:text-sm leading-tight">Total Submission</div>
                                        <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{stats.submissions}</div>
                                        <div className="text-tinted text-xs mt-1 hidden sm:block">Jumlah pengerjaan</div>
                                    </div>
                                    <div className="shrink-0 rounded-full bg-tinted/10 text-tinted p-1.5 sm:p-2 flex">
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

                        {/* Chart hanya tampil di layar lg ke atas (dan hanya yang ter-mount satu) */}
                        {isLg && (
                            <div className="rounded-xl mt-3">
                                {barData.length > 0 ? (
                                    <DistributionChart
                                        title="Responden per Form"
                                        subtitle="Jumlah responden tiap formulir."
                                        data={barData}
                                        barColor={colors.done}
                                        onBarClick={goToForm}
                                    />
                                ) : (
                                    <div className="bg-white border border-second p-5 shadow-sm rounded-lg flex items-center justify-center h-[260px]">
                                        <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Di mobile tidak ada sidebar, jadi akses halaman lewat dashboard. */}
                        <div className="lg:hidden flex flex-col gap-2.5 sm:gap-3 border-t border-dashed border-second pt-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-tinted ml-1">Akses Form</p>
                            {[
                                { to: "/creator/forms", label: "Kelola Form", desc: "Buat dan atur form kamu", icon: FileText, chip: "bg-done/10 text-done" },
                                { to: "/creator/responden", label: "Responden", desc: "Lihat hasil pengisian form", icon: ChartNoAxesColumn, chip: "bg-darks/10 text-darks" },
                            ].map((item, index) => (
                                <motion.div
                                    key={item.to}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.08, 0.3) }}
                                >
                                    <Link
                                        to={item.to}
                                        className="flex items-center gap-3 bg-white border border-second rounded-xl shadow-sm p-3 transition-all hover:bg-base-200 active:scale-[0.98]"
                                    >

                                        <span className={'ml-2 mr-1 shrink-0 flex items-center justify-center'}>
                                            <item.icon className="h-5 w-5" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-darks">{item.label}</span>
                                            <span className="block text-xs text-tinted">{item.desc}</span>
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>


                        {/* <div className="grid gap-4 mt-8 lg:grid-cols-2">
                            <div className="rounded-xl hidden lg:block">
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

                            <div className="min-w-0 hidden lg:block">
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
                        </div> */}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CreatorDashboard