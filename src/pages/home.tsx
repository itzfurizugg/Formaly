import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import Search from "../components/search"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { loginUrl } from "../lib/redirect"
import { easeOutExpo } from "../lib/motion"
import charGirl from "../assets/char-girl.png"

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

    if (authLoading || !user) return null

    return (
        <>
            {!authLoading && user && (
                <div className="flex flex-col items-center px-3.5 sm:px-6 py-10 sm:py-14 lg:py-20">
                    <div className="w-full max-w-3xl flex flex-col items-start lg:items-center text-left lg:text-center">
                        <div className="bg-white w-full p-6 sm:p-10 rounded-xl">
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, ease: easeOutExpo }}
                                className="flex flex-col items-start lg:items-center"
                            >
                                <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold uppercase text-darks leading-[1.05]">
                                    Mulai
                                </h1>
                                <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold uppercase text-darks leading-[1.05]">
                                    Mengerjakan
                                </h1>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: easeOutExpo, delay: 0.15 }}
                            className="w-full max-w-xl mt-8"
                        >
                            <Search onSearch={handleTagSearch} loading={searching} />
                            {error && <p className="text-sm text-wrong mt-3">{error}</p>}
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.25 }}
                        className="flex items-end justify-center mt-8 sm:mt-10 pb-4 sm:pb-10"
                    >
                        <img src={charGirl} className="h-56 sm:h-72 md:h-96 w-auto" />
                    </motion.div>
                </div>
            )}
        </>
    )
}

export default Home