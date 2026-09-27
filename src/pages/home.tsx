import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { loginUrl } from "../lib/redirect"
import { alertPop, fadeSlide } from "../lib/motion"
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
                navigate("/form/description", {
                    state: { form: matches[0] as FormData }
                })
            } else {
                setError(`Tag "${query}" tidak ditemukan.`)
            }
        } finally {
            setSearching(false)
        }
    }

    if (authLoading || !user) return null

    return (
        <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center bg-base-300 px-4 pb-10">
            {/* Kanvas halaman (#1A2028) sengaja hex tetap, bukan token `darks`
                (di dark mode token itu jadi terang) dan bukan `base-300` (di
                dark mode nilainya = `base`, jadi panel kanan akan menyatu dengan
                latar). Dengan begini panel kiri `second` dan panel kanan
                `base-300` keduanya terpisah jelas dari halaman. */}
            <motion.div
                className="w-full max-w-2xl grid grid-cols-1 lg:grid-cols-1 gap-3 lg:gap-4 items-stretch"
                variants={fadeSlide}
                initial="hidden"
                animate="show"
            >
                {/* Kolom kiri: heading. Permukaan `second`. */}
                <div className="text-left bg-darks/10 rounded-2xl px-6 py-10 sm:px-10 sm:py-14 flex flex-col justify-center border border-white/10">
                    <span className="inline-flex items-center gap-2 font-condensed font-stretch-[75%] text-xs font-semibold tracking-[0.3em] uppercase text-white/45 mb-5 lg:justify-start">
                        <span className="font-mono font-stretch-normal text-blue-400">01</span>
                        <span className="h-px w-6 bg-white/20" />
                        Formaly
                    </span>

                    <h1 className="font-condensed uppercase font-stretch-[75%] text-4xl sm:text-6xl font-black tracking-tight text-darks leading-[1.05] mb-1">
                        Mulai
                        <span className="block text-darks/90">Mengerjakan!</span>
                    </h1>

                    <p className="text-sm sm:text-darks text-darks/45 font-normal max-w-sm mx-auto lg:mx-0 leading-relaxed mb-5">
                        Masukkan tag formulir untuk mulai mengerjakan.
                    </p>

                    <Search onSearch={handleTagSearch} loading={searching} autoFocus />

                    {error && (
                        <motion.div
                            variants={alertPop}
                            className="mt-4 p-3 rounded-xl bg-wrong/10 border border-wrong/20 text-wrong text-xs sm:text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </div>

                {/* Kolom kanan: search + error. Permukaan `base-300`. */}
                {/* <div className="w-full bg-base-300 rounded-2xl px-6 py-10 sm:px-10 sm:py-14 flex flex-col justify-center border border-white/10">
                    <Search onSearch={handleTagSearch} loading={searching} autoFocus />

                    {error && (
                        <motion.div
                            variants={alertPop}
                            className="mt-4 p-3 rounded-xl bg-wrong/10 border border-wrong/20 text-wrong text-xs sm:text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </div> */}
            </motion.div>
        </div>
    )
}

export default Home