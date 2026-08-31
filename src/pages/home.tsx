import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import { Search as SearchIcon, ArrowRight, FileText, Clock, CalendarDays } from "lucide-react"
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
    const [tag, setTag] = useState("")

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }
    }, [user, authLoading, navigate, location])

    const handleTagSearch = async (tagInput?: string) => {
        const query = (tagInput ?? tag).trim()
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
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-8 sm:py-14 lg:py-20">
            {/* ===== HERO ===== */}
            <section className="w-full max-w-5xl bg-white rounded-2xl border border-second shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-8 p-6 sm:p-10 lg:p-14">
                    {/* Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: easeOutExpo }}
                    >
                        <span className="inline-flex items-center gap-2 rounded-full bg-done/10 text-done text-xs font-semibold px-3 py-1 mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-done animate-pulse" />
                            Formulir siap dikerjakan
                        </span>
                        <h1 className="text-[2.6rem] sm:text-6xl md:text-6xl font-display font-bold uppercase text-darks leading-[1.02]">
                            Mulai
                        </h1>
                        <h1 className="text-[2.6rem] sm:text-6xl md:text-6xl font-display font-bold uppercase text-darks leading-[1.02] mt-1">
                            Mengerjakan<span className="text-done">.</span>
                        </h1>
                        <p className="text-sm sm:text-base text-tinted mt-5 leading-relaxed max-w-md">
                            Cari dan kerjakan formulir dari creator favoritmu. Cukup ketik tag form, lalu langsung mulai mengerjakan.
                        </p>
                    </motion.div>

                    {/* Ilustrasi: orang memegang HP menampilkan preview form */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.12 }}
                        className="relative flex items-end justify-center lg:justify-end"
                    >
                        {/* Lingkaran dekoratif */}
                        <div className="absolute -bottom-10 -right-6 w-64 h-64 rounded-full bg-done/10 blur-2xl" />
                        <div className="absolute top-2 right-6 w-24 h-24 rounded-full bg-pass/10 blur-xl" />

                        {/* Handphone dengan preview form */}
                        <div className="relative z-10 hidden sm:block w-56 lg:w-60 rounded-[2rem] border-[6px] border-darks bg-darks shadow-2xl overflow-hidden">
                            {/* Notch / speaker */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-darks/80 z-20" />
                            <div className="bg-base px-4 pt-8 pb-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-7 h-7 rounded-full bg-done flex items-center justify-center text-white text-[10px] font-bold">F</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-darks truncate">Ujian Matematika</p>
                                        <p className="text-[9px] text-tinted">oleh Teacher</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="bg-white border border-second rounded-lg p-2.5">
                                        <p className="text-[9px] font-medium text-tinted mb-1">Soal 1 dari 10</p>
                                        <p className="text-[11px] font-semibold text-darks leading-snug">
                                            Berapa hasil dari 2 + 2 ...?
                                        </p>
                                        <div className="mt-2 space-y-1.5">
                                            {["2", "3", "4", "5"].map((opt, i) => (
                                                <div
                                                    key={opt}
                                                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-medium ${
                                                        i === 2 ? "bg-darks text-white" : "bg-second/70 text-darks"
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                                                            i === 2 ? "border-white" : "border-tinted"
                                                        }`}
                                                    >
                                                        {i === 2 && <span className="w-1.5 h-1.5 rounded-full bg-done" />}
                                                    </span>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-tinted flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" /> 10:00
                                        </span>
                                        <span className="text-[9px] text-tinted flex items-center gap-1">
                                            <FileText className="w-2.5 h-2.5" /> 10 soal
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Karakter samping */}
                        <img
                            src={charGirl}
                            alt="Ilustrasi karakter"
                            className="relative z-10 h-44 sm:h-56 lg:h-64 w-auto -ml-3 sm:-ml-4 mt-10"
                        />
                    </motion.div>
                </div>
            </section>

            {/* ===== SEARCH ===== */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: easeOutExpo, delay: 0.2 }}
                className="w-full max-w-xl mt-8"
            >
                {/* Search bar: "Cari form dengan tag" + tombol aksi biru */}
                <div className="flex items-center w-full rounded-full border border-second bg-white shadow-lg shadow-darks/5 overflow-hidden transition-shadow focus-within:shadow-xl focus-within:border-done/50">
                    <div className="flex-1 relative flex items-center min-w-0">
                        <span className="absolute left-4 text-base font-medium pointer-events-none select-none text-done">
                            <SearchIcon className="h-4 w-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari form dengan tag"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleTagSearch()}
                            className="w-full pl-11 pr-4 py-3.5 border-none outline-none bg-transparent placeholder:text-tinted text-darks"
                        />
                    </div>
                    <button
                        onClick={() => handleTagSearch()}
                        disabled={searching || !tag.trim()}
                        className="shrink-0 m-1.5 h-10 px-5 rounded-full bg-done text-white font-medium flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all duration-150 disabled:opacity-50"
                    >
                        {searching ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            <>
                                Cari
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-tinted">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Contoh tag: <button type="button" onClick={() => handleTagSearch("matematika")} className="text-done font-medium hover:underline">matematika</button> · <button type="button" onClick={() => handleTagSearch("fisika")} className="text-done font-medium hover:underline">fisika</button></span>
                </div>

                {error && <p className="text-sm text-wrong mt-3 text-center">{error}</p>}
            </motion.div>
        </div>
    )
}

export default Home
