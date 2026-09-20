import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
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
    // Tinggi keyboard mobile (px): visualViewport menyusut saat keyboard terbuka.
    // Hanya dihitung saat input search benar-benar fokus — pull-to-refresh juga
    // menyusutkan viewport, harus diabaikan supaya searchbar tidak jatuh ke bawah.
    const [kbHeight, setKbHeight] = useState(0)

    useEffect(() => {
        const vv = window.visualViewport
        const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768
        if (!vv || !isMobile()) return
        let searchFocused = false
        const isSearchInput = (el: Element | null) =>
            el instanceof HTMLInputElement && el.placeholder === "Cari berdasarkan tag"
        const update = () => {
            if (!searchFocused) {
                setKbHeight(0)
                return
            }
            setKbHeight(Math.max(0, window.innerHeight - vv.height))
        }
        const onFocusIn = (e: FocusEvent) => {
            searchFocused = isSearchInput(e.target as Element)
            update()
        }
        const onFocusOut = (e: FocusEvent) => {
            const next = e.relatedTarget
            if (isSearchInput(e.target as Element) && !isSearchInput(next as Element)) {
                searchFocused = false
                update()
            }
        }
        vv.addEventListener("resize", update)
        window.addEventListener("resize", update)
        window.addEventListener("focusin", onFocusIn)
        window.addEventListener("focusout", onFocusOut)
        return () => {
            vv.removeEventListener("resize", update)
            window.removeEventListener("resize", update)
            window.removeEventListener("focusin", onFocusIn)
            window.removeEventListener("focusout", onFocusOut)
        }
    }, [])

    const formItems = [
        {
            title: "Kuesioner Kepuasan",
            author: "Formaly Team",
            question: "Apakah anda menyukai Formaly: a form maker?",
            options: ["Sangat suka", "Tidak suka"]
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
        <div className="fixed inset-0 flex flex-col items-center justify-center px-4 lg:pt-10 overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify">
                {/* Header & Hero Card */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: easeOutExpo }}
                    className="w-full text-center flex flex-col items-center"
                >
                    {/* Interactive Showcase Card */}
                    <div className="relative w-full max-w-4xl mx-auto rounded-xl bg-base-300 p-5 sm:p-4 mb-4 overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">

                        {/* Form Decoy */}
                        <motion.div
                            initial={{ scale: 0.95, rotate: -2 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative z-10 w-full max-w-[280px] sm:w-64 rounded-3xl bg-white dark:bg-second border border-white/80 dark:border-second/60 p-4 sm:p-5 shadow-2xl shadow-darks/15 text-left shrink-0 sm:ml-6 sm:scale-110 lg:scale-115 lg:ml-24"
                        >
                            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-done/10 blur-2xl" />
                            <div className="relative flex items-center justify-between gap-3 mb-5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-done to-done/70 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-done/25">
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
                                            className="text-xs font-bold text-darks truncate leading-tight"
                                        >
                                            {formItems[formIndex].title}
                                        </motion.p>
                                    </AnimatePresence>

                                    <p className="text-[10px] text-tinted mt-1">
                                        {formItems[formIndex].author}
                                    </p>
                                </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-wrong/60" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-done/60" />
                                </div>
                            </div>

                            <div className="relative space-y-4">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={formIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-base font-bold text-darks leading-snug"
                                    >
                                        {formItems[formIndex].question}
                                    </motion.div>
                                </AnimatePresence>

                                <div className="space-y-1.5">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${formIndex}-opt`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="px-3 py-2 rounded-xl bg-done text-white dark:text-second text-xs font-semibold flex items-center justify-between shadow-md shadow-done/30"
                                        >
                                            <span>{formItems[formIndex].options[0]}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-second shrink-0" />
                                        </motion.div>
                                    </AnimatePresence>

                                    <div className="px-3 py-2 rounded-xl border border-second/70 bg-base/70 text-tinted text-xs font-medium">
                                        {formItems[formIndex].options[1]}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Character Illustration */}
                        <div className="relative z-0 hidden sm:flex flex-1 justify-center sm:justify-end items-end">
                            <img src={charGirl} alt="Ilustrasi Karakter" className="sm:h-90 sm:scale-120 lg:scale-130 object-contain sm:mr-20 lg:mr-20" />
                        </div>
                    </div>

                    <div className="text-center w-full">
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-darks mb-2 leading-[1.1]">
                            Mulai Mengerjakan!
                        </h1>

                        <p className="text-sm text-darks px-3 mx-auto mb-8 font-normal">
                            Mulai Mengerjakan formulir dengan memasukkan tag di bawah.
                        </p>
                    </div>
                </motion.section>

                {/* Search Bar Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.5,
                        ease: easeOutExpo,
                        delay: 0.1
                    }}
                    className="w-3.5/4 max-w-xl"
                    style={kbHeight > 0 ? {
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: kbHeight + 8,
                        margin: "0 auto",
                        zIndex: 50,
                    } : undefined}
                >
                    <Search
                        onSearch={handleTagSearch}
                        loading={searching}
                        autoFocus
                    />

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