import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Plus, Trash2, X, Loader2, Copy, Check } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { confirmDelete, showAlert } from "../../lib/alerts"
import { easeOutExpo, panelSlide } from "../../lib/motion"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"

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
    const { user } = useAuth()

    const [tokens, setTokens] = useState<Token[]>([])
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [showCreate, setShowCreate] = useState(false)
    const [tokenCode, setTokenCode] = useState("")
    const [maxUsage, setMaxUsage] = useState(1)
    const [expiresAt, setExpiresAt] = useState("")
    const [saving, setSaving] = useState(false)

    // Saklar gerbang: kalau aktif, peserta wajib memasukkan token sebelum mulai.
    const [requiresToken, setRequiresToken] = useState(false)
    const [togglingRequires, setTogglingRequires] = useState(false)

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

        // Status saklar gerbang token milik form ini.
        supabase
            .from("forms")
            .select("requires_token")
            .eq("id", id)
            .single()
            .then(({ data }) => {
                setRequiresToken(!!(data as { requires_token?: boolean } | null)?.requires_token)
            })

    }, [user, id])

    useEffect(() => {
        if (!user || !id) return
        loadAll()
    }, [user, id, loadAll])

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
        let code = ""
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
        return code
    }

    /** Saklar gerbang token. Saat dinyalakan tanpa token aktif, buatkan otomatis. */
    const handleToggleRequires = async () => {
        if (!id) return
        setTogglingRequires(true)
        try {
            const next = !requiresToken
            const { error: upErr } = await supabase
                .from("forms")
                .update({ requires_token: next })
                .eq("id", id)
            if (upErr) throw new Error(upErr.message)

            setRequiresToken(next)

            if (next && !tokens.some((t) => t.is_active && !t.expired)) {
                const autoCode = generateCode()
                const { error: insErr } = await supabase.from("tokens").insert({
                    form_id: id,
                    token_code: autoCode,
                    max_usage: null,
                    expires_at: null,
                    is_active: true,
                })
                if (insErr) throw new Error(insErr.message)
                showAlert(`Token ${autoCode} dibuat otomatis — bagikan ke peserta.`, "success")
                await loadAll()
            }
        } catch (e) {
            showAlert(e instanceof Error ? e.message : "Gagal mengubah status gerbang token.", "error")
        } finally {
            setTogglingRequires(false)
        }
    }

    const handleCreate = async () => {
        if (!id) return
        setSaving(true)

        const { error: err } = await supabase.from("tokens").insert({
            form_id: id,
            token_code: tokenCode,
            max_usage: maxUsage,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            is_active: true,
        })
        if (err) {
            showAlert(err.message, "error")
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
        if (err) showAlert(err.message, "error")
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
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to="/creator" />

                <FormTabs id={id} active="tokens" />

                <div className="flex justify-between mb-4 px-3">
                    <h1 className="text text-darks text-4xl font-default font-bold">Token</h1>
                    {!showCreate && (
                        <button onClick={() => setShowCreate(true)} className="btn bg-darks text-base border-none rounded-full h-9 min-h-0 my-auto">
                            <Plus className="h-4 w-4" /> <span className="hidden sm:block">Buat Token</span>
                        </button>
                    )}
                </div>

                {/* Saklar gerbang: peserta wajib memasukkan token sebelum mulai */}
                <div className="bg-white border border-second p-4 sm:p-5 shadow-sm rounded-xl mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-darks">Wajibkan token untuk mengerjakan</p>
                        <p className="text-xs text-tinted mt-0.5">
                            Kalau aktif, halaman deskripsi form akan meminta token sebelum tombol "Mulai Mengerjakan" bisa dipakai.
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={requiresToken}
                        onChange={handleToggleRequires}
                        disabled={togglingRequires}
                        className="toggle shrink-0 border-second checked:bg-darks checked:border-darks"
                        aria-label="Wajibkan token untuk mengerjakan"
                    />
                </div>

                <AnimatePresence>
                {showCreate && (
                    <motion.div
                        key="create-token"
                        variants={panelSlide}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="bg-white border border-second p-6 shadow-sm rounded-2xl mb-6 space-y-4"
                    >
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
                                <button onClick={() => setTokenCode(generateCode())} className="btn bg-base text-darks border border-second hover:bg-second">
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
                    </motion.div>
                )}
                </AnimatePresence>

                {tokens.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-tinted mb-4">Belum ada token.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tokens.map((t, index) => {
                            const expired = t.expired
                            return (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
                                >
                                <div className="bg-white border border-second p-5 shadow-sm rounded-2xl transition-colors hover:bg-base-200">
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
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Tokens
