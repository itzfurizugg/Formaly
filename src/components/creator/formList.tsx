import { useEffect, useState, useCallback, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { FileText, Pencil, Trash2, ClipboardList, KeyRound, Share2, MoreVertical } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete, showAlert } from "../../lib/alerts"
import { RichText } from "../richText"
import FormHeader from "./formHeader"
import { pageGet, pageSet } from "../../lib/pageCache"
import { easeOutExpo } from "../../lib/motion"
import { Spinner } from "../loading"

interface FormActionsMenuProps {
    formId: string
    deleting: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
    onNavigate: (to: string) => void
    onDelete: () => void
}

function FormActionsMenu({ formId, deleting, open, onOpenChange, onNavigate, onDelete }: FormActionsMenuProps) {
    const item = (to: string) => (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
        onNavigate(to)
    }

    const deleteItem = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
        onDelete()
    }

    const toggle = () => onOpenChange(!open)

    return (
        <div
            className="relative inline-block"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}
        >
            <button
                onClick={toggle}
                className="btn btn-xs lg:btn-sm btn-circle bg-white text-darks hover:bg-second flex items-center justify-center"
                aria-label="Aksi form"
                aria-expanded={open}
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 bottom-full mb-2 z-50 min-w-[12rem] rounded-2xl bg-white border border-second shadow-xl overflow-hidden origin-bottom-right"
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    >
                        <button
                            onClick={item(`/creator/forms/${formId}/submissions`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-darks hover:bg-base transition-colors text-left"
                        >
                            <ClipboardList className="h-4 w-4 text-tinted" /> Responden
                        </button>
                        <button
                            onClick={item(`/creator/forms/${formId}/tokens`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-darks hover:bg-base transition-colors text-left"
                        >
                            <KeyRound className="h-4 w-4 text-tinted" /> Token
                        </button>
                        <button
                            onClick={deleteItem}
                            disabled={deleting}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-wrong hover:bg-wrong/10 transition-colors text-left border-t border-base"
                        >
                            {deleting ? <Spinner size={16} /> : <Trash2 className="h-4 w-4" />} Hapus
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

interface FormRow {
    id: string
    title: string
    description: string
    status: string
    duration: number
    passing_score: number
    created_at: string
    header_image?: string | null
    header_color?: string | null
    media_url?: string | null
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
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    const loadForms = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)
        const { data, error: err } = await supabase
            .from("forms")
            .select(`
                id, title, description, status, duration, passing_score, created_at, header_image, header_color, media_url
            `)
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false })

        if (err) {
            showAlert("Gagal memuat data.", "error")
            setError(err.message)
        } else {
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
            {!loading && (
                error ? (
                    <p className="text-sm text-tinted">{error}</p>
                ) : forms.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted mb-4">Belum ada form. Buat form pertamamu!</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-3 items-stretch">
                        {forms.map((form, index) => (
                            <motion.div
                                key={form.id}
                                className="h-full"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                            >
                                {/* h-full agar kartu melar mengikuti tinggi baris grid — semua kartu
                    satu baris jadi sama tinggi seperti tampilan di halaman Responden */}
                                <div className="relative h-full">
                                    <div className="card bg-white border border-second rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-darks/5 overflow-hidden h-full">
                                        <FormHeader formId={form.id} title={form.title} headerImage={form.header_image} headerColor={form.header_color} headerMedia={form.media_url} play={false} />
                                        <div className="card-body gap-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className="inline-flex items-center gap-1.5 text-tinted">
                                                        Dibuat pada: {new Date(form.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                                    </span>
                                                    <h2 className="card-title text-xl sm:text-2xl text-darks break-words leading-snug text-base">{form.title}</h2>
                                                    <div className="text-sm text-tinted line-clamp-2">
                                                        {form.description ? <RichText html={form.description} className="line-clamp-1" enhanceMedia={false} /> : "Tidak ada deskripsi"}
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    {statusBadge(form.status)}
                                                </div>
                                            </div>

                                            {/* <div className="flex flex-wrap items-center gap-x-4 text-xs text-tinted/80 mt-1 mb-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ListChecks className="h-3.5 w-3.5" /> {form.questions?.length || 0} soal
                                                </span> */}
                                                {/* <span className="inline-flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5" /> {form.submissions?.length || 0} submission
                                                </span> */}
                                                {/* <span className="inline-flex items-center gap-1.5">
                                                    <Timer className="h-3.5 w-3.5" /> {form.duration ? `${form.duration} menit` : "Tanpa Waktu"}
                                                </span>
                                                {form.passing_score != null && (
                                                    <span className="hidden sm:inline-flex items-center gap-1.5">
                                                        <Target className="h-3.5 w-3.5" /> Nilai Minimum: {form.passing_score}
                                                    </span>
                                                )}
                                            </div> */}
                                            
                                            <div className="card-actions justify-end flex-wrap gap-2 items-center mt-auto pt-1">
                                                <button
                                                    onClick={() => navigate(`/creator/forms/${form.id}/shared`)}
                                                    className="btn btn-sm rounded-full bg-base text-darks border border-second hover:bg-second hover:border-second"
                                                >
                                                    <Share2 className="h-3.5 w-3.5" /> Bagikan
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/creator/forms/${form.id}`)}
                                                    className="btn btn-sm rounded-full bg-base text-darks border border-second hover:bg-second hover:border-second"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                                </button>
                                                <FormActionsMenu
                                                    formId={form.id}
                                                    deleting={deleting === form.id}
                                                    open={openMenuId === form.id}
                                                    onOpenChange={(open) => setOpenMenuId(open ? form.id : null)}
                                                    onNavigate={(to) => navigate(to)}
                                                    onDelete={() => handleDelete(form.id)}
                                                />
                                            </div>
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