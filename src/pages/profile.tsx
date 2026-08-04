import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Save, UserRound, Mail } from "lucide-react"
import { useAuth } from "../lib/auth-context"

function Profile() {
    const navigate = useNavigate()
    const { user, profile, logout, updateProfile, loading: authLoading } = useAuth()
    const [loggingOut, setLoggingOut] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => () => {
        if (messageTimer.current) clearTimeout(messageTimer.current)
    }, [])

    useEffect(() => {
        if (!authLoading && !user) navigate("/login")
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (profile) {
            setName(profile.name || "")
            setEmail(profile.email || "")
        }
    }, [profile])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setMessage(null)
        if (!name.trim()) {
            setError("Username tidak boleh kosong.")
            return
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Format email tidak valid.")
            return
        }
        setSaving(true)
        try {
            await updateProfile(name.trim(), email.trim())
            setMessage("Profil berhasil diperbarui.")
            if (messageTimer.current) clearTimeout(messageTimer.current)
            messageTimer.current = setTimeout(() => setMessage(null), 5000)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memperbarui profil.")
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        setLoggingOut(true)
        await logout()
        navigate("/login")
    }

    if (!user) return null

    return (
        <div className="flex flex-col items-center px-4 py-5">
            <div className="max-w-4xl w-full">
                <div className="bg-white border border-second p-4 rounded-none mb-3">
                    <div className="flex flex-row items-center gap-5">
                        <div className="w-16 h-16 shrink-0 rounded-full bg-done flex items-center justify-center">
                            <span className="text-3xl font-bold text-base">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-xl font-bold text-darks truncate">{profile?.name || "User"}</h2>
                            <p className="text-sm text-tinted truncate">{profile?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-second p-4 rounded-none mb-5">
                    <h3 className="text-base font-bold text-darks mb-1">Informasi Akun</h3>
                    <p className="text-xs text-tinted mb-4">
                        Perbarui username dan email kamu. Perubahan email akan memerlukan verifikasi ulang.
                    </p>

                    {message && (
                        <div role="alert" className="text-sm text-pass bg-pass/5 border border-pass/20 rounded-lg px-4 py-3 mb-4">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-darks mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full pl-4 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    placeholder="Nama kamu"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-darks mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input w-full pl-4 bg-base border border-second focus:border-done focus:outline-none transition-colors"
                                    placeholder="nama@email.com"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn bg-darks text-base border-none w-full mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {saving ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </form>
                </div>

                    <button className="btn w-full justify-start bg-white border-none hover:bg-done/10 text-darks hover:text-done">Reset Password</button>
                {/* <div className="bg-white border border-second p-4 rounded-none hover:bg-darks">
                </div> */}

                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="btn bg-wrong/10 text-wrong border-none w-full mt-6 lg:hidden hover:opacity-90 transition-opacity"
                >
                    {loggingOut ? (
                        <span className="loading loading-spinner loading-sm" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? "Keluar..." : "Keluar"}
                </button>
            </div>
        </div>
    )
}

export default Profile
