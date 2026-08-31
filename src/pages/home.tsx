import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { loginUrl } from "../lib/redirect"
import { easeOutExpo } from "../lib/motion"
import homeBanner from "../assets/home-banner.png"
import Search from "../components/search"

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

    const handleTagSearch = async (tagInput?: string) => {
        const query = (tagInput ?? "").trim()
        if (!query) return
        setSearching(true)
        setError("")
        try {
            const { data: tagRow } = await supabase
                .from("tags")
                .select("id")
                .eq("name", query)
                .maybeSingle()

            if (!tagRow) {
                setError(`Formulir dengan tag "${query}" tidak ditemukan.`)
                return
            }

            const { data: rel } = await supabase
                .from("form_tags")
                .select("form_id")
                .eq("tag_id", tagRow.id)

            if (!rel || rel.length === 0) {
                setError(`Formulir dengan tag "${query}" tidak ditemukan.`)
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
                setError(`Tag "${query}" tidak ditemukan.`)
            }
        } finally {
            setSearching(false)
        }
    }

    if (authLoading || !user) return null

    return (
        <div className="relative min-h-full mt-12 flex flex-col items-center justify-center px-4 pt-0 sm:pt-2 pb-10 sm:pb-14 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                {/* Header & Hero Card */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: easeOutExpo }}
                    className="w-full text-center"
                >
                    {/* Static Banner */}
                    <div className="w-full max-w-4xl mx-auto mb-8">
                        <img
                            src={homeBanner}
                            alt="Formaly Banner"
                            className="w-full h-auto rounded-xl object-contain"
                        />
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-darks mb-3 leading-[1.1]">
                        Formaly
                    </h1>
                    <p className="text-sm sm:text-base text-black max-w-md mx-auto mb-8 font-medium">
                        Temukan kuis dan formulir dengan memasukkan tag di bawah ini.
                    </p>

                </motion.section>

                {/* Search Bar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.1 }}
                    className="w-full max-w-xl"
                >
                    <Search onSearch={handleTagSearch} loading={searching} />

                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 rounded-xl bg-wrong/10 border border-wrong/20 text-wrong text-xs sm:text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

export default Home