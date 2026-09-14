import { useEffect, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "motion/react"
import { Check, Clock } from "lucide-react"
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

    // Header gambar & warna form diambil diam-diam; error diabaikan agar halaman tetap jalan.
    const [headerImage, setHeaderImage] = useState<string | null>(null)
    const [headerColor, setHeaderColor] = useState<string | null>(null)
    const [headerMedia, setHeaderMedia] = useState<string | null>(null)

    useEffect(() => {
        const fid = info?.form?.id
        if (!fid) return
        let cancelled = false
        supabase
            .from("forms")
            .select("header_image, header_color, media_url")
            .eq("id", fid)
            .single()
            .then(({ data }) => {
                if (cancelled) return
                const row = data as { header_image?: string | null; header_color?: string | null; media_url?: string | null } | null
                setHeaderImage(row?.header_image || null)
                setHeaderColor(row?.header_color || null)
                setHeaderMedia(row?.media_url || null)
            })
        return () => {
            cancelled = true
        }
    }, [info?.form?.id])

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

    // Pengaturan form: kolom yang belum ada di DB (undefined) dianggap tampil
    // supaya perilaku lama tidak berubah sebelum migrasi diterapkan.
    const showScore = info?.form?.show_score_to_respondent !== false
    const failed = showScore && info?.form?.passing_score != null && (info?.total_score ?? 0) < info.form.passing_score
    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-")

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
                            {/* {info?.form && (
                                <div className="rounded-xl overflow-hidden border border-second shadow-sm mb-3 lg:mb-4">
                                    <FormHeader formId={info.form.id} title={info.form.title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
                                </div>
                            )} */}

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

                                {/* {showScore ? (
                                    <div className="bg-base border border-second rounded-xl p-4 mb-6">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-left">
                                                <p className="text-xs text-tinted">Total Skor</p>
                                                <p className={`text-4xl font-bold ${failed ? "text-wrong" : "text-pass"}`}>
                                                    {info?.total_score ?? 0}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={`badge rounded-full text-xs ${failed
                                                            ? "bg-wrong/10 text-wrong border-none"
                                                            : info?.status === "SUBMITTED"
                                                                ? "bg-pass/10 text-pass border-none"
                                                                : "badge-ghost text-tinted"
                                                        }`}
                                                >
                                                    {failed ? "Gagal" : "Lolos"}
                                                </span>
                                                <p className="text-xs text-tinted mt-2 flex items-center gap-1 justify-end">
                                                    <Clock className="h-3 w-3" /> {fmtDate(info?.submitted_at || null)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-tinted mb-6">
                                        Nilai tidak ditampilkan oleh pembuat form.
                                    </p>
                                )} */}

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