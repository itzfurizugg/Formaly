import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import Search from "../components/search"
import Loading from "../components/loading"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { loginUrl } from "../lib/redirect"

interface FormData {
    id: string
    title: string
    description: string
    duration: number
    author_name: string
    question_count: number
    status?: string
}

interface FormRecord {
    id: string
    title: string
    description: string
    duration: number
    status?: string
    users: { name: string } | null
    questions: { id: string }[]
}

function Home() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading: authLoading } = useAuth()
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }
    }, [user, authLoading, navigate, location])

    const handleTagSearch = async (tag: string) => {
        setSearching(true)
        setError("")
        try {
            const { data: tagRow } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tag)
                .maybeSingle()

            if (!tagRow) {
                setError(`Formulir dengan tag "${tag}" tidak ditemukan.`)
                return
            }

            const { data: rel } = await supabase
                .from("form_tags")
                .select("form_id")
                .eq("tag_id", tagRow.id)

            if (!rel || rel.length === 0) {
                setError(`Formulir dengan tag "${tag}" tidak ditemukan.`)
                return
            }

            const ids = rel.map((r) => r.form_id as string)
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

            const matches = (data as unknown as FormRecord[]).map((f) => ({
                id: f.id,
                title: f.title,
                description: f.description,
                author_name: f.users?.name || "Creator",
                duration: f.duration || 0,
                question_count: f.questions ? f.questions.length : 0,
                status: f.status,
            }))

            if (matches.length >= 1) {
                navigate("/form/description", { state: { form: matches[0] as FormData } })
            } else {
                setError(`Tag "${tag}" tidak ditemukan.`)
            }
        } finally {
            setSearching(false)
        }
    }

    return (
        <>
            <Loading show={authLoading} />
            {!authLoading && user && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-3.5 py-10 text-left lg:text-center">
                    <div className="w-full max-w-xl">
                        <motion.h1
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full text-4xl md:text-7xl font-display font-bold uppercase text-darks"
                        >
                            Mulai mengerjakan!
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                            className="w-full text-tinted mt-3"
                        >
                            Cari formulir berdasarkan tag yang kamu ketahui, lalu kerjakan.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                            className="mt-8"
                        >
                            <Search onSearch={handleTagSearch} loading={searching} />
                            {error && <p className="text-sm text-wrong mt-3">{error}</p>}
                            {/* {activeTag && !error && (
                        <div className="flex items-center justify-start lg:justify-center gap-2 mt-3">
                            <span className="text-sm text-tinted">Tag:</span>
                            <button
                                onClick={clearTag}
                                className="badge badge-ghost text-tinted rounded-full text-xs cursor-pointer hover:text-wrong"
                                title="Hapus tag"
                            >
                                {activeTag} &times;
                            </button>
                        </div>
                    )} */}
                        </motion.div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Home