import Loading from "../../components/loading"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "../../lib/auth-context"
import { supabase } from "../../lib/supabase"

let cachedUserId: string | null = null
let cachedAllowed: boolean | null = null
let pendingCheck: Promise<boolean> | null = null

function fetchRoleIsCreator(userId: string): Promise<boolean> {
    if (pendingCheck) return pendingCheck
    pendingCheck = (async () => {
        try {
            const { data } = await supabase
                .from("users")
                .select("role")
                .eq("id", userId)
                .single()
            const role = data ? String(data.role).toLowerCase() : ""
            return role === "creator" || role === "admin"
        } catch {
            return false
        } finally {
            pendingCheck = null
        }
    })()
    return pendingCheck
}

function isCachedCreator(userId: string): boolean {
    return cachedUserId === userId && cachedAllowed === true
}

function RequireCreator({ children }: { children: ReactNode }) {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [allowed, setAllowed] = useState(() => (user ? isCachedCreator(user.id) : false))

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        if (isCachedCreator(user.id)) {
            setAllowed(true)
            return
        }

        let cancelled = false
        fetchRoleIsCreator(user.id).then((isCreator) => {
            if (cancelled) return
            if (isCreator) {
                cachedUserId = user.id
                cachedAllowed = true
                setAllowed(true)
            } else {
                navigate("/")
            }
        })
        return () => {
            cancelled = true
        }
    }, [user, authLoading, navigate])

    if (!allowed) {
        return <Loading />
    }

    return <>{children}</>
}

export default RequireCreator