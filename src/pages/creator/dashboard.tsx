import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileText, CheckCircle2, ClipboardList, Trophy, Plus } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { DistributionChart, DonutChart } from "../../components/charts"
import { colors } from "../../lib/colorbase"

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
    status: string
    form_id: string
}

function CreatorDashboard() {
    const { user } = useAuth()
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, submissions: 0, score: 0 })
    const [loading, setLoading] = useState(true)
    const [barData, setBarData] = useState<{ name: string; value: number }[]>([])
    const [donutData, setDonutData] = useState<{ name: string; value: number; color: string }[]>([])

    useEffect(() => {
        if (!user) return
        loadStats()
    }, [user])

    async function loadStats() {
        if (!user) return

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
                    .select("id, total_score, status, form_id")
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
                }))
                .filter((d) => d.value > 0)
        )

        const passingMap = new Map(formRows.map((f) => [f.id, f.passing_score]))
        let passed = 0
        let failed = 0
        for (const s of subRows) {
            const passing = passingMap.get(s.form_id)
            if (passing != null) {
                if ((s.total_score ?? 0) >= passing) passed++
                else failed++
            }
        }
        setDonutData([
            { name: "Lulus", value: passed, color: colors.pass },
            { name: "Gagal", value: failed, color: colors.wrong },
        ])

        setLoading(false)
    }

    const cards = [
        { label: "Total Form", value: stats.total, icon: FileText, color: "text-darks" },
        { label: "Form Aktif", value: stats.active, icon: CheckCircle2, color: "text-done" },
        { label: "Total Submission", value: stats.submissions, icon: ClipboardList, color: "text-accents" },
        { label: "Total Skor", value: stats.score, icon: Trophy, color: "text-amber-500" },
    ]

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="max-w-5xl w-full">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-darks">Dashboard Creator</h1>
                    <Link to="/creator/forms/new" className="btn bg-darks text-base border-none h-9 min-h-0">
                        <Plus className="h-4 w-4" /> Buat Form
                    </Link>
                </div>
                <p className="text-sm text-tinted mb-6">Ringkasan formulir milik kamu.</p>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-full max-w-xs">
                            <div className="relative h-1.5 w-full bg-second rounded-full overflow-hidden">
                                <div className="absolute h-full bg-darks rounded-full animate-loadingbar" />
                            </div>
                        </div>
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                            {barData.length > 0 ? (
                                <DistributionChart
                                    title="Submission per Form"
                                    subtitle="Jumlah submission tiap formulir."
                                    data={barData}
                                    barColor={colors.done}
                                />
                            ) : (
                                <div className="bg-white border border-second p-5 shadow-sm rounded-2xl flex items-center justify-center h-[260px]">
                                    <p className="text-sm text-tinted">Belum ada submission untuk ditampilkan.</p>
                                </div>
                            )}
                            {donutData[0]?.value > 0 || donutData[1]?.value > 0 ? (
                                <DonutChart
                                    title="Hasil Submission"
                                    subtitle="Lulus vs gagal berdasarkan passing score."
                                    data={donutData}
                                />
                            ) : (
                                <div className="bg-white border border-second p-5 shadow-sm rounded-2xl flex items-center justify-center h-[260px]">
                                    <p className="text-sm text-tinted">Belum ada hasil untuk ditampilkan.</p>
                                </div>
                            )}
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