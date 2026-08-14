import Loading from "../../components/loading"
import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Eye, Trash2, Loader2, ClipboardList, Share2, KeyRound } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete } from "../../lib/alerts"
import { richTextToPlain } from "../../lib/richtext"
import { colors } from "../../lib/colorbase"
import { getOptionColor } from "../../lib/optionColors"
import { DonutChart } from "../../components/charts"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"

interface Submission {
    id: string
    total_score: number
    status: string
    started_at: string | null
    submitted_at: string | null
    user: { name: string } | null
    token: { token_code: string } | null
}

interface AnswerRow {
    submission_id: string
    selected_option_id: string | null
    selected_options: string[] | null
    question: {
        id: string
        question_text: string | null
        question_type: string
        order_index: number
        question_options: { id: string; option_text: string; is_correct: boolean }[]
    } | null
}

interface StackBarDatum {
    name: string
    soal_text: string
    [key: string]: string | number
}

interface OptionSeries {
    key: string
    label: string
    color: string
}

interface PerQuestionStat {
    name: string
    soal_text: string
    benar: number
    salah: number
    kosong: number
    total: number
}

function Submissions() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [barData, setBarData] = useState<StackBarDatum[]>([])
    const [barSeries, setBarSeries] = useState<OptionSeries[]>([])
    const [totalCorrect, setTotalCorrect] = useState(0)
    const [totalWrong, setTotalWrong] = useState(0)
    const [avgCorrect, setAvgCorrect] = useState(0)
    const [avgWrong, setAvgWrong] = useState(0)
    const [perQuestionStats, setPerQuestionStats] = useState<PerQuestionStat[]>([])
    const [chartView, setChartView] = useState<"statistik" | "distribusi">("statistik")

    const loadAll = useCallback(async () => {
        if (!user || !id) return

        const { data: subs, error: err } = await supabase
            .from("submissions")
            .select("id, total_score, status, started_at, submitted_at, user:user_id ( name ), token:token_id ( token_code )")
            .eq("form_id", id)
            .order("submitted_at", { ascending: false })
        if (err) {
            setError(err.message)
        } else {
            setSubmissions((subs as unknown as Submission[]) || [])
        }

        // Ambil jawaban beserta soal-nya dari database untuk menyusun statistik
        // distribusi opsi jawaban dari seluruh submission.
        const subIds = ((subs as unknown as Submission[]) || []).map((s) => s.id)
        let answers: AnswerRow[] = []
        if (subIds.length > 0) {
            const { data: ans } = await supabase
                .from("answers")
                .select(`
                    submission_id, selected_option_id, selected_options,
                    question:question_id ( id, question_text, question_type, order_index, question_options ( id, option_text, is_correct ) )
                `)
                .in("submission_id", subIds)
            answers = (ans as unknown as AnswerRow[]) || []
        }

        // Urutkan jawaban berdasarkan order_index soal supaya bar chart
        // "Distribusi Opsi Jawaban" urutannya sama persis dengan Question editor & Form.
        // Jangan dihapus: tanpa ini, urutan soal mengikuti default tabel answers yang tidak pasti.
        answers.sort(
            (a, b) =>
                (a.question?.order_index ?? Number.MAX_SAFE_INTEGER) -
                (b.question?.order_index ?? Number.MAX_SAFE_INTEGER)
        )

        // Kelompokkan jawaban per soal, lalu hitung berapa kali tiap opsi dipilih.
        const qOrder = new Map<string, number>()
        const qMap = new Map<string, { text: string; options: { id: string; text: string; count: number }[] }>()
        let order = 0
        for (const a of answers) {
            const q = a.question
            if (!q || q.question_type === "text") continue
            if (!qOrder.has(q.id)) {
                qOrder.set(q.id, order++)
                qMap.set(q.id, {
                    text: richTextToPlain(q.question_text || ""),
                    options: q.question_options.map((o) => ({
                        id: o.id,
                        text: richTextToPlain(o.option_text || ""),
                        count: 0,
                    })),
                })
            }
            const selected =
                q.question_type === "multiple_choice"
                    ? a.selected_options || []
                    : a.selected_option_id
                        ? [a.selected_option_id]
                        : []
            for (const optId of selected) {
                const opt = qMap.get(q.id)?.options.find((o) => o.id === optId)
                if (opt) opt.count++
            }
        }

        // Susun data stacked bar: satu bar per soal, segmen per opsi jawaban.
        // Opsi yang tidak ada pada suatu soal diberi nilai 0 agar stacking tetap konsisten.
        let maxOptions = 0
        for (const entry of qMap.values()) {
            maxOptions = Math.max(maxOptions, entry.options.length)
        }
        const data: StackBarDatum[] = []
        const series: OptionSeries[] = []
        for (const [qid, entry] of qMap) {
            const qno = (qOrder.get(qid) ?? 0) + 1
            const row: StackBarDatum = { name: `Soal ${qno}`, soal_text: entry.text }
            for (let i = 0; i < maxOptions; i++) {
                const key = `Opsi ${String.fromCharCode(65 + i)}`
                const opt = entry.options[i]
                row[key] = opt ? opt.count : 0
                if (opt) row[`optText_${String.fromCharCode(65 + i)}`] = opt.text
            }
            data.push(row)
        }
        for (let i = 0; i < maxOptions; i++) {
            const label = `Opsi ${String.fromCharCode(65 + i)}`
            series.push({
                key: label,
                label,
                color: getOptionColor(i),
            })
        }
        setBarData(data)
        setBarSeries(series)

        // Hitung jumlah jawaban benar vs salah (soal isian dan tanpa kunci tidak dihitung),
        // sekaligus rata-rata benar/salah per responden.
        let correctTotal = 0
        let wrongTotal = 0
        const perSubmission = new Map<string, { benar: number; salah: number }>()
        for (const a of answers) {
            const q = a.question
            if (!q || q.question_type === "text") continue
            const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
            if (correct.length === 0) continue
            const selected =
                q.question_type === "multiple_choice"
                    ? a.selected_options || []
                    : a.selected_option_id
                        ? [a.selected_option_id]
                        : []
            const isCorrect = selected.length === correct.length && selected.every((id) => correct.includes(id))
            if (isCorrect) {
                correctTotal++
            } else {
                wrongTotal++
            }
            const sub = perSubmission.get(a.submission_id) ?? { benar: 0, salah: 0 }
            if (isCorrect) sub.benar++
            else sub.salah++
            perSubmission.set(a.submission_id, sub)
        }
        setTotalCorrect(correctTotal)
        setTotalWrong(wrongTotal)

        // Rata-rata benar/salah per responden (hanya responden yang punya jawaban terhitung).
        let sumCorrect = 0
        let sumWrong = 0
        perSubmission.forEach((s) => {
            sumCorrect += s.benar
            sumWrong += s.salah
        })
        const n = perSubmission.size
        setAvgCorrect(n ? Math.round((sumCorrect / n) * 10) / 10 : 0)
        setAvgWrong(n ? Math.round((sumWrong / n) * 10) / 10 : 0)

        // Statistik per soal: jumlah benar, salah, dan kosong (tidak dijawab)
        // dihitung terhadap seluruh submission. Soal isian tanpa kunci diabaikan.
        const totalSubs = subIds.length
        const qStatsMap = new Map<
            string,
            { text: string; benar: number; salah: number }
        >()
        for (const a of answers) {
            const q = a.question
            if (!q || q.question_type === "text") continue
            const correct = q.question_options.filter((o) => o.is_correct).map((o) => o.id)
            if (correct.length === 0) continue
            if (!qStatsMap.has(q.id)) {
                qStatsMap.set(q.id, {
                    text: richTextToPlain(q.question_text || ""),
                    benar: 0,
                    salah: 0,
                })
            }
            const selected =
                q.question_type === "multiple_choice"
                    ? a.selected_options || []
                    : a.selected_option_id
                        ? [a.selected_option_id]
                        : []
            const isCorrect = selected.length === correct.length && selected.every((id) => correct.includes(id))
            const entry = qStatsMap.get(q.id)!
            if (isCorrect) entry.benar++
            else entry.salah++
        }

        const perQuestion: PerQuestionStat[] = []
        qStatsMap.forEach((entry, qid) => {
            const qno = (qOrder.get(qid) ?? 0) + 1
            const answered = entry.benar + entry.salah
            perQuestion.push({
                name: `Soal ${qno}`,
                soal_text: entry.text,
                benar: entry.benar,
                salah: entry.salah,
                kosong: Math.max(0, totalSubs - answered),
                total: totalSubs,
            })
        })
        setPerQuestionStats(perQuestion)

        setLoading(false)
    }, [user, id])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    const statusLabel = (s: string) => {
        if (s === "SUBMITTED") return "Selesai"
        if (s === "IN_PROGRESS") return "Proses"
        return s
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

    const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload?.length) return null
        const row = payload[0].payload as StackBarDatum
        const title = row.soal_text ? `${label} - ${row.soal_text}` : String(label)
        return (
            <div style={{ background: "white", border: `1px solid ${colors.second}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, maxWidth: 320 }}>
                <p className="font-medium text-darks">{title}</p>
                {barSeries.map((s) => {
                    const count = Number(row[s.key]) || 0
                    if (count === 0) return null
                    const letter = s.key.replace("Opsi ", "")
                    const text = row[`optText_${letter}`]
                    return (
                        <p key={s.key} className="flex items-center gap-1.5 text-tinted mt-1">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                            <span>
                                {s.label}
                                {text ? ` - ${text}` : ""}: <span className="font-medium text-darks">{count}</span> responden
                            </span>
                        </p>
                    )
                })}
            </div>
        )
    }

    const renderPerQuestionTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload?.length) return null
        const row = payload[0].payload as PerQuestionStat
        const title = row.soal_text ? `${label} - ${row.soal_text}` : String(label)
        return (
            <div style={{ background: "white", border: `1px solid ${colors.second}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, maxWidth: 320 }}>
                <p className="font-medium text-darks">{title}</p>
                <p className="flex items-center gap-1.5 text-tinted mt-1">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.pass }} />
                    Benar: <span className="font-medium text-darks">{row.benar}</span> responden
                </p>
                <p className="flex items-center gap-1.5 text-tinted mt-1">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.wrong }} />
                    Salah: <span className="font-medium text-darks">{row.salah}</span> responden
                </p>
                {row.kosong > 0 && (
                    <p className="flex items-center gap-1.5 text-tinted mt-1">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.tinted }} />
                        Kosong: <span className="font-medium text-darks">{row.kosong}</span> responden
                    </p>
                )}
            </div>
        )
    }

    const handleDelete = async (s: Submission) => {
        confirmDelete({
            title: "Hapus submission ini?",
            description: "Jawaban peserta pada submission ini akan hilang permanen.",
            onConfirm: async () => {
                setDeletingId(s.id)
                setError(null)
                try {
                    const { error } = await supabase.rpc("delete_submission", { p_submission_id: s.id })
                    if (error) throw new Error(error.message)
                    await loadAll()
                } finally {
                    setDeletingId(null)
                }
            },
        })
    }

    return (
        <>
            <Loading show={loading} />
            {!loading && (
        <div className="flex flex-col items-center px-3 py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <button
                    onClick={() => navigate("/creator")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => navigate(`/creator/forms/${id}`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        Detail
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/shared`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        <Share2 className="h-3.5 w-3.5" /> Shared
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/tokens`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        <KeyRound className="h-3.5 w-3.5" /> Token
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/submissions`)} className="btn btn-sm bg-darks text-base border-none">
                        <ClipboardList className="h-3.5 w-3.5" /> Submission
                    </button>
                </div>

                {/* <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Submission</h1>
                <p className="text-sm text-tinted mb-6">Form: {formTitle}</p> */}

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                {submissions.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {/* Baris 1: Total Responded + Rata-rata Benar/Salah + Benar vs Salah */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="bg-white border border-second p-5 shadow-sm rounded-none lg:flex-none lg:w-64 flex flex-col">
                                <p className="font-semibold text-darks mb-0.5">Total Responded</p>
                                <p className="text-xs text-tinted mb-3">
                                    Jumlah submission yang masuk.
                                </p>
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <p className="text-5xl font-bold text-darks leading-none">{submissions.length}</p>
                                    <p className="text-xs text-tinted mt-2">responden</p>
                                </div>
                            </div>
                            <div className="bg-white border border-second p-5 shadow-sm rounded-none lg:flex-1">
                                <p className="font-semibold text-darks mb-0.5">Rata-rata Benar vs Salah</p>
                                <p className="text-xs text-tinted mb-2">
                                    Rata-rata jawaban benar dan salah per responden (soal isian tanpa kunci tidak dihitung).
                                </p>
                                <div className="h-[190px]">
                                    <DonutChart
                                        bare
                                        showLegend
                                        height={200}
                                        data={[
                                            { name: "Rata-rata Benar", value: avgCorrect, color: colors.pass },
                                            { name: "Rata-rata Salah", value: avgWrong, color: colors.wrong },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="bg-white border border-second p-5 shadow-sm rounded-none lg:flex-1">
                                <p className="font-semibold text-darks mb-0.5">Total Benar vs Salah</p>
                                <p className="text-xs text-tinted mb-2">
                                    Jumlah jawaban benar dan salah dari seluruh submission.
                                </p>
                                <div className="h-[190px]">
                                    <DonutChart
                                        bare
                                        showLegend
                                        height={200}
                                        data={[
                                            { name: "Benar", value: totalCorrect, color: colors.pass },
                                            { name: "Salah", value: totalWrong, color: colors.wrong },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Baris 2+3: Statistik per Soal & Distribusi Opsi (switch) */}
                        {(perQuestionStats.length > 0 || barData.length > 0) && (
                            <div className="bg-white border border-second p-5 shadow-sm rounded-none">
                                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                                    <div>
                                        <p className="font-semibold text-darks mb-0.5">
                                            {chartView === "statistik" ? "Statistik Jawaban per Soal" : "Distribusi Opsi Jawaban"}
                                        </p>
                                        <p className="text-xs text-tinted">
                                            {chartView === "statistik"
                                                ? "Jumlah jawaban benar, salah, dan kosong (tidak dijawab) untuk tiap soal dari seluruh submission."
                                                : "Jumlah pilihan tiap opsi per soal dari seluruh submission (soal isian tidak dihitung)."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 p-1 bg-base border border-second rounded-none shrink-0">
                                        <button
                                            onClick={() => setChartView("statistik")}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-none transition-colors ${
                                                chartView === "statistik" ? "bg-darks text-base" : "text-tinted hover:text-darks"
                                            }`}
                                        >
                                            Statistik
                                        </button>
                                        <button
                                            onClick={() => setChartView("distribusi")}
                                            className={`px-2 py-1.5 text-xs font-medium rounded-none transition-colors ${
                                                chartView === "distribusi" ? "bg-darks text-base" : "text-tinted hover:text-darks"
                                            }`}
                                        >
                                            Distribusi
                                        </button>
                                    </div>
                                </div>

                                {chartView === "statistik" && perQuestionStats.length > 0 && (
                                    <>
                                        <div style={{ overflowX: "auto" }}>
                                            <div style={{ width: `max(100%, ${Math.max(1, perQuestionStats.length) * 64}px)`, height: 280 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={perQuestionStats} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} interval={0} />
                                                        <YAxis tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                        <Tooltip cursor={{ fill: colors.second }} content={renderPerQuestionTooltip} />
                                                        <Bar dataKey="benar" stackId="q" name="Benar" fill={colors.pass} />
                                                        <Bar dataKey="salah" stackId="q" name="Salah" fill={colors.wrong} />
                                                        <Bar dataKey="kosong" stackId="q" name="Kosong" fill={colors.tinted} radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-tinted">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.pass }} />
                                                Benar
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-tinted">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.wrong }} />
                                                Salah
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-tinted">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors.tinted }} />
                                                Kosong
                                            </span>
                                        </div>
                                    </>
                                )}

                                {chartView === "distribusi" && barData.length > 0 && (
                                    <>
                                        <div style={{ overflowX: "auto" }}>
                                            <div style={{ width: `max(100%, ${Math.max(1, barData.length) * 56}px)`, height: 280 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={barData} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} interval={0} />
                                                        <YAxis tick={{ fontSize: 11, fill: colors.tinted }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                        <Tooltip cursor={{ fill: colors.second }} content={renderTooltip} />
                                                        {barSeries.map((s) => (
                                                            <Bar key={s.key} dataKey={s.key} stackId="opt" name={s.label} fill={s.color} />
                                                        ))}
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                                            {barSeries.map((s) => (
                                                <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-tinted">
                                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                                    {s.label}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {submissions.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted">Belum ada submission.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map((s) => (
                            <div key={s.id} className="bg-white border border-second p-5 shadow-sm rounded-none">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-darks">{s.user?.name || "Pengguna"}</p>
                                        <p className="text-xs text-tinted mt-1">
                                            Token: {s.token?.token_code || "-"} &middot; Dikirim: {fmtDate(s.submitted_at)}
                                        </p>
                                        {s.total_score != null && (
                                            <p className="text-sm text-darks mt-1">Skor: <span className="font-bold">{s.total_score}</span></p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span
                                            className={`badge rounded-full text-xs ${s.status === "SUBMITTED" ? "bg-done/10 text-done border-none" : "badge-ghost text-tinted"
                                                }`}
                                        >
                                            {statusLabel(s.status)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => navigate(`/creator/forms/${id}/submissions/${s.id}`)}
                                                className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Lihat
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s)}
                                                disabled={deletingId === s.id}
                                                className="btn btn-sm bg-wrong/10 text-wrong border-none hover:opacity-90 disabled:opacity-60"
                                            >
                                                {deletingId === s.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
            )}
        </>
    )
}

export default Submissions
