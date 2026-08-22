import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"
import { pageGet, pageSet } from "../../lib/pageCache"

function RequireCreator({ children, preload }: { children: ReactNode; preload?: () => Promise<unknown> }) {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    // Cache role per user: kembali ke halaman creator tidak perlu menampilkan
    // overlay loading lagi, cukup fade-in halaman.
    const cachedRole = user ? pageGet<string | null>(`role:${user.id}`) : undefined
    const [allowed, setAllowed] = useState(() => {
        if (cachedRole === undefined) return false
        return cachedRole === "creator" || cachedRole === "admin"
    })

    useEffect(() => {
        if (!user) {
            if (!authLoading) navigate("/login")
            return
        }
        // Mulai unduh chunk halaman sekarang juga (paralel dengan pengecekan
        // role), supaya bundle tidak menunggu query role selesai dulu.
        preload?.().catch(() => {})
        if (authLoading || allowed) return

        supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    pageSet<string | null>(`role:${user.id}`, null)
                    navigate("/")
                    return
                }
                const role = String(data.role).toLowerCase()
                pageSet<string | null>(`role:${user.id}`, role)
                if (role === "creator" || role === "admin") setAllowed(true)
                else navigate("/")
            })
    }, [user, authLoading, navigate, allowed, preload])

    return (
        <>
            {allowed && <>{children}</>}
        </>
    )
}

export default RequireCreator
