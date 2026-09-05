import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Save, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, showAlert } from "../../lib/alerts"
import RichTextEditor from "../../components/richText"
import Questions from "./questions"
import { pageGet, pageSet } from "../../lib/pageCache"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import FormHeader from "../../components/creator/formHeader"
import Loading, { Spinner } from "../../components/loading"

interface FormEditCache {
    title: string
    description: string
    duration: number | ""
    passingScore: number | ""
    status: string
    tags: string[]
    createdAt: string
    headerImage: string
    headerColor: string
    headerMedia: string
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
    // header_image/header_color hanya dibaca untuk pratinjau; pengeditannya
    // dipindah ke tab Settings (formSettings.tsx).
    const [headerImage, setHeaderImage] = useState(cached?.headerImage ?? "")
    const [headerColor, setHeaderColor] = useState(cached?.headerColor ?? "")
    const [headerMedia, setHeaderMedia] = useState(cached?.headerMedia ?? "")

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
        setHeaderImage(data.header_image || "")
        setHeaderColor(typeof data.header_color === "string" ? data.header_color : "")
        setHeaderMedia(typeof data.media_url === "string" ? data.media_url : "")

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
            headerImage: data.header_image || "",
            headerColor: typeof data.header_color === "string" ? data.header_color : "",
            headerMedia: typeof data.media_url === "string" ? data.media_url : "",
        })
        setLoading(false)
    }, [user, id, navigate, cached])

    useEffect(() => {
        if (!user || !id) return
        loadForm()
    }, [user, id, loadForm])

    /** Hapus baris tag yang sudah tidak dirujuk form manapun. Pakai RPC
     * SECURITY DEFINER (delete_unused_tags) supaya DELETE ke tabel tags tidak
     * bisa diblokir RLS di sisi client; verifikasi referensi dilakukan di
     * database. Bila RPC belum diterapkan, fallback ke loop per-tag yang
     * best-effort (bila dibatasi RLS, PostgREST sukses tanpa menghapus apa pun). */
    const deleteOrphanTags = async (tagIds: (string | number)[]) => {
        const { error } = await supabase.rpc("delete_unused_tags", { p_tag_ids: tagIds.map(String) })
        if (!error) return
        if (!/PGRST202|could not find the function|schema cache/i.test(error.message)) {
            throw new Error("Gagal membersihkan tag yang tidak terpakai: " + error.message)
        }
        for (const tagId of tagIds) {
            const { count } = await supabase
                .from("form_tags")
                .select("tag_id", { count: "exact", head: true })
                .eq("tag_id", tagId)
            if ((count ?? 0) > 0) continue
            await supabase.from("tags").delete().eq("id", tagId)
        }
    }

    async function syncTags(): Promise<string[]> {
        if (!id) return tags
        const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))]

        // RPC SECURITY DEFINER (set_form_tags) menjalankan semuanya dalam
        // satu transaksi: hapus relasi lama, buat tag baru jika perlu,
        // tautkan, bersihkan tag yatim, dan mengembalikan daftar nama
        // aktual dari database sebagai single source of truth.
        const { data, error } = await supabase.rpc("set_form_tags", {
            p_form_id: id,
            p_tag_names: normalized,
        })
        if (!error) {
            const newTags = (data ?? []) as string[]
            setTags(newTags)
            return newTags
        }
        if (!/PGRST202|could not find the function|schema cache/i.test(error.message)) {
            throw new Error("Gagal memperbarui tag: " + error.message)
        }

        // Fallback lama — hanya dipakai bila RPC belum diterapkan ke DB.
        // Operasi langsung ke tabel mungkin terblokir RLS, jadi tag bisa
        // saja tidak benar-benar berubah di server.
        const { data: oldRel } = await supabase
            .from("form_tags")
            .select("tag_id")
            .eq("form_id", id)

        const tagIds: (string | number)[] = []
        for (const name of normalized) {
            const { data: existing, error: selErr } = await supabase.from("tags").select("id").eq("name", name).maybeSingle()
            if (selErr && selErr.code !== "PGRST116") throw new Error("Gagal memperbarui tag: " + selErr.message)
            let tagId = existing?.id as string | undefined

            if (!tagId) {
                const { data: ins, error: insErr } = await supabase.from("tags").insert({ name }).select("id").single()
                if (insErr) throw new Error("Gagal membuat tag: " + insErr.message)
                tagId = ins?.id as string | undefined
            }

            if (tagId) tagIds.push(tagId)
        }

        await supabase.from("form_tags").delete().eq("form_id", id)

        if (tagIds.length > 0) {
            const { error: relErr } = await supabase
                .from("form_tags")
                .upsert(
                    tagIds.map((tag_id) => ({ form_id: id!, tag_id })),
                    { onConflict: "form_id,tag_id", ignoreDuplicates: true }
                )
            if (relErr) throw new Error("Gagal menautkan tag: " + relErr.message)
        }

        const keptIds = new Set(tagIds.map(String))
        const removedIds = [...new Set((oldRel || []).map((r) => String(r.tag_id)))].filter((tid) => !keptIds.has(tid))
        if (removedIds.length > 0) await deleteOrphanTags(removedIds)
        // Ambil ulang dari DB sebagai source of truth.
        const { data: verifyRel } = await supabase
            .from("form_tags")
            .select("tag:tags ( name )")
            .eq("form_id", id)
        const verifiedTags = (verifyRel ?? [])
            .map((r) => (r.tag as unknown as { name: string } | null)?.name)
            .filter((n): n is string => !!n)
        return verifiedTags
    }

    const addTag = () => {
        const value = tagInput.trim()
        if (!value) return
        setTags((prev) => (prev.includes(value) ? prev : [...prev, value]))
        setTagInput("")
    }

    const removeTag = async (name: string) => {
        if (!id) return
        const nextNames = tags.filter((t) => t !== name).map((t) => t.trim())
        try {
            // Satu panggilan RPC atomik: hapus relasi, bersihkan tag yatim,
            // kembalikan daftar aktual — konsisten dengan syncTags.
            const { data, error } = await supabase.rpc("set_form_tags", {
                p_form_id: id,
                p_tag_names: nextNames,
            })
            if (!error) {
                const newTags = (data ?? []) as string[]
                setTags(newTags)
                if (user && id) {
                    pageSet<FormEditCache>(`formEdit:${user.id}:${id}`, {
                        title,
                        description,
                        duration,
                        passingScore,
                        status,
                        tags: newTags,
                        createdAt,
                        headerImage,
                        headerColor,
                        headerMedia,
                    })
                }
                return
            }
            if (!/PGRST202|could not find the function|schema cache/i.test(error.message)) {
                throw new Error("Gagal menghapus tag: " + error.message)
            }

            // Fallback lama — operasi langsung mungkin terblokir RLS.
            const { data: existing } = await supabase.from("tags").select("id").eq("name", name).maybeSingle()
            if (existing?.id) {
                const { error: delErr } = await supabase.from("form_tags").delete().eq("form_id", id).eq("tag_id", existing.id)
                if (delErr) throw delErr
                await deleteOrphanTags([existing.id])
            }
            // Ambil ulang dari DB sebagai source of truth.
            const { data: verifyRel } = await supabase
                .from("form_tags")
                .select("tag:tags ( name )")
                .eq("form_id", id)
            const verifiedTags = (verifyRel ?? [])
                .map((r) => (r.tag as unknown as { name: string } | null)?.name)
                .filter((n): n is string => !!n)
            setTags(verifiedTags)
if (user && id) {
                    pageSet<FormEditCache>(`formEdit:${user.id}:${id}`, {
                        title,
                        description,
                        duration,
                        passingScore,
                        status,
                        tags: verifiedTags,
                        createdAt,
                        headerImage,
                        headerColor,
                        headerMedia,
                    })
                }
            if (verifiedTags.includes(name)) {
                showAlert("Tag tidak bisa dihapus dari server. Periksa izin database.", "warning")
            }
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal menghapus tag.", "error")
        }
    }

    const saveFormData = async () => {
        if (!id) return
        // header_image tidak disimpan di sini lagi — pengaturannya dipindah
        // ke tab Settings (formSettings.tsx) agar tab Detail tidak menimpa
        // nilai header yang diubah lewat Settings.
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

        // Fallback ke UPDATE langsung ketika RPC belum tersedia / signature-nya
        // tidak cocok, ATAU versi RPC lama masih belum memakai cast enum
        // (p_status dikirim sebagai text, kolom status bertipe form_status).
        // PostgREST menangani cast enum secara otomatis, jadi UPDATE langsung
        // ini tetap berhasil. Baris yang benar-benar berubah tetap diverifikasi
        // agar RLS yang memfilter diam-diam tidak tampak seperti sukses.
        const rpcMismatch =
            error.code === "PGRST202" ||
            /(does not exist|not found|could not find the function|schema cache)/i.test(error.message) ||
            /is of type .* but expression is of type/i.test(error.message)
        if (rpcMismatch) {
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
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan kamu pemilik form ini.")
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
            const newTags = await syncTags()
if (user && id) {
                    pageSet<FormEditCache>(`formEdit:${user.id}:${id}`, {
                        title,
                        description,
                        duration,
                        passingScore,
                        status,
                        tags: newTags,
                        createdAt,
                        headerImage,
                        headerColor,
                        headerMedia,
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
                <div className="flex flex-col items-center px-3.5 sm:px-6 pt-5 sm:py-10 lg:h-[100dvh] lg:overflow-hidden">
                    <div className="w-full xl:max-w-7xl lg:max-w-5xl lg:h-full lg:flex lg:flex-col">
                        <BackButton to="/creator" />

                        <FormTabs id={id} active="detail" />

                        {/* Layout ala YouTube player: tiap panel punya tinggi layar sendiri
                    dan scroll action-nya terpisah dari panel sebelahnya. */}
                        <div className="flex flex-col lg:flex-row items-start gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:mt-2">
                            <div className="relative w-full lg:w-[45%] lg:h-full lg:min-h-0">
                                <div className="scrollbar-none h-full lg:pb-3 lg:overflow-y-auto lg:overscroll-contain">
                                    <form onSubmit={handleSave} className="space-y-3 bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl">
                                        {/* Pratinjau header (read-only) — sama seperti tampilan di daftar form
                                    & halaman responden. Nilainya diatur lewat tab Settings. */}
                                        <div className="overflow-hidden rounded-lg border border-second">
                                            <FormHeader formId={id ?? ""} title={title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
                                        </div>

                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-tinted mb-3 sm:mb-2 ml-1">
                                                Dibuat pada {createdAt ? new Date(createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                            </span>
                                            <input type="text" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                                        </div>

                                        <div>
                                            {/* <label className="block text-sm font-medium text-darks mb-1.5">Deskripsi</label> */}
                                            <RichTextEditor
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
                                            {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                                            Simpan Perubahan
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div className="relative w-full lg:flex-1 min-w-0 lg:h-full lg:min-h-0">
                                <div className="scrollbar-none h-full lg:overflow-y-auto lg:overscroll-contain">
                                    <div className="hidden lg:block pb-3">
                                        <Questions embedded />
                                    </div>
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