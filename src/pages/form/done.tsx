import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "motion/react"
import { Check } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { easeOutExpo } from "../../lib/motion"

interface DoneInfo {
    id: string
    total_score: number
    status: string
    submitted_at: string | null
    form: {
        id: string
        title: string
        duration: number
        passing_score: number | null
        show_score_to_respondent?: boolean | null
    } | null
}

function DonePage() {
    const { submissionId } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()

    const [info, setInfo] = useState<DoneInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        if (!user || !submissionId) return

        const { data: sub } = await supabase
            .from("submissions")
            .select("id, total_score, status, submitted_at, form:form_id ( id, title, duration, passing_score, show_score_to_respondent )")
            .eq("id", submissionId)
            .eq("user_id", user.id)
            .single()

        if (!sub) {
            setError("Submission tidak ditemukan.")
            setLoading(false)
            return
        }

        setInfo(sub as unknown as DoneInfo)
        setLoading(false)
    }, [user, submissionId])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate("/login")
            return
        }
        if (!submissionId) {
            navigate("/history")
            return
        }
        loadData()
    }, [user, authLoading, submissionId, navigate, loadData])

    return (
        <>
            {!authLoading && !loading && (
                error ? (
                    <div className="flex flex-col items-center px-3.5 py-5 sm:py-10">
                        <div className="w-full max-w-2xl text-center">
                            <p className="text-sm text-tinted">{error}</p>
                            <button onClick={() => navigate("/")} className="btn rounded-full p-4 bg-darks text-white border-none mt-4">
                                Kembali
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-screen px-3.5 py-6">
                        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, ease: easeOutExpo }}
                                className="bg-white border border-second p-6 sm:p-8 shadow-sm rounded-xl text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-done/10 flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8 text-done" strokeWidth={3} />
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-bold text-darks">Jawaban Terkirim!</h1>
                                <p className="text-sm text-tinted mt-2 mb-6">
                                    Jawaban kamu untuk <span className="font-medium text-darks">{info?.form?.title || "form ini"}</span> berhasil dikirim.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={() => navigate(`/form/result/${submissionId}`)}
                                        className="btn w-full sm:w-auto bg-darks text-white border-none rounded-full px-6 hover:opacity-90 transition-opacity"
                                    >
                                        Lihat Hasil
                                    </button>
                                    <button
                                        onClick={() => navigate("/history")}
                                        className="btn w-full sm:w-auto bg-base text-darks border border-second rounded-full px-6 hover:bg-second transition-colors"
                                    >
                                        Lihat Riwayat
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )
            )}
        </>
    )
}

export default DonePage