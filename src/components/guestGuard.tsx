import { useEffect, useState, type ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../lib/auth-context"
import { supabase } from "../lib/supabase"
import { getPendingOtp, hasResetFlow } from "../lib/redirect"

function GuestOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth()

    if (user) return <Navigate to="/" replace />

    return <>{children}</>
}

// Halaman OTP hanya bisa dibuka lewat alur daftar (register mencatat email
// yang menunggu verifikasi di sessionStorage). Akses manual ke /auth
// (ketik URL, tombol back dari login/register, dsb.) dilempar ke /register.
function RequireOtpFlow({ children }: { children: ReactNode }) {
    const { user } = useAuth()

    if (user) return <Navigate to="/" replace />
    if (!getPendingOtp()) return <Navigate to="/register" replace />

    return <>{children}</>
}

// /reset-password hanya boleh diakses lewat alur reset: (1) forgot-password
// sukses, atau (2) event PASSWORD_RECOVERY dari link email reset. Selama
// menunggu sesi recovery diproses supabase, guard menahan render dulu;
// kalau tidak ada sesi dalam lima detik, lempar ke /login.
function RequireResetFlow({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [resolved, setResolved] = useState<"allow" | "deny" | "pending">(() =>
        hasResetFlow() ? "allow" : "pending"
    )

    useEffect(() => {
        if (resolved === "allow") return
        let mounted = true
        const timer = window.setTimeout(() => {
            if (mounted) setResolved("deny")
        }, 5000)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted && session) setResolved("allow")
        })
        return () => {
            mounted = false
            window.clearTimeout(timer)
        }
    }, [resolved])

    if (user) return <Navigate to="/" replace />
    if (resolved === "pending") return null
    if (resolved === "deny") return <Navigate to="/login" replace />

    return <>{children}</>
}

export default GuestOnly
export { RequireOtpFlow, RequireResetFlow }