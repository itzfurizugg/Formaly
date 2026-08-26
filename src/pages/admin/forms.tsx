import { useEffect, useState, useCallback } from "react"
import { motion } from "motion/react"
import { FileText, RefreshCw } from "lucide-react"
import { RichText } from "../../components/richText"
import { supabase } from "../../lib/supabase"
import { easeOutExpo } from "../../lib/motion"

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

    return (
        <>
            {!loading && (
        <div className="flex flex-col items-center px-3.5 py-10 rounded-xl">
            <div className="max-w-4xl w-full rounded-xl">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-darks">Daftar Form</h1>
                    <button onClick={fetchForms} className="btn btn-ghost btn-sm rounded-xl">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
                <p className="text-sm text-tinted mb-6">Kelola semua formulir yang tersedia.</p>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl px-3.5 py-3 mb-4"
                    >
                        <p>{error}</p>
                        <button onClick={fetchForms} className="btn btn-sm bg-wrong text-base border-none mt-2 rounded-xl">
                            <RefreshCw className="h-3 w-3" />
                            Coba lagi
                        </button>
                    </motion.div>
                )}

                {!error && forms.length === 0 && (
                    <div className="text-center py-20 rounded-xl">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">Belum ada form.</p>
                    </div>
                )}

                {!error && forms.length > 0 && (
                    <div className="space-y-3 rounded-xl">
                        {forms.map((form, index) => (
                            <motion.div
                                key={form.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                            >
                                <div className="card bg-base border border-second rounded-xl transition-colors hover:bg-base-200">
                                <div className="card-body rounded-xl">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="card-title text-darks break-words">{form.title}</h2>
                                            {form.description && (
                                                <p className="text-sm text-tinted mt-1 line-clamp-2">
                                                    <RichText html={form.description} className="line-clamp-2" />
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`badge rounded-xl ${
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
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
            )}
        </>
    )
}

export default AdminForms
