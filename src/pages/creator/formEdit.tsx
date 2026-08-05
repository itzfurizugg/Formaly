import Loading from "../../components/loading"
import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Loader2, ClipboardList, KeyRound, Copy, QrCode, Tag, X, FileSpreadsheet } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, showAlert } from "../../lib/alerts"
import { exportFormXlsx } from "../../lib/exportForm"

function FormEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [duration, setDuration] = useState<number | "">(0)
    const [passingScore, setPassingScore] = useState<number | "">(70)
    const [status, setStatus] = useState("draft")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")

    const loadForm = useCallback(async () => {
        if (!user || !id) return
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
        setLoading(false)

        const { data: rel } = await supabase
            .from("form_tags")
            .select("tag:tags ( name )")
            .eq("form_id", id)
        if (rel) {
            setTags(rel.map((r) => (r.tag as unknown as { name: string } | null)?.name).filter((n): n is string => !!n))
        }
    }, [user, id, navigate])

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

    const removeTag = (name: string) => {
        setTags((prev) => prev.filter((t) => t !== name))
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

    const handleExport = async () => {
        if (!id) return
        setExporting(true)
        try {
            await exportFormXlsx({ formId: id, formTitle: title || "form" })
            showAlert("Export berhasil diunduh.", "success")
        } catch (err) {
            alertSaveError(err instanceof Error ? err.message : "Gagal mengekspor data.")
        } finally {
            setExporting(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id) return
        setSaving(true)

        try {
            await saveFormData()
            await syncTags()
            alertSaveSuccess()
        } catch (err) {
            alertSaveError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.")
        } finally {
            setSaving(false)
        }
    }

    const inputCls = "input w-full bg-white text-xl lg:text-3xl h-auto p-2 border-second focus:border-done focus:outline-none transition-colors"
    const inputWithVal = "input w-full bg-base text-sm lg:text-xl border-second focus:border-done focus:outline-none transition-colors"

    if (loading) {
        return (
            <Loading />
        )
    }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-5xl">
                <button
                    onClick={() => navigate("/creator")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => navigate(`/creator/forms/${id}`)}
                        className="btn btn-sm bg-darks text-base border-none"
                    >
                        Detail
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/questions`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        Soal
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/tokens`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <KeyRound className="h-3.5 w-3.5" /> Token
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/submissions`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <ClipboardList className="h-3.5 w-3.5" /> Submission
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second disabled:opacity-60"
                    >
                        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        Export XLSX
                    </button>
                </div>

                {status === "published" && (
                    <div className="bg-white border border-second p-4 shadow-sm rounded-none mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-semibold text-darks">Bagikan Form</h2>
                        </div>
                        <p className="text-sm text-tinted mb-4">
                            Form ini sudah public. Bagikan link atau QR code agar orang lain bisa mengerjakannya.
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                className="input flex-1 bg-base border-second focus:border-done focus:outline-none text-sm"
                                value={`${window.location.origin}/form/description?formId=${id}`}
                                onFocus={(e) => e.currentTarget.select()}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/form/description?formId=${id}`)
                                    showAlert("Link disalin.", "success")
                                }}
                                className="btn bg-darks text-base border-none"
                                title="Salin link"
                            >
                                <Copy className="h-4 w-4" />
                                Salin
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col items-center gap-4">
                            <div className="bg-base border border-second rounded-lg p-3 w-fit">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                                        `${window.location.origin}/form/description?formId=${id}`
                                    )}`}
                                    alt="QR Code"
                                    className="w-60 h-auto"
                                />
                            </div>
                            <p className="text-xs text-tinted leading-relaxed">
                                <QrCode className="h-3.5 w-3.5 inline mr-1" />
                                Scan QR code untuk membuka form langsung di perangkat lain.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4 bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-none">
                    <div>
                        <input type="text" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div>
                        <textarea
                            className="textarea w-full bg-base text-xs lg:text-sm border-second focus:border-done focus:outline-none transition-colors"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                            <label className="block text-sm font-medium text-darks mb-1.5">Passing Score</label>
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
                        <p className="text-xs text-tinted mt-1.5">
                            Hanya form berstatus <span className="font-medium text-darks">Public</span> yang bisa diakses orang lain, termasuk lewat tag.
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-darks mb-1.5">
                            <Tag className="h-4 w-4 text-tinted" /> Tag
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
                                        #{t}
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
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan Perubahan
                    </button>
                </form>
            </div>
        </div>
    )
}

export default FormEdit
