import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { UserRound, Mail, LogOut } from "lucide-react"
import { useAuth } from "../lib/auth"

function Profile() {
    const navigate = useNavigate()
    const { user, profile, logout, loading: authLoading } = useAuth()
    const [loggingOut, setLoggingOut] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) navigate("/login")
    }, [user, authLoading, navigate])

    const handleLogout = async () => {
        setLoggingOut(true)
        await logout()
        navigate("/login")
    }

    if (!user) return null

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <UserRound className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Profil</h1>
                </div>
                <p className="text-sm text-tinted mb-8">
                    Informasi akun kamu.
                </p>

                <div className="bg-white rounded-2xl border border-second p-8 shadow-sm">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-done flex items-center justify-center mb-3">
                            <span className="text-xl font-bold text-base">
                                {(profile?.name || "U").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-darks">{profile?.name || "User"}</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Username</label>
                            <div className="relative">
                                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="text"
                                    className="input w-full pl-10 bg-base border-second text-darks cursor-not-allowed"
                                    value={profile?.name || "User"}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="email"
                                    className="input w-full pl-10 bg-base border-second text-tinted cursor-not-allowed"
                                    value={user.email || ""}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="btn bg-wrong text-base border-none w-full mt-6 hover:opacity-90 transition-opacity"
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
        </div>
    )
}

export default Profile
