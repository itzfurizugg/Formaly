import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Save, Loader2, ClipboardList, KeyRound, Share2, ListChecks, X, Info } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, showAlert } from "../../lib/alerts"
import RichTextEditor from "../../components/richText"
import Questions from "./questions"
import { pageGet, pageSet } from "../../lib/pageCache"
import BackButton from "../../components/backButton"

interface FormEditCache {
    title: string
    description: string
    duration: number | ""
    passingScore: number | ""
    status: string
    tags: string[]
    createdAt: string
}

function FormEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    // Cache data form supaya navigasi "kembali" cukup fade-in tanpa overlay loading.
    // Dibaca sekali lewat state initializer supaya identitasnya stabil; membaca
    // langsung dari pageGet tiap render membuat loadForm (useCallback) selalu
    // baru dan useEffect akan memicu fetch terus-menerus.
    const [cached] = useState<FormEditCache | undefined>(() =>
        user && id ? pageGet<FormEditCache>(`formEdit:${user.id}:${id}`) : undefined
    )

    const [title, setTitle] = useState(cached?.title ?? "")
    const [description, setDescription] = useState(cached?.description ?? "")
    const [duration, setDuration] = useState<number | "">(cached?.duration ?? 0)
    const [passingScore, setPassingScore] = useState<number | "">(cached?.passingScore ?? 70)
    const [status, setStatus] = useState(cached?.status ?? "draft")
    const [createdAt, setCreatedAt] = useState(cached?.createdAt ?? "")
    const [loading, setLoading] = useState(!cached)
    const [saving, setSaving] = useState(false)
    const [tags, setTags] = useState<string[]>(cached?.tags ?? [])
    const [tagInput, setTagInput] = useState("")

    const loadForm = useCallback(async () => {
        if (!user || !id) return
        if (!cached) setLoading(true)
        const { data, error: err } = await supabase
            .from("forms")
            .select("*")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()

        if (err || !data) {
            navigate("/creator")
            return
        }
        setTitle(data.title)
        setDescription(data.description || "")
        setDuration(data.duration || 0)
        setPassingScore(data.passing_score || 0)
        setStatus(String(data.status))
        setCreatedAt(data.created_at || "")

        const { data: rel } = await supabase
            .from("form_tags")
            .select("tag:tags ( name )")
            .eq("form_id", id)
        let newTags: string[] = []
        if (rel) {
            newTags = rel.map((r) => (r.tag as unknown as { name: string } | null)?.name).filter((n): n is string => !!n)
            setTags(newTags)
        }

        pageSet<FormEditCache>(`formEdit:${user.id}:${id}`, {
            title: data.title,
            description: data.description || "",
            duration: data.duration || 0,
            passingScore: data.passing_score || 0,
            status: String(data.status),
            tags: newTags,
            createdAt: data.created_at || "",
        })
        setLoading(false)
    }, [user, id, navigate, cached])

    useEffect(() => {
        if (!user || !id) return
        loadForm()
    }, [user, id, loadForm])

    async function syncTags() {
        if (!id) return
        const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))]

        const { error: delErr } = await supabase.from("form_tags").delete().eq("form_id", id)
        if (delErr) throw new Error("Gagal memperbarui tag: " + delErr.message)

        for (const name of normalized) {
            const { data: existing, error: selErr } = await supabase.from("tags").select("id").eq("name", name).maybeSingle()
            if (selErr && selErr.code !== "PGRST116") throw new Error("Gagal memperbarui tag: " + selErr.message)
            let tagId = existing?.id as string | undefined

            if (!tagId) {
                const { data: ins, error: insErr } = await supabase.from("tags").insert({ name }).select("id").single()
                if (insErr) throw new Error("Gagal membuat tag: " + insErr.message)
                tagId = ins?.id as string | undefined
            }

            if (tagId) {
                const { error: relErr } = await supabase.from("form_tags").insert({ form_id: id, tag_id: tagId })
                if (relErr) throw new Error("Gagal menautkan tag: " + relErr.message)
            }
        }
    }

    const addTag = () => {
        const value = tagInput.trim()
        if (!value) return
        setTags((prev) => (prev.includes(value) ? prev : [...prev, value]))
        setTagInput("")
    }

    const removeTag = async (name: string) => {
        if (!id) return
        try {
            // Tag bersifat master/shared (dipakai lintas form), jadi yang dihapus
            // hanya relasi form_tags, bukan baris di tabel tags.
            const { data: existing } = await supabase.from("tags").select("id").eq("name", name).maybeSingle()
            if (existing?.id) {
                const { error } = await supabase.from("form_tags").delete().eq("form_id", id).eq("tag_id", existing.id)
                if (error) throw error
            }
            // Local state baru di-update SETELAH delete ke DB berhasil.
            setTags((prev) => prev.filter((t) => t !== name))
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal menghapus tag.", "error")
        }
    }

    const saveFormData = async () => {
        if (!id) return
        const payload = {
            p_form_id: id,
            p_title: title,
            p_description: description || null,
            p_duration: duration === "" ? null : duration,
            p_passing_score: passingScore === "" ? 70 : passingScore,
            p_status: status,
        }

        const { error } = await supabase.rpc("update_form", payload)
        if (!error) return

        // Fallback ke UPDATE langsung ketika RPC belum tersedia di database
        // (migrasi belum diterapkan) ATAU versi RPC lama masih belum memakai
        // cast enum (p_status dikirim sebagai text, kolom status bertipe
        // form_status). PostgREST menangani cast enum secara otomatis, jadi
        // UPDATE langsung ini tetap berhasil. Baris yang benar-benar berubah
        // tetap diverifikasi agar RLS yang memfilter diam-diam tidak tampak
        // seperti sukses.
        if (/(does not exist|not found|PGRST202)/i.test(error.message) || /is of type .* but expression is of type/i.test(error.message)) {
            const { data, error: fallbackError } = await supabase
                .from("forms")
                .update({
                    title,
                    description: description || null,
                    duration: duration === "" ? null : duration,
                    passing_score: passingScore === "" ? 70 : passingScore,
                    status,
                })
                .eq("id", id)
                .select("id")
                .maybeSingle()
            if (fallbackError) throw new Error(fallbackError.message)
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan migrasi RPC update_form sudah diterapkan di database.")
            return
        }
        throw new Error(error.message)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id) return
        setSaving(true)

        try {
            await saveFormData()
            await syncTags()
            if (user && id) {
                pageSet<FormEditCache>(`formEdit:${user.id}:${id}`, {
                    title,
                    description,
                    duration,
                    passingScore,
                    status,
                    tags,
                    createdAt,
                })
            }
            alertSaveSuccess()
        } catch (err) {
            alertSaveError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.")
        } finally {
            setSaving(false)
        }
    }

    const inputCls = "input w-full bg-white text-xl lg:text-3xl h-auto p-2 border-second focus:border-done focus:outline-none transition-colors"
    const inputWithVal = "input w-full bg-base text-sm lg:text-xl border-second focus:border-done focus:outline-none transition-colors"

    return (
        <>
            <Loading show={loading} />
            {!loading && (
        <div className="flex flex-col items-center px-3 pt-10 lg:h-[100dvh] lg:overflow-hidden">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl lg:h-full lg:flex lg:flex-col">
                <BackButton to="/creator" />

                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => navigate(`/creator/forms/${id}`)}
                        className="btn btn-sm bg-darks text-base border-none"
                    >
                        <Info className="h-3.5 w-3.5" /> <span className="hidden sm:block">Detail Form</span>
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/questions`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second lg:hidden"
                    >
                        <ListChecks className="h-3.5 w-3.5" /> <span className="hidden sm:block">Soal</span>
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/shared`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:block">Bagikan</span>
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/tokens`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <KeyRound className="h-3.5 w-3.5" /> <span className="hidden sm:block">Token</span>
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/submissions`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <ClipboardList className="h-3.5 w-3.5" /> <span className="hidden sm:block">Responden</span>
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row items-start gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:mt-2">
                    <div className="w-full lg:w-[45%] lg:min-h-0 lg:overflow-y-auto">
                        <form onSubmit={handleSave} className="space-y-3 bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl">
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-tinted mb-3 sm:mb-5 ml-1">
                                Dibuat pada {createdAt ? new Date(createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
                            </span>
                        <input type="text" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div>
                        {/* <label className="block text-sm font-medium text-darks mb-1.5">Deskripsi</label> */}
                        <RichTextEditor
                            compact
                            value={description}
                            onChange={setDescription}
                            placeholder="Deskripsi Form..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Durasi (menit)</label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className={inputWithVal}
                                value={duration}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setDuration(val === "" ? "" : Number(val))
                                }}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Nilai Minimum</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                className={inputWithVal}
                                value={passingScore}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setPassingScore(val === "" ? "" : Number(val))
                                }}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Status</label>
                        <select className="select select-bordered w-full bg-base border-second focus:border-done focus:outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="draft">Draft</option>
                            <option value="published">Public</option>
                        </select>
                        <p className="text-xs text-tinted mt-1.5 hidden sm:block">
                            Hanya form berstatus <span className="font-medium text-darks">Public</span> yang bisa diakses orang lain, termasuk lewat tag.
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-darks mb-1.5">
                            Tag
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input flex-1 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                placeholder="Form akan bisa ditemukan di beranda dengan memasukkan tag ini."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        addTag()
                                    }
                                }}
                            />
                            <button type="button" onClick={addTag} className="btn bg-base text-darks border border-second hover:bg-second">
                                Tambah
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {tags.map((t) => (
                                    <span key={t} className="badge gap-1 py-3 rounded-full bg-done/10 text-done border-none">
                                        @{t}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(t)}
                                            className="hover:text-wrong transition-colors"
                                            aria-label={`Hapus tag ${t}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-tinted mt-2 hidden sm:block">
                            Tag pertama dipakai sebagai link singkat form, contoh: <span className="font-medium text-darks">/form/CODEVERSE</span>.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 mb-3 mt-5"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan Perubahan
                    </button>
                    </form>
                </div>

                <div className="w-full lg:flex-1 min-w-0 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
                    <div className="hidden lg:block pr-1">
                        <Questions embedded />
                    </div>
                </div>
            </div>
            </div>
            </div>
            )}
        </>
    )
}

export default FormEdit
