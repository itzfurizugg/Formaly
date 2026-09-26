import { useEffect, useState, useCallback, useMemo, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import {
    Check,
    ClipboardList,
    FileText,
    Folder,
    Home,
    KeyRound,
    LayoutGrid,
    MoreVertical,
    Pencil,
    Share2,
    Trash2,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete, showAlert } from "../../lib/alerts"
import { RichText } from "../richText"
import FormHeader from "./formHeader"
import { pageGet, pageSet } from "../../lib/pageCache"
import { deleteStoredMedia } from "../../lib/mediaStorage"
import { collectFormMediaUrls } from "../../lib/mediaCleanup"
import { easeOutExpo, listContainer, listItem } from "../../lib/motion"
import { Spinner } from "../loading"

interface FolderRow {
    id: string
    name: string
    created_at: string
}

interface FormActionsMenuProps {
    formId: string
    deleting: boolean
    open: boolean
    onOpenChange: (open: boolean) => void
    onNavigate: (to: string) => void
    onDelete: () => void
    folders: FolderRow[]
    currentFolderId: string | null
    onMove: (folderId: string | null) => void
}

function FormActionsMenu({ formId, deleting, open, onOpenChange, onNavigate, onDelete, folders, currentFolderId, onMove }: FormActionsMenuProps) {
    const [moveOpen, setMoveOpen] = useState(false)

    // Reset sub-menu saat menu utama ditutup.
    useEffect(() => {
        if (!open) setMoveOpen(false)
    }, [open])

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

    const toggleMove = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setMoveOpen((v) => !v)
    }

    const pickFolder = (folderId: string | null) => (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
        onMove(folderId)
    }

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
                className="btn btn-xs lg:btn-sm btn-circle bg-white dark:bg-base text-darks border border-second dark:border-darks/15 hover:bg-white hover:border-second dark:hover:bg-second dark:hover:border-darks/25 flex items-center justify-center"
                aria-label="Aksi form"
                aria-expanded={open}
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 bottom-full mb-2 z-50 min-w-[13rem] rounded-2xl bg-white dark:bg-second border border-second shadow-xl overflow-hidden origin-bottom-right"
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

                        <div className="border-t border-base">
                            <button
                                onClick={toggleMove}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-darks hover:bg-base transition-colors text-left"
                            >
                                <span className="flex items-center gap-3">
                                    <Folder className="h-4 w-4 text-tinted" /> Pindahkan ke Folder
                                </span>
                                <span className={`text-tinted transition-transform ${moveOpen ? "rotate-180" : ""}`}>
                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </span>
                            </button>
                            <AnimatePresence initial={false}>
                                {moveOpen && (
                                    <motion.div
                                        key="move-folder-list"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: easeOutExpo }}
                                        className="overflow-hidden border-t border-base bg-darks/10"
                                    >
                                        <div className="max-h-48 overflow-y-auto py-2 px-1">
                                            <button
                                                onClick={pickFolder(null)}
                                                className="w-full flex items-center rounded-sm gap-3 px-5 py-2 text-sm text-darks hover:bg-base transition-colors text-left"
                                            >
                                                <Home className="h-4 w-4 text-tinted" />
                                                <span className="flex-1 text-darks/20">/</span>
                                                {currentFolderId === null && <Check className="h-4 w-4 text-done" />}
                                            </button>
                                            {folders.map((f) => (
                                                <button
                                                    key={f.id}
                                                    onClick={pickFolder(f.id)}
                                                    className="w-full flex items-center rounded-sm gap-3 px-5 py-2 text-sm text-darks hover:bg-base transition-colors text-left"
                                                >
                                                    <Folder className="h-4 w-4 text-tinted" />
                                                    <span className="flex-1 truncate">{f.name}</span>
                                                    {currentFolderId === f.id && <Check className="h-4 w-4 text-done shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

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
    folder_id?: string | null
}

type FolderFilter = "all" | "unfiled" | string

function FormList() {
    const navigate = useNavigate()
    const { user } = useAuth()
    // Cache daftar form supaya kembali ke dashboard tidak memunculkan
    // overlay loading lagi; di-refresh diam-diam saat mount.
    const [cached] = useState<FormRow[] | undefined>(() =>
        user ? pageGet<FormRow[]>(`formList:${user.id}`) : undefined
    )
    const [forms, setForms] = useState<FormRow[]>(cached ?? [])
    const [folders, setFolders] = useState<FolderRow[]>([])
    const [activeFolder, setActiveFolder] = useState<FolderFilter>("all")
    const [loading, setLoading] = useState(!cached)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [movingId, setMovingId] = useState<string | null>(null)

    const loadForms = useCallback(async () => {
        if (!user) return
        if (!cached) setLoading(true)
        const [formsRes, foldersRes] = await Promise.all([
            supabase
                .from("forms")
                .select(`
                    id, title, description, status, duration, passing_score, created_at, header_image, header_color, media_url, folder_id
                `)
                .eq("creator_id", user.id)
                .order("created_at", { ascending: false }),
            supabase
                .from("folders")
                .select("id, name, created_at")
                .eq("creator_id", user.id)
                .order("created_at", { ascending: true }),
        ])

        if (formsRes.error) {
            showAlert("Gagal memuat data.", "error")
            setError(formsRes.error.message)
        } else {
            const rows = (formsRes.data as FormRow[]) || []
            setForms(rows)
            if (user) pageSet(`formList:${user.id}`, rows)
        }
        if (!foldersRes.error) {
            setFolders((foldersRes.data as FolderRow[]) || [])
        }
        setLoading(false)
    }, [user, cached])

    useEffect(() => {
        if (!user) return
        loadForms()
    }, [user, loadForms])

    async function handleMoveToFolder(formId: string, folderId: string | null) {
        setMovingId(formId)
        const { error } = await supabase
            .from("forms")
            .update({ folder_id: folderId })
            .eq("id", formId)
            .select("id")
            .maybeSingle()
        if (error) {
            showAlert(error.message, "error")
            setMovingId(null)
            return
        }
        showAlert("Form berhasil dipindahkan.", "success")
        // Tahan highlight kartu sebentar supaya perpindahan folder terbaca,
        // lalu refresh daftar (kartu ikut exit/enter + layout shift halus).
        window.setTimeout(() => {
            setMovingId(null)
            loadForms()
        }, 450)
    }

    async function handleDelete(id: string) {
        confirmDelete({
            title: "Hapus form ini?",
            description: "Form, soal, token, dan semua submission terkait akan ikut terhapus permanen.",
            onConfirm: async () => {
                setDeleting(id)
                setError(null)
                try {
                    // Kumpulkan URL media dulu sebelum baris form dihapus,
                    // supaya masih bisa di-query dari database.
                    const urls = await collectFormMediaUrls(id)
                    const { error } = await supabase.rpc("delete_form", { p_form_id: id })
                    if (error) throw new Error(error.message)
                    // Setelah data dihapus, bersihkan file-nya di storage.
                    await deleteStoredMedia(urls)
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

    const folderNameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const f of folders) map.set(f.id, f.name)
        return map
    }, [folders])

    const folderCount = useMemo(() => {
        const map = new Map<string, number>()
        for (const f of forms) {
            if (!f.folder_id) continue
            map.set(f.folder_id, (map.get(f.folder_id) ?? 0) + 1)
        }
        return map
    }, [forms])

    const visibleForms = useMemo(() => {
        if (activeFolder === "all") return forms
        if (activeFolder === "unfiled") return forms.filter((f) => !f.folder_id)
        return forms.filter((f) => f.folder_id === activeFolder)
    }, [forms, activeFolder])

    const chipCls = (active: boolean) =>
        `btn btn-sm h-8 min-h-0 rounded-full gap-1.5 px-3 border-none ${active
            ? "bg-darks text-base"
            : "bg-white dark:bg-second border border-second text-darks hover:bg-base"
        }`

    const countBadge = (active: boolean, count: number) => (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-base/25 text-base" : "bg-base text-tinted"}`}>
            {count}
        </span>
    )

    return (
        <>
            {!loading && (
                error ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-tinted">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* ========== Filter folder ========== */}
                        <motion.div
                            variants={listContainer}
                            initial="hidden"
                            animate="show"
                            className="flex flex-wrap items-center gap-2 mb-6"
                        >
                            <motion.div variants={listItem} whileTap={{ scale: 0.94 }}>
                                <button
                                    onClick={() => setActiveFolder("all")}
                                    className={chipCls(activeFolder === "all")}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" /> Semua {countBadge(activeFolder === "all", forms.length)}
                                </button>
                            </motion.div>
                            <AnimatePresence initial={false} mode="popLayout">
                                {folders.map((f) => {
                                    const active = activeFolder === f.id
                                    const count = folderCount.get(f.id) ?? 0
                                    return (
                                        <motion.div
                                            key={f.id}
                                            variants={listItem}
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
                                            layout
                                            whileTap={{ scale: 0.94 }}
                                            className="relative inline-flex items-center group"
                                        >
                                            <button
                                                onClick={() => setActiveFolder(f.id)}
                                                className={chipCls(active)}
                                            >
                                                <Folder className="h-3.5 w-3.5" />
                                                <span className="max-w-[9rem] truncate">{f.name}</span>
                                                {countBadge(active, count)}
                                            </button>
                                        {/* <div className="ml-0.5 hidden group-hover:flex items-center gap-0.5">
                                            <button
                                                onClick={() => handleRenameFolder(f.id, f.name)}
                                                aria-label={`Ubah nama folder ${f.name}`}
                                                className="btn btn-xs btn-ghost btn-circle h-7 min-h-0 w-7 text-tinted hover:bg-base"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(f.id, f.name)}
                                                aria-label={`Hapus folder ${f.name}`}
                                                className="btn btn-xs btn-ghost btn-circle h-7 min-h-0 w-7 text-wrong hover:bg-wrong/10"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div> */}
                                    </motion.div>
                                )
                            })}
                            </AnimatePresence>
                            {/* <button
                                onClick={handleCreateFolder}
                                className="btn btn-sm h-8 min-h-0 rounded-full gap-1.5 px-3 bg-base text-darks border border-dashed border-second hover:bg-white dark:hover:bg-second"
                            >
                                <FolderPlus className="h-3.5 w-3.5" /> Folder Baru
                            </button> */}
                        </motion.div>

                        {visibleForms.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                                <p className="text-tinted mb-4">
                                    {activeFolder === "all"
                                        ? "Belum ada form. Buat form pertamamu!"
                                        : "Tidak ada form di sini. Pindahkan form lewat menu aksi, atau buat form baru."}
                                </p>
                            </div>
                        ) : (
                            <motion.div layout className="grid sm:grid-cols-2 gap-3 items-stretch">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {visibleForms.map((form, index) => {
                                        const folderName = form.folder_id ? folderNameById.get(form.folder_id) : undefined
                                        const moving = movingId === form.id
                                        return (
                                            <motion.div
                                                key={form.id}
                                                layout
                                                className="h-full"
                                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                    scale: moving ? [1, 1.03, 1] : 1,
                                                    transition: { duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) },
                                                }}
                                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }}
                                            >
                                                {/* h-full agar kartu melar mengikuti tinggi baris grid — semua kartu
                                                satu baris jadi sama tinggi seperti tampilan di halaman Responden */}
                                                <div className="relative h-full">
                                                    <div className={`card bg-white dark:bg-second border rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-darks/5 overflow-hidden h-full ${moving ? "border-done shadow-lg shadow-done/20" : "border-second"}`}>
                                                        <div className="relative">
                                                            <FormHeader formId={form.id} title={form.title} headerImage={form.header_image} headerColor={form.header_color} headerMedia={form.media_url} play={false} />
                                                            <AnimatePresence initial={false} mode="popLayout">
                                                                {folderName && (
                                                                    <motion.span
                                                                        key={folderName}
                                                                        initial={{ opacity: 0, scale: 0.8, y: -4 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.8, y: -4 }}
                                                                        transition={{ duration: 0.25, ease: easeOutExpo }}
                                                                        className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
                                                                    >
                                                                        <Folder className="h-3 w-3" /> {folderName}
                                                                    </motion.span>
                                                                )}
                                                            </AnimatePresence>
                                                            {moving && (
                                                                <div className="absolute inset-x-0 top-3 z-10 flex justify-center pointer-events-none">
                                                                    <motion.span
                                                                        initial={{ opacity: 0, y: -6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="inline-flex items-center gap-1.5 rounded-full bg-darks px-2.5 py-1 text-[10px] font-semibold text-white shadow"
                                                                    >
                                                                        Memindahkan...
                                                                    </motion.span>
                                                                </div>
                                                            )}
                                                        </div>
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
                                                                    className="btn btn-sm rounded-full bg-base text-darks border border-second dark:border-darks/15 hover:bg-white hover:border-second dark:hover:bg-second dark:hover:border-darks/25"
                                                                >
                                                                    <Share2 className="h-3.5 w-3.5" /> Bagikan
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/creator/forms/${form.id}`)}
                                                                    className="btn btn-sm rounded-full bg-base text-darks border border-second dark:border-darks/15 hover:bg-white hover:border-second dark:hover:bg-second dark:hover:border-darks/25"
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
                                                                    folders={folders}
                                                                    currentFolderId={form.folder_id ?? null}
                                                                    onMove={(folderId) => handleMoveToFolder(form.id, folderId)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>


                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </>
                )
            )}
        </>
    )
}

export default FormList