import Loading from "../../components/loading"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"

function RequireCreator({ children }: { children: ReactNode }) {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [allowed, setAllowed] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }

        supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    navigate("/")
                    return
                }
                const role = String(data.role).toLowerCase()
                if (role === "creator" || role === "admin") setAllowed(true)
                else navigate("/")
            })
    }, [user, authLoading, navigate])

    if (!allowed) {
        return <Loading />
    }

    return <>{children}</>
}

export default RequireCreator
