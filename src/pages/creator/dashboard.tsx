import { useEffect, useState, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "motion/react"
import { FileText, CheckCircle2, ClipboardList, ChevronRight, ChartNoAxesColumn } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { DistributionChart, MiniDistributionChart, type BarDatum } from "../../components/charts"
import { colors } from "../../lib/colorbase"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo, listContainer, listItem } from "../../lib/motion"
import Loading from "../../components/loading"
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

interface FormListItem extends FormRow {
    submissions: number
}

interface SubmissionRow {
    id: string
    total_score: number | null
    form_id: string
}

interface DashboardCache {
    stats: Stats
    barData: BarDatum[]
    forms: FormListItem[]
}

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
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const isLg = useIsLg()
    const [cached] = useState<DashboardCache | undefined>(() =>
        user ? pageGet<DashboardCache>(`dashboard:${user.id}`) : undefined
    )
    const [stats, setStats] = useState<Stats>(cached?.stats ?? { total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(!cached)
    const [barData, setBarData] = useState<BarDatum[]>(cached?.barData ?? [])
    const [forms, setForms] = useState<FormListItem[]>(cached?.forms ?? [])

    const loadStats = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)

        // Satu round-trip menggabungkan cek role + seluruh data dashboard
        // sekaligus, sehingga cuma ada SATU loading state (Loading di
        // bawah) — bukan "Memeriksa akses..." terpisah dari guard lagi.
        const [roleRes, formsRes, subCountRes, scoreRes] = await Promise.all([
            supabase.from("users").select("role").eq("id", user.id).single(),
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

        // User tanpa akses creator/admin: cache role & lempar ke beranda tanpa
        // sempat menggambar halaman (meniru perilaku guard lama).
        const role = String(roleRes.data?.role ?? "").toLowerCase()
        pageSet<string | null>(`role:${user.id}`, role)
        if (role !== "creator" && role !== "admin") {
            setLoading(false)
            navigate("/")
            return
        }

        const formRows = (formsRes.data || []) as FormRow[]
        const subsCount = subCountRes.count || 0
        const score = (scoreRes.data || []).reduce((s, r) => s + (Number(r.total_score) || 0), 0)
        const subRows = (scoreRes.data || []) as SubmissionRow[]

        const total = formRows.length
        const active = formRows.filter((f) => String(f.status).toLowerCase() === "published").length
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
        const nextForms: FormListItem[] = formRows.map((f) => ({
            ...f,
            submissions: countByForm.get(f.id) ?? 0,
        }))

        setStats({ total, active, submissions: subsCount, score })
        setBarData(nextBarData)
        setForms(nextForms)

        if (user) {
            pageSet(`dashboard:${user.id}`, {
                stats: { total, active, submissions: subsCount, score },
                barData: nextBarData,
                forms: nextForms,
            })
        }

        setLoading(false)
    }, [user, cached, navigate])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        loadStats()
    }, [user, authLoading, loadStats, navigate])

    const goToForm = useCallback((id: string) => {
        navigate(`/creator/forms/${id}`)
    }, [navigate])

    const statCards = [
        {
            label: "Total Form",
            value: stats.total,
            desc: "Form yang anda miliki",
            blobClass: "bg-darks/5",
            iconWrap: "bg-darks/10 text-darks",
            icon: FileText,
        },
        {
            label: "Form Aktif",
            value: stats.active,
            desc: "Form yang dapat diakses",
            blobClass: "bg-done/10",
            iconWrap: "bg-done/10 text-done",
            icon: CheckCircle2,
        },
        {
            label: "Total Submission",
            value: stats.submissions,
            desc: "Responden form anda",
            blobClass: "bg-gradient-to-br from-done/5 to-second/30",
            iconWrap: "bg-gradient-to-br from-done/10 to-darks/5 text-done",
            icon: ClipboardList,
        },
    ]

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

                {loading ? (
                    // Satu bar tipis di atas, bukan card/halaman loading terpisah —
                    // biar enggak numpuk sama splash/loading lain yang lebih di luar.
                    <Loading inline />
                ) : (
                    <motion.div
                        className="flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.45, ease: easeOutExpo }}
                    >
                        {/* ========== MOBILE: chart → stats → nav ========== */}
                        <div className="lg:hidden flex flex-col gap-3">
                            <div className="min-w-0">
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

                            <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 w-full">
                                {statCards.slice(0, 2).map((card) => (
                                    <motion.div key={card.label} variants={listItem} className="min-w-0">
                                        <div className="relative overflow-hidden bg-white border border-second rounded-xl shadow-sm p-3 sm:p-4 min-w-0">
                                            <div className={"absolute -right-3 -top-3 h-16 w-16 rounded-full " + card.blobClass} />
                                            <div className="relative flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-tinted text-[11px] sm:text-sm leading-tight">{card.label}</div>
                                                    <div className="text-darks text-3xl sm:text-4xl font-bold mt-1 break-words">{card.value}</div>
                                                </div>
                                                <div className={"shrink-0 rounded-full " + card.iconWrap + " p-1.5 sm:p-2 flex"}>
                                                    <card.icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <div className="flex flex-col gap-2.5 sm:gap-3 border-t border-dashed border-second pt-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-tinted ml-1">Akses Form</p>
                                {[
                                    { to: "/creator/forms", label: "Kelola Form", desc: "Buat dan atur form kamu", icon: FileText },
                                    { to: "/creator/responden", label: "Responden", desc: "Lihat hasil pengisian form", icon: ChartNoAxesColumn },
                                ].map((item, index) => (
                                    <motion.div
                                        key={item.to}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.08, 0.3) }}
                                    >
                                        <Link
                                            to={item.to}
                                            className="flex items-center gap-3 bg-white border border-second rounded-xl shadow-sm p-3 transition-all active:scale-[0.98]"
                                        >
                                            <span className="ml-2 mr-1 shrink-0 flex items-center justify-center">
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
                        </div>

                        {/* ========== DESKTOP ========== */}
                        <div className="hidden lg:flex flex-col gap-5">
                            <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-4 w-full">
                                {statCards.map((card) => (
                                    <motion.div key={card.label} variants={listItem} className="min-w-0">
                                        <div className="relative overflow-hidden bg-white border border-second rounded-xl shadow-sm p-3 sm:p-4 min-w-0">
                                            <div className={"absolute -right-3 -top-3 h-16 w-16 rounded-full " + card.blobClass} />
                                            <div className="relative flex items-start justify-between gap-2">
                                                <div className="min-w-0 ml-1">
                                                    <div className="text-tinted text-[11px] sm:text-sm leading-tight">{card.label}</div>
                                                    <div className="text-darks text-3xl sm:text-5xl font-bold my-1 break-words">{card.value}</div>
                                                    <div className="text-tinted text-[11px] sm:text-sm leading-tight">{card.desc}</div>
                                                </div>
                                                <div className={"shrink-0 rounded-full " + card.iconWrap + " p-1.5 sm:p-2 flex"}>
                                                    <card.icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <div className="grid grid-cols-2 gap-4 items-start">
                                <motion.div
                                    className="min-w-0"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.1 }}
                                >
                                    {barData.length > 0 ? (
                                        isLg ? (
                                            <DistributionChart
                                                title="Responden per Form"
                                                subtitle="Jumlah responden tiap formulir."
                                                data={barData}
                                                barColor={colors.done}
                                                onBarClick={goToForm}
                                            />
                                        ) : (
                                            <MiniDistributionChart
                                                data={barData}
                                                barColor={colors.done}
                                                onBarClick={goToForm}
                                            />
                                        )
                                    ) : (
                                        <div className="bg-white border border-second rounded-xl shadow-sm p-6 flex items-center justify-center h-[260px]">
                                            <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                                        </div>
                                    )}
                                </motion.div>

                                <motion.div
                                    className="min-w-0 bg-white border border-second rounded-xl shadow-sm p-6"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.15 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-lg font-semibold font-default text-darks">Daftar Form Terbaru</p>
                                            <p className="text-xs font-semibold font-default text-tinted">Lihat daftar form terbaru anda</p>
                                        </div>
                                    </div>
                                    {forms.length > 0 ? (
                                        <div className="flex flex-col gap-2.5">
                                            {forms.slice(0, 3).map((f, index) => {
                                                const isPublished = String(f.status).toLowerCase() === "published"
                                                return (
                                                    <motion.div
                                                        key={f.id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.05, 0.3) }}
                                                    >
                                                        <button
                                                            onClick={() => goToForm(f.id)}
                                                            className="w-full flex items-center gap-3 bg-base-200 border border-second rounded-xl p-3 transition-all active:scale-[0.96] text-left"
                                                        >
                                                            <span className="flex-1 min-w-0">
                                                                <span className="block text-sm font-bold text-darks truncate">{f.title}</span>
                                                                <span className="flex items-center gap-2 mt-1">
                                                                    <span className={`badge rounded-full text-[10px] ${isPublished ? "bg-done/10 text-done border-none" : "badge-ghost bg-black/10 text-darks"}`}>
                                                                        {isPublished ? "Public" : "Draft"}
                                                                    </span>
                                                                    <span className="text-xs text-tinted">{f.submissions} responden</span>
                                                                </span>
                                                            </span>
                                                            <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                                                        </button>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-second rounded-xl flex flex-col items-center justify-center text-center gap-2 h-40">
                                            <p className="text-sm text-tinted">Belum ada form.</p>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

export default CreatorDashboard