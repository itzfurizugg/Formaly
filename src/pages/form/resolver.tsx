import { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import Loading from "../../components/loading"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { loginUrl } from "../../lib/redirect"
import FormPage from "./form"

function FormResolver() {
    const { formId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading: authLoading } = useAuth()
    const [mode, setMode] = useState<"loading" | "exam" | "notFound">("loading")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }
        if (!formId) {
            navigate("/")
            return
        }

        let cancelled = false

        ;(async () => {
            const { data: tagRow } = await supabase
                .from("tags")
                .select("id")
                .eq("name", formId)
                .maybeSingle()

            if (!tagRow) {
                if (!cancelled) setMode("exam")
                return
            }

            const { data: rel } = await supabase
                .from("form_tags")
                .select("form_id")
                .eq("tag_id", tagRow.id)

            const ids = rel ? rel.map((r) => r.form_id as string) : []
            if (ids.length > 0) {
                const { data } = await supabase
                    .from("forms")
                    .select(`
                        id,
                        title,
                        description,
                        duration,
                        status,
                        users:creator_id ( name ),
                        questions ( id )
                    `)
                    .in("id", ids)
                    .eq("status", "published")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (data) {
                    if (!cancelled) {
                        navigate("/form/description", {
                            state: {
                                form: {
                                    id: data.id,
                                    title: data.title,
                                    description: data.description || "",
                                    author_name: (data.users as unknown as { name: string } | null)?.name || "Creator",
                                    duration: data.duration || 0,
                                    question_count: data.questions ? data.questions.length : 0,
                                    status: data.status,
                                },
                            },
                        })
                    }
                    return
                }
            }

            if (!cancelled) setMode("notFound")
        })()

        return () => {
            cancelled = true
        }
    }, [formId, user, authLoading, navigate, location.pathname, location.search])

    if (mode === "exam") return <FormPage />
    if (mode === "notFound") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <p className="text-tinted mb-4">Form tidak ditemukan atau belum dipublikasikan.</p>
                <button onClick={() => navigate("/")} className="btn bg-darks text-white border-none">
                    Kembali
                </button>
            </div>
        )
    }
    return <Loading />
}

export default FormResolver
