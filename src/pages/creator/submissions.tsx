import Loading from "../../components/loading"
import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Eye, Trash2, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"

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

    const statusLabel = (s: string) => {
        if (s === "SUBMITTED") return "Selesai"
        if (s === "IN_PROGRESS") return "Proses"
        return s
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

    const handleDelete = async (s: Submission) => {
        if (!window.confirm(`Hapus submission dari ${s.user?.name || "Pengguna"}? Tindakan ini tidak dapat dibatalkan.`)) return
        setDeletingId(s.id)
        setError(null)

        const { error: ansErr } = await supabase.from("answers").delete().eq("submission_id", s.id)
        if (ansErr) {
            setError(ansErr.message || "Gagal menghapus jawaban.")
            setDeletingId(null)
            return
        }

        const { error: subErr } = await supabase.from("submissions").delete().eq("id", s.id)
        if (subErr) {
            setError(subErr.message || "Gagal menghapus submission.")
            setDeletingId(null)
            return
        }

        setDeletingId(null)
        loadAll()
    }

    if (loading) {
        return <Loading />
    }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <button
                    onClick={() => navigate(`/creator/forms/${id}`)}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Detail
                </button>

                <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Submission</h1>
                <p className="text-sm text-tinted mb-6">Form: {formTitle}</p>

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
