import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { FileText, Pencil, Trash2, ClipboardList, KeyRound, Loader2, ListChecks, Timer, Target, Share2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete } from "../../lib/alerts"
import Loading from "../loading"
import { RichText } from "../richText"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo } from "../../lib/motion"

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
    const [cached] = useState<FormRow[] | undefined>(() =>
        user ? pageGet<FormRow[]>(`formList:${user.id}`) : undefined
    )
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
    }, [user])

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
        if (s === "published") return (
            <span className="badge rounded-full text-done text-xs font-medium px-2 bg-done/10 border-none">
                Public
            </span>
        )
        return (
            <span className="badge rounded-full border border-second bg-transparent text-tinted text-xs font-medium px-2">
                Draft
            </span>
        )
    }

    return (
        <>
            <Loading show={loading} />
            {!loading && (
                error ? (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-none px-4 py-3">
                        {error}
                    </div>
                ) : forms.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted mb-4">Belum ada form. Buat form pertamamu!</p>
                    </div>
                ) : (
        <div className="space-y-3">
            {forms.map((form, index) => (
                <motion.div
                    key={form.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                >
                <div className="card bg-white border border-second rounded-none transition-colors hover:bg-base-200">
                    <div className="card-body gap-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="card-title text-darks break-words leading-snug text-base">{form.title}</h2>
                                <div className="text-sm text-tinted line-clamp-2">
                                    {form.description ? <RichText html={form.description} className="line-clamp-2" /> : "Tidak ada deskripsi"}
                                </div>
                            </div>
                            <div className="shrink-0">
                                {statusBadge(form.status)}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-tinted/80 mt-1 mb-2">
                            <span className="inline-flex items-center gap-1.5">
                                <ListChecks className="h-3.5 w-3.5" /> {form.questions?.length || 0} soal
                            </span>
                            {/* <span className="inline-flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" /> {form.submissions?.length || 0} submission
                            </span> */}
                            <span className="inline-flex items-center gap-1.5">
                                <Timer className="h-3.5 w-3.5" /> {form.duration ? `${form.duration} menit` : "Tanpa Waktu"}
                            </span>
                            {form.passing_score != null && (
                                <span className="hidden sm:inline-flex items-center gap-1.5">
                                    <Target className="h-3.5 w-3.5" /> Nilai Minimum: {form.passing_score}
                                </span>
                            )}
                            {/* <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(form.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span> */}
                        </div>

                        <div className="card-actions justify-end flex-wrap gap-2">
                            <button
                                onClick={() => navigate(`/creator/forms/${form.id}/submissions`)}
                                className="btn btn-sm rounded-none bg-base text-darks border border-second hover:bg-second hover:border-second"
                            >
                                <ClipboardList className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Submission</span>
                            </button>
                            <button
                                onClick={() => navigate(`/creator/forms/${form.id}/shared`)}
                                className="btn btn-sm rounded-none bg-base text-darks border border-second hover:bg-second hover:border-second"
                            >
                                <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Bagikan</span>
                            </button>
                            <button
                                onClick={() => navigate(`/creator/forms/${form.id}/tokens`)}
                                className="btn btn-sm rounded-none bg-base text-darks border border-second hover:bg-second hover:border-second"
                            >
                                <KeyRound className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Token</span>
                            </button>
                            <button
                                onClick={() => navigate(`/creator/forms/${form.id}`)}
                                className="btn btn-sm rounded-none bg-base text-darks border border-second hover:bg-second hover:border-second"
                            >
                                <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                                onClick={() => handleDelete(form.id)}
                                disabled={deleting === form.id}
                                className="btn btn-sm rounded-none bg-wrong/10 text-wrong border border-wrong/20 hover:bg-wrong/20"
                            >
                                {deleting === form.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                <span className="hidden sm:inline">Hapus</span>
                            </button>
                        </div>
                    </div>
                </div>
                </motion.div>
            ))}
        </div>
                )
            )}
        </>
    )
}

export default FormList