import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"
import { pageGet, pageSet } from "../../lib/pageCache"

// Cek akses creator/admin: query role SATU KALI lalu hasilnya di-cache ke
// pageCache (yang kini dipersist ke sessionStorage), sehingga refresh tidak
// menampilkan loading "Memeriksa akses..." berulang. Semua halaman creator
// memakai hook ini agar alur akses konsisten — dashboard mengecek role-nya
// sendiri di dalam satu fetch yang sama (lihat dashboard.tsx).
export function useCreatorAccess() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const cachedRole = user ? pageGet<string | null>(`role:${user.id}`) : undefined
    const [allowed, setAllowed] = useState(() => {
        if (cachedRole === undefined) return false
        return cachedRole === "creator" || cachedRole === "admin"
    })

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        // Role sudah ter-cache (memori atau sessionStorage) — langsung putuskan,
        // tidak perlu query ulang maupun loading tambahan.
        if (cachedRole !== undefined) {
            setAllowed(cachedRole === "creator" || cachedRole === "admin")
            return
        }
        // Belum pernah dicek: query sekali, cache, lalu arahkan sesuai hasil.
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
                const ok = role === "creator" || role === "admin"
                setAllowed(ok)
                if (!ok) navigate("/")
            })
    }, [user, authLoading, cachedRole, navigate])

    // allowed menandakan user boleh mengakses area creator. Guard tinggal
    // me-render children begitu bernilai true; selebihnya bernilai false.
    return { allowed }
}