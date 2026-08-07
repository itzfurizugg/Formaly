import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Pencil, Trash2, ClipboardList, KeyRound, Loader2, Share } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete } from "../../lib/alerts"
import Loading from "../loading"
import { RichText } from "../richText"
import { colors } from "../../lib/colorbase"
import { pageGet, pageSet } from "../../lib/pageCache"

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

function FormList() {
    const navigate = useNavigate()
    const { user } = useAuth()
    // Cache daftar form supaya kembali ke dashboard tidak memunculkan
    // overlay loading lagi; di-refresh diam-diam saat mount.
    const cached = user ? pageGet<FormRow[]>(`formList:${user.id}`) : undefined
    const [forms, setForms] = useState<FormRow[]>(cached ?? [])
    const [loading, setLoading] = useState(!cached)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadForms = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)
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
        else {
            const rows = (data as FormRow[]) || []
            setForms(rows)
            if (user) pageSet(`formList:${user.id}`, rows)
        }
        setLoading(false)
    }, [user, cached])

    useEffect(() => {
        if (!user) return
        loadForms()
    }, [user, loadForms])

    async function handleDelete(id: string) {
        confirmDelete({
            title: "Hapus form ini?",
            description: "Form, soal, token, dan semua submission terkait akan ikut terhapus permanen.",
            onConfirm: async () => {
                setDeleting(id)
                setError(null)
                try {
                    const { error } = await supabase.rpc("delete_form", { p_form_id: id })
                    if (error) throw new Error(error.message)
                    await loadForms()
                } finally {
                    setDeleting(null)
                }
            },
        })
    }

    const statusBadge = (status: string) => {
        const s = String(status).toLowerCase()
        if (s === "published") return <span className="badge text-white rounded-none" style={{ backgroundColor: colors.done }}>Public</span>
        return <span className="badge badge-ghost text-tinted rounded-full">Draft</span>
    }

    return (
        <>
            <Loading show={loading} />
            {!loading && (
                error ? (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3">
                        {error}
                    </div>
                ) : forms.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted mb-4">Belum ada form. Buat form pertamamu!</p>
                        <button onClick={() => navigate("/creator/forms/new")} className="btn bg-darks text-base border-none">
                            Buat Form
                        </button>
                    </div>
                ) : (
        <div className="space-y-3">
            {forms.map((form) => (
                <div key={form.id} className="card bg-white border border-second rounded-none">
                    <div className="card-body">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h2 className="card-title text-darks break-words">{form.title}</h2>
                                <p className="text-sm text-tinted mt-1 line-clamp-2">
                                    {form.description ? <RichText html={form.description} className="line-clamp-2" /> : "Tidak ada deskripsi"}
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
                                onClick={() => navigate(`/creator/forms/${form.id}/shared`)}
                                className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                            >
                                <Share className="h-3.5 w-3.5" /> Bagikan
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
                                className="btn btn-sm bg-wrong/10 text-wrong border-none"
                            >
                                {deleting === form.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
                )
            )}
        </>
    )
}

export default FormList
