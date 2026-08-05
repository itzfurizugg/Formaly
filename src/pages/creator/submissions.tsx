import Loading from "../../components/loading"
import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Eye, Trash2, Loader2, FileSpreadsheet, ClipboardList, CheckCircle2, Clock, TrendingUp } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete, showAlert } from "../../lib/alerts"
import { exportFormXlsx } from "../../lib/exportForm"

interface Submission {
    id: string
    total_score: number
    status: string
    started_at: string | null
    submitted_at: string | null
    user: { name: string } | null
    token: { token_code: string } | null
}

function Submissions() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [formTitle, setFormTitle] = useState("")
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const loadAll = useCallback(async () => {
        if (!user || !id) return

        const { data: form } = await supabase
            .from("forms")
            .select("title")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()
        if (form) setFormTitle(form.title)

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
        setLoading(false)
    }, [user, id])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    const handleExport = async () => {
        if (!id) return
        setExporting(true)
        setError(null)
        try {
            await exportFormXlsx({ formId: id, formTitle: formTitle || "form" })
            showAlert("Export berhasil diunduh.", "success")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengekspor data.")
        } finally {
            setExporting(false)
        }
    }

    const stats = {
        total: submissions.length,
        completed: submissions.filter((s) => s.status === "SUBMITTED").length,
        inProgress: submissions.filter((s) => s.status === "IN_PROGRESS").length,
        avgScore: (() => {
            const scored = submissions.filter((s) => s.total_score != null)
            if (!scored.length) return 0
            return scored.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) / scored.length
        })(),
    }

    const statusLabel = (s: string) => {
        if (s === "SUBMITTED") return "Selesai"
        if (s === "IN_PROGRESS") return "Proses"
        return s
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

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

    if (loading) {
        return <Loading />
    }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-5xl">
                <button
                    onClick={() => navigate(`/creator/forms/${id}`)}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Detail
                </button>

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Submission</h1>
                <p className="text-sm text-tinted mb-6">Form: {formTitle}</p>

                <div className="flex justify-end gap-2 mb-4">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="btn bg-darks text-base border-none h-9 min-h-0 disabled:opacity-60"
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Export XLSX
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:stats sm:stats-horizontal shadow w-full bg-white border border-second rounded-none divide-x divide-second mb-6">
                    <div className="stat p-3 sm:p-4">
                        <div className="stat-figure text-darks hidden sm:block">
                            <ClipboardList className="h-8 w-8" />
                        </div>
                        <div className="stat-title text-tinted text-[11px] sm:text-sm">Total Submission</div>
                        <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.total}</div>
                        <div className="stat-desc text-tinted hidden sm:block">Semua pengerjaan</div>
                    </div>
                    <div className="stat p-3 sm:p-4">
                        <div className="stat-figure text-done hidden sm:block">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="stat-title text-tinted text-[11px] sm:text-sm">Selesai</div>
                        <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.completed}</div>
                        <div className="stat-desc text-tinted hidden sm:block">Status SUBMITTED</div>
                    </div>
                    <div className="stat p-3 sm:p-4">
                        <div className="stat-figure text-tinted hidden sm:block">
                            <Clock className="h-8 w-8" />
                        </div>
                        <div className="stat-title text-tinted text-[11px] sm:text-sm">Sedang Dikerjakan</div>
                        <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.inProgress}</div>
                        <div className="stat-desc text-tinted hidden sm:block">Status IN_PROGRESS</div>
                    </div>
                    <div className="stat p-3 sm:p-4">
                        <div className="stat-figure text-darks hidden sm:block">
                            <TrendingUp className="h-8 w-8" />
                        </div>
                        <div className="stat-title text-tinted text-[11px] sm:text-sm">Rata-rata Skor</div>
                        <div className="stat-value text-darks text-3xl sm:text-4xl">{stats.avgScore.toFixed(1)}</div>
                        <div className="stat-desc text-tinted hidden sm:block">Dari submission berisi skor</div>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
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
                                            className={`badge rounded-full text-xs ${
                                                s.status === "SUBMITTED" ? "bg-done/10 text-done border-none" : "badge-ghost text-tinted"
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
    )
}

export default Submissions
