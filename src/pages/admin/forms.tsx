import { useEffect, useState, useCallback } from "react"
import { FileText, RefreshCw } from "lucide-react"
import Loading from "../../components/loading"
import { supabase } from "../../lib/supabase"

type FormStatus = "draft" | "published"

interface Form {
    id: string
    creator_id: string
    title: string
    description: string
    passing_score: number
    status: FormStatus
    created_at: string
}

function AdminForms() {
    const [forms, setForms] = useState<Form[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchForms = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase
            .from("forms")
            .select("*")
            .order("created_at", { ascending: false })

        if (err) {
            setError(err.message)
        } else {
            setForms(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchForms()
    }, [fetchForms])

    if (loading) return <Loading />

    return (
        <div className="flex flex-col items-center px-4 py-10 rounded-none">
            <div className="max-w-4xl w-full rounded-none">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-darks">Daftar Form</h1>
                    <button onClick={fetchForms} className="btn btn-ghost btn-sm rounded-none">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
                <p className="text-sm text-tinted mb-6">Kelola semua formulir yang tersedia.</p>

                {error && (
                    <div className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-none px-4 py-3 mb-4">
                        <p>{error}</p>
                        <button onClick={fetchForms} className="btn btn-sm bg-wrong text-base border-none mt-2 rounded-none">
                            <RefreshCw className="h-3 w-3" />
                            Coba lagi
                        </button>
                    </div>
                )}

                {!error && forms.length === 0 && (
                    <div className="text-center py-20 rounded-none">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">Belum ada form.</p>
                    </div>
                )}

                {!error && forms.length > 0 && (
                    <div className="space-y-3 rounded-none">
                        {forms.map((form) => (
                            <div key={form.id} className="card bg-base border border-second rounded-none">
                                <div className="card-body rounded-none">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="card-title text-darks break-words">{form.title}</h2>
                                            {form.description && (
                                                <p className="text-sm text-tinted mt-1 line-clamp-2">{form.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`badge rounded-none ${
                                                    form.status === "published" ? "badge-success text-white" : "badge-ghost text-tinted"
                                                }`}
                                            >
                                                {form.status === "published" ? "public" : "draft"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-2 text-xs text-tinted/70">
                                        {form.passing_score != null && (
                                            <span>Passing score: {form.passing_score}</span>
                                        )}
                                        <span>{new Date(form.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
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

export default AdminForms
