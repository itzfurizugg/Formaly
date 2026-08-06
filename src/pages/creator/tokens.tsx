import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus, Trash2, X, Loader2, Copy, Check, Share2, KeyRound, ClipboardList } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete } from "../../lib/alerts"

interface Token {
    id: string
    token_code: string
    max_usage: number
    used_count: number
    expires_at: string | null
    is_active: boolean
    expired: boolean
}

function Tokens() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [tokens, setTokens] = useState<Token[]>([])
    const [error, setError] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [showCreate, setShowCreate] = useState(false)
    const [tokenCode, setTokenCode] = useState("")
    const [maxUsage, setMaxUsage] = useState(1)
    const [expiresAt, setExpiresAt] = useState("")
    const [saving, setSaving] = useState(false)

    const loadAll = useCallback(async () => {
        if (!user || !id) return

        const { data: tks } = await supabase
            .from("tokens")
            .select("id, token_code, max_usage, used_count, expires_at, is_active")
            .eq("form_id", id)
            .order("is_active", { ascending: false })
        if (tks) {
            const now = Date.now()
            setTokens((tks as Omit<Token, "expired">[]).map((t) => ({
                ...t,
                expired: t.expires_at ? new Date(t.expires_at).getTime() < now : false,
            })))
        }

    }, [user, id])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
        let code = ""
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
        setTokenCode(code)
    }

    const handleCreate = async () => {
        if (!id) return
        setSaving(true)
        setError(null)

        const { error: err } = await supabase.from("tokens").insert({
            form_id: id,
            token_code: tokenCode,
            max_usage: maxUsage,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            is_active: true,
        })
        if (err) {
            setError(err.message)
            setSaving(false)
            return
        }

        setSaving(false)
        setTokenCode("")
        setMaxUsage(1)
        setExpiresAt("")
        setShowCreate(false)
        loadAll()
    }

    const handleToggle = async (t: Token) => {
        const { error: err } = await supabase
            .from("tokens")
            .update({ is_active: !t.is_active })
            .eq("id", t.id)
        if (err) setError(err.message)
        loadAll()
    }

    const handleDelete = async (t: Token) => {
        confirmDelete({
            title: "Hapus token ini?",
            description: `Token ${t.token_code} akan terhapus permanen dan tidak dapat digunakan lagi.`,
            onConfirm: async () => {
                const { error: err } = await supabase.from("tokens").delete().eq("id", t.id)
                if (err) throw new Error(err.message)
                await loadAll()
            },
        })
    }

    const handleCopy = (t: Token) => {
        navigator.clipboard.writeText(t.token_code)
        setCopiedId(t.id)
        setTimeout(() => setCopiedId(null), 1500)
    }

    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID") : "Tanpa batas")

    // if (loading) {
    //     return <Loading />
    // }

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <button
                    onClick={() => navigate("/creator")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => navigate(`/creator/forms/${id}`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        Detail
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/shared`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        <Share2 className="h-3.5 w-3.5" /> Shared
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/tokens`)} className="btn btn-sm bg-darks text-base border-none">
                        <KeyRound className="h-3.5 w-3.5" /> Token
                    </button>
                    <button onClick={() => navigate(`/creator/forms/${id}/submissions`)} className="btn btn-sm bg-base text-darks border border-second hover:bg-second">
                        <ClipboardList className="h-3.5 w-3.5" /> Submission
                    </button>
                </div>

                {/* <h1 className="text-2xl lg:text-4xl font-bold text-darks mb-1">Token</h1>
                <p className="text-sm text-tinted mb-6">Form: {formTitle}</p> */}

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="flex justify-end mb-4">
                    {!showCreate && (
                        <button onClick={() => setShowCreate(true)} className="btn bg-darks text-base border-none h-9 min-h-0">
                            <Plus className="h-4 w-4" /> Buat Token
                        </button>
                    )}
                </div>

                {showCreate && (
                    <div className="bg-white border border-second p-6 shadow-sm rounded-2xl mb-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-darks">Buat Token Baru</h2>
                            <button onClick={() => setShowCreate(false)} className="btn btn-sm btn-ghost text-tinted">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Kode Token</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input flex-1 bg-base border-second focus:border-done focus:outline-none uppercase"
                                    value={tokenCode}
                                    onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                                    placeholder="8 karakter"
                                />
                                <button onClick={generateCode} className="btn bg-base text-darks border border-second hover:bg-second">
                                    Acak
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">Maks Penggunaan</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none"
                                    value={maxUsage}
                                    onChange={(e) => setMaxUsage(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-darks mb-1.5">Kadaluarsa (opsional)</label>
                                <input
                                    type="datetime-local"
                                    className="input w-full bg-base border-second focus:border-done focus:outline-none"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={saving || !tokenCode.trim()}
                            className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Simpan Token
                        </button>
                    </div>
                )}

                {tokens.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted mb-4">Belum ada token.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tokens.map((t) => {
                            const expired = t.expired
                            return (
                                <div key={t.id} className="bg-white border border-second p-5 shadow-sm rounded-2xl">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-mono font-bold text-darks tracking-wider">{t.token_code}</span>
                                                <span
                                                    className={`badge rounded-full text-xs ${
                                                        !t.is_active || expired
                                                            ? "badge-ghost text-tinted"
                                                            : "badge bg-done/10 text-done border-none"
                                                    }`}
                                                >
                                                    {!t.is_active ? "Nonaktif" : expired ? "Kadaluarsa" : "Aktif"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-tinted mt-1">
                                                Dipakai {t.used_count} / {t.max_usage} &middot; Kadaluarsa: {fmtDate(t.expires_at)}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleCopy(t)} className="btn btn-sm btn-ghost text-darks" title="Salin kode">
                                                {copiedId === t.id ? <Check className="h-4 w-4 text-done" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => handleToggle(t)} className="btn btn-sm btn-ghost text-tinted">
                                                {t.is_active ? "Nonaktifkan" : "Aktifkan"}
                                            </button>
                                            <button onClick={() => handleDelete(t)} className="btn btn-sm btn-ghost text-wrong">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Tokens
