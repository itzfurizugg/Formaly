import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
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
        <div className="flex flex-col items-center px-4 py-5">
            <div className="max-w-4xl w-full">
                <div className="bg-white border border-second p-4 rounded-none">
                    <div className="flex flex-row items-center gap-5 mb-6">
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
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="btn bg-wrong/10 text-wrong border-none w-full mt-6 hover:opacity-90 transition-opacity"
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
