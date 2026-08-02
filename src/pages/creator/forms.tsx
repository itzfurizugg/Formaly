import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FileText, Plus, Pencil, Trash2, ClipboardList, KeyRound, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

interface FormRow {
    id: string
    title: string
    description: string
    status: string
    duration: number
    passing_score: number
    created_at: string
    questions: { id: string }[]
    submissions: { id: string }[]
}

function CreatorForms() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [forms, setForms] = useState<FormRow[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return
        loadForms()
    }, [user])

    async function loadForms() {
        if (!user) return
        setLoading(true)
        const { data, error: err } = await supabase
            .from("forms")
            .select(`
                id, title, description, status, duration, passing_score, created_at,
                questions ( id ),
                submissions ( id )
            `)
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false })

        if (err) setError(err.message)
        else setForms((data as FormRow[]) || [])
        setLoading(false)
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Hapus form ini beserta soal & submission-nya?")) return
        setDeleting(id)
        setError(null)
        const { error: err } = await supabase.from("forms").delete().eq("id", id)
        setDeleting(null)
        if (err) setError(err.message)
        else loadForms()
    }

    const statusBadge = (status: string) => {
        const s = String(status).toLowerCase()
        if (s === "published") return <span className="badge badge-success text-white rounded-full">{status}</span>
        return <span className="badge badge-ghost text-tinted rounded-full">{status}</span>
    }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-darks">Kelola Form</h1>
                    <Link to="/creator/forms/new" className="btn bg-darks text-base border-none h-9 min-h-0">
                        <Plus className="h-4 w-4" /> Buat Form
                    </Link>
                </div>
                <p className="text-sm text-tinted mb-6">Semua formulir yang kamu buat.</p>

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="loading loading-spinner loading-lg" />
                    </div>
                ) : forms.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted mb-4">Belum ada form. Buat form pertamamu!</p>
                        <Link to="/creator/forms/new" className="btn bg-darks text-base border-none">
                            <Plus className="h-4 w-4" /> Buat Form
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {forms.map((form) => (
                            <div key={form.id} className="card bg-base border border-second rounded-2xl">
                                <div className="card-body">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="card-title text-darks break-words">{form.title}</h2>
                                            <p className="text-sm text-tinted mt-1 line-clamp-2">
                                                {form.description || "Tidak ada deskripsi"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {statusBadge(form.status)}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-tinted/70">
                                        <span>{form.questions?.length || 0} soal</span>
                                        <span>{form.submissions?.length || 0} submission</span>
                                        <span>Durasi {form.duration || 0} menit</span>
                                        {form.passing_score != null && <span>Passing {form.passing_score}</span>}
                                        <span>{new Date(form.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    </div>

                                    <div className="card-actions justify-end mt-3 flex-wrap">
                                        <button
                                            onClick={() => navigate(`/creator/forms/${form.id}/submissions`)}
                                            className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                                        >
                                            <ClipboardList className="h-3.5 w-3.5" /> Submission
                                        </button>
                                        <button
                                            onClick={() => navigate(`/creator/forms/${form.id}/tokens`)}
                                            className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                                        >
                                            <KeyRound className="h-3.5 w-3.5" /> Token
                                        </button>
                                        <button
                                            onClick={() => navigate(`/creator/forms/${form.id}`)}
                                            className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(form.id)}
                                            disabled={deleting === form.id}
                                            className="btn btn-sm bg-wrong text-base border-none"
                                        >
                                            {deleting === form.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            Hapus
                                        </button>
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

export default CreatorForms
