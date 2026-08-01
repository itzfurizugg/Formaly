import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Loader2, ClipboardList, KeyRound, Share2, Copy, Check, QrCode } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

interface FormDetail {
    id: string
    title: string
    description: string
    status: string
    duration: number
    passing_score: number
    created_at: string
}

function FormEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [form, setForm] = useState<FormDetail | null>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [duration, setDuration] = useState(0)
    const [passingScore, setPassingScore] = useState(70)
    const [status, setStatus] = useState("draft")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!user || !id) return
        loadForm()
    }, [user, id])

    async function loadForm() {
        if (!user || !id) return
        const { data, error: err } = await supabase
            .from("forms")
            .select("*")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()

        if (err || !data) {
            navigate("/creator/forms")
            return
        }
        setForm(data as FormDetail)
        setTitle(data.title)
        setDescription(data.description || "")
        setDuration(data.duration || 0)
        setPassingScore(data.passing_score || 0)
        setStatus(String(data.status))
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id) return
        setSaving(true)
        setError(null)
        setSaved(false)

        const { error: err } = await supabase
            .from("forms")
            .update({
                title,
                description: description || null,
                duration: duration || null,
                passing_score: passingScore,
                status,
            })
            .eq("id", id)

        setSaving(false)
        if (err) setError(err.message)
        else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    const inputCls = "input w-full bg-base border-second focus:border-done focus:outline-none transition-colors"

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg" />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="w-full max-w-2xl">
                <button
                    onClick={() => navigate("/creator/forms")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <h1 className="text-2xl font-bold text-darks mb-1">{form?.title}</h1>
                <p className="text-sm text-tinted mb-6">Edit detail form, kelola soal, token, dan submission.</p>

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
                </div>

                {status === "published" && (
                    <div className="bg-white border border-second p-6 shadow-sm rounded-2xl mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Share2 className="h-4 w-4 text-done" />
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
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 1500)
                                }}
                                className="btn bg-darks text-base border-none"
                                title="Salin link"
                            >
                                {copied ? <Check className="h-4 w-4 text-done" /> : <Copy className="h-4 w-4" />}
                                Salin
                            </button>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                            <div className="bg-base border border-second rounded-lg p-3 w-fit">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                                        `${window.location.origin}/form/description?formId=${id}`
                                    )}`}
                                    alt="QR Code"
                                    className="w-28 h-28"
                                />
                            </div>
                            <p className="text-xs text-tinted leading-relaxed">
                                <QrCode className="h-3.5 w-3.5 inline mr-1" />
                                Scan QR code untuk membuka form langsung di perangkat lain.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}
                {saved && (
                    <div role="alert" className="text-sm text-done bg-done/5 border border-done/20 rounded-lg px-4 py-3 mb-4">
                        Tersimpan.
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4 bg-white border border-second p-6 shadow-sm rounded-2xl">
                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Judul</label>
                        <input type="text" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Deskripsi</label>
                        <textarea
                            className="textarea w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
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
                                className={inputCls}
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
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
                                className={inputCls}
                                value={passingScore}
                                onChange={(e) => setPassingScore(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Status</label>
                        <select className="select w-full bg-base border-second focus:border-done focus:outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
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
