import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ChartNoAxesColumn, ChevronRight, ClipboardList, FileText, ListChecks, Timer } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { RichText } from "../../components/richText"
import BackButton from "../../components/backButton"

interface FormRow {
    id: string
    title: string
    description: string
    duration: number
    questions: { id: string }[]
    submissions: { id: string }[]
}

function CreatorResponden() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [forms, setForms] = useState<FormRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!user) return
        const { data, error: err } = await supabase
            .from("forms")
            .select(`
                id, title, description, duration,
                questions ( id ),
                submissions ( id )
            `)
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false })
        if (err) setError(err.message)
        else setForms((data as FormRow[]) || [])
        setLoading(false)
    }, [user])

    useEffect(() => {
        if (!user) return
        load()
    }, [user, load])

    return (
        <div className="flex flex-col items-center px-3 py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to="/creator" />

                <h1 className="text-3xl lg:text-4xl font-bold font-display text-darks mb-1">Responden</h1>
                <p className="text-sm text-tinted mb-6">Pilih form untuk melihat submission-nya.</p>

                {!loading && error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl px-4 py-3 mb-4">
                        {error}
                    </div>
                )}
                {!loading && forms.length === 0 && (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">Belum ada form.</p>
                    </div>
                )}
                {!loading && forms.length > 0 && (
                    <div className="space-y-3">
                        {forms.map((form) => (
                            <button
                                key={form.id}
                                onClick={() => navigate(`/creator/forms/${form.id}/submissions`)}
                                className="card bg-white border border-second rounded-xl hover:bg-base-200 transition-colors w-full text-left"
                            >
                                <div className="card-body gap-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="card-title text-darks break-words leading-snug text-base">{form.title}</h2>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-tinted/80 mt-1.5 mb-3">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ChartNoAxesColumn className="h-3.5 w-3.5" /> Total Responden: {form.submissions?.length || 0}
                                                </span>
                                            </div>
                                            <div className="text-sm text-tinted line-clamp-2">
                                                {form.description ? <RichText html={form.description} className="line-clamp-2" /> : "Tidak ada deskripsi"}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-tinted shrink-0" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CreatorResponden
