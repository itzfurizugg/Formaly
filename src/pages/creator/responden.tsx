import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { ChartNoAxesColumn, ChevronRight, FileText, ListChecks, Timer } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import BackButton from "../../components/backButton"
import FormHeader from "../../components/creator/formHeader"
import { listContainer, listItem } from "../../lib/motion"

interface FormRow {
    id: string
    title: string
    description: string
    header_image?: string | null
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
                id, title, description, duration, header_image,
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
        <div className="flex flex-col items-center px-3 sm:px-6 py-5 sm:py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to="/creator" />

                <div className="ml-2">
                    <h1 className="text-3xl lg:text-5xl font-bold font-display text-darks mb-1">Responden</h1>
                    <p className="text-sm text-tinted mb-6">Pilih form untuk melihat submission-nya.</p>
                </div>

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
                    <motion.div
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                        className="grid sm:grid-cols-2 gap-3 items-stretch"
                    >
                        {forms.map((form) => (
                            <motion.div key={form.id} variants={listItem} className="h-full">
                                <button
                                    onClick={() => navigate(`/creator/forms/${form.id}/submissions`)}
                                    aria-label={`Lihat submission ${form.title}`}
                                    className="group card bg-white border border-second rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-darks/5 w-full text-left h-full overflow-hidden"
                                >
                                    <FormHeader formId={form.id} title={form.title} headerImage={form.header_image} />
                                    <div className="card-body gap-4 p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-base text-xl sm:text-2xl font-bold font-display text-darks break-words leading-snug">
                                                    {form.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinted mt-1">
                                                    <span className="inline-flex items-center gap-1">
                                                        <ListChecks className="h-3.5 w-3.5" /> {form.questions?.length || 0} soal
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Timer className="h-3.5 w-3.5" /> {form.duration ? `${form.duration} menit` : "Tanpa Waktu"}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-tinted/60 shrink-0 self-center transition-all" />
                                        </div>

                                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-dashed border-second">
                                            <span className="inline-flex items-center gap-1.5 rounded-full text-darks text-xs font-semibold px-1">
                                                <ChartNoAxesColumn className="h-3.5 w-3.5" />
                                                Total Responden: {form.submissions?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    )
}

export default CreatorResponden
