import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Clock, HelpCircle } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { loginUrl } from "../lib/redirect"
import { easeOutExpo } from "../lib/motion"
import charGirl from "../assets/char-girl.png"
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
    const [formIndex, setFormIndex] = useState(0)

    const formItems = [
        {
            title: "Kuesioner Kepuasan",
            author: "Formaly Team",
            question: "Apakah anda menyukai Formaly: a form maker?",
            options: ["Sangat puas", "Tidak puas"]
        },
        {
            title: "Ujian Matematika",
            author: "Teacher",
            question: "Berapa hasil dari 2 + 2?",
            options: ["4", "67"]
        },
        {
            title: "Survey Lingkungan",
            author: "Tim Penghijauan",
            question: "Apakah anda peduli lingkungan?",
            options: ["Sangat peduli", "Kurang peduli"]
        },
        {
            title: "Absensi Kelas",
            author: "Wali Kelas",
            question: "Hadir atau tidak hari ini?",
            options: ["Hadir", "Tidak hadir"]
        },
        {
            title: "Cerdas Cermat",
            author: "OSIS SMAN 1 Digital",
            question: "Apakah angin memiliki KTP?",
            options: ["Tidak", "Iya"]
        }
    ]

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }
    }, [user, authLoading, navigate, location])

    useEffect(() => {
        const interval = setInterval(() => {
            setFormIndex((prev) => (prev + 1) % formItems.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [formItems.length])

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
                    {/* Interactive Showcase Card */}
                    <div className="relative w-full max-w-4xl mx-auto rounded-xl bg-white p-4 sm:p-6 py-12 mb-8 overflow-hidden flex flex-row items-center justify-between gap-2 sm:gap-0 sm:aspect-[24/9]">

                        {/* Left Side: Mockup Quiz Preview Card */}
                        <motion.div
                            initial={{ scale: 0.95, rotate: -2 }}
                            animate={{ scale: 1, rotate: -2 }}
                            transition={{ duration: 0.3 }}
                            className="relative z-10 w-44 sm:w-48 lg:w-52 rounded-xl bg-base-300 p-2.5 sm:p-3.5 shadow-2xl ml-2 sm:mx-12 lg:mx-12 shadow-darks/10 text-left shrink-0 scale-100 sm:scale-130 origin-center hover:scale-150 transition-transform duration-500"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg bg-done/10 text-done flex items-center justify-center font-bold text-xs">
                                    F
                                </div>
                                <div className="min-w-0">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={formIndex}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-[11px] font-bold text-darks truncate"
                                        >
                                            {formItems[formIndex].title}
                                        </motion.p>
                                    </AnimatePresence>
                                    <p className="text-[9px] text-tinted">{formItems[formIndex].author}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                                {/* <div className="flex items-center justify-between text-[9px] text-tinted font-medium">
                                    <span className="flex items-center gap-1"><HelpCircle className="w-2.5 h-[#6366f1]" /> 10 Soal</span>
                                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-[#6366f1]" /> 15 Min</span>
                                </div> */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={formIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="py-2 rounded-xl bg-second/50 border border-second/80 text-[14px] font-medium text-darks leading-tight"
                                    >
                                        {formItems[formIndex].question}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="space-y-1">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${formIndex}-opt`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="px-2 py-1 rounded-lg bg-done text-white text-[11px] font-medium flex items-center justify-between shadow-sm"
                                        >
                                            <span>{formItems[formIndex].options[0]}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </motion.div>
                                    </AnimatePresence>
                                    <div className="px-2 py-1 rounded-lg bg-second/30 text-darks text-[11px] font-medium">
                                        {formItems[formIndex].options[1]}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Side: Character Illustration */}
                        <div className="relative z-0 flex-1 flex justify-end items-end h-full sm:mt-25 lg:mt-20 pl-4 sm:pl-12 lg:pl-20">
                            <img
                                src={charGirl}
                                alt="Ilustrasi Karakter"
                                className="h-52 sm:h-70 lg:h-80 object-contain transition-transform duration-500 hover:scale-110"
                            />
                        </div>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-darks mb-3 leading-[1.1] uppercase">
                        Mulai Mengerjakan!
                    </h1>
                    <p className="text-sm text-darks px-3 mx-auto mb-8 font-normal">
                        Cari formulir yang ingin anda kerjakan dengan memasukkan tag di bawah.
                    </p>

                </motion.section>

                {/* Search Bar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.1 }}
                    className="w-3.5/4 max-w-xl"
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