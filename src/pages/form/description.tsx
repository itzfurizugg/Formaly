import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Clock, FileText, AlertCircle } from "lucide-react"
import { RichText } from "../../components/richText"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { loginUrl } from "../../lib/redirect"
import BackButton from "../../components/backButton"
import FormHeader from "../../components/creator/formHeader"

interface FormItem {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
    question_count: number
    status?: string
    header_image?: string | null
}

interface LocationState {
    form?: FormItem
}

function FormDescriptionPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const locationState = location.state as LocationState | null
    const params = new URLSearchParams(location.search)
    const formIdParam = params.get("formId")
    const [form, setForm] = useState<FormItem | null>(locationState?.form || null)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)

    // Header diambil lewat query terpisah yang toleran gagal: kalau migrasi
    // kolom header_image belum diterapkan, halaman tetap berfungsi tanpa banner.
    const [headerImage, setHeaderImage] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)

    const formId = form?.id || formIdParam

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            navigate(loginUrl(location.pathname + location.search))
            return
        }

        if (!form && formIdParam) {
            setLoading(true)
            supabase
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
                .eq("id", formIdParam)
                .single()
                .then(({ data }) => {
                    if (data) {
                        if (String(data.status).toLowerCase() !== "published") {
                            navigate("/")
                            return
                        }
                        setForm({
                            id: data.id,
                            title: data.title,
                            description: data.description || "",
                            author_name: (data.users as unknown as { name: string } | null)?.name || "Creator",
                            duration: data.duration || 0,
                            question_count: data.questions ? data.questions.length : 0,
                            status: data.status,
                        })
                    } else {
                        navigate("/")
                    }
                    setLoading(false)
                })
            return
        }

        // Jika user mengakses halaman ini langsung via URL tanpa lewat Home (state kosong)
        if (!form) {
            navigate("/")
        }

        // Form yang masih draft tidak boleh diakses, walau dibawa lewat state Home
        if (form?.status && String(form.status).toLowerCase() !== "published") {
            navigate("/")
        }
    }, [form, formIdParam, user, authLoading, navigate, location])

    // Cek apakah user sudah pernah mengerjakan form ini
    useEffect(() => {
        if (authLoading || !user || !formId) return
        supabase
            .from("submissions")
            .select("id")
            .eq("user_id", user.id)
            .eq("form_id", formId)
            .single()
            .then(({ data }) => {
                setAlreadySubmitted(!!data)
            })
    }, [formId, user, authLoading])

    // Fetch header gambar form (diam-diam; error diabaikan).
    useEffect(() => {
        if (!formId) return
        let cancelled = false
        supabase
            .from("forms")
            .select("header_image")
            .eq("id", formId)
            .single()
            .then(({ data }) => {
                if (cancelled) return
                setHeaderImage((data as { header_image?: string | null } | null)?.header_image || null)
            })
        return () => {
            cancelled = true
        }
    }, [formId])

    const handleStartExam = () => {
        setLoading(true)
        // Navigasi ke halaman pengerjaan soal (FormPage) dengan membawa formId di URL
        navigate(`/form/${form?.id}`)
    }

    return (
        <>
            {!loading && form && (
                <div className="flex flex-col items-center min-h-screen sm:min-h-[80vh] sm:justify-center px-0 pt-6 pb-28 sm:px-4 sm:py-10 bg-base-300 sm:bg-transparent">
                    {/* Tombol Kembali di atas banner (sticky mengikuti scroll; hidden otomatis di lg+). */}
                    {locationState?.form && (
                        <BackButton to="/" className="ml-3.5 sm:ml-0" />
                    )}

                    {/* Banner di luar kartu — lebar sejajar dengan kartu, proporsi 3105x1100. */}
                    <div className="w-full sm:max-w-3xl px-3.5 sm:px-0">
                        <div className="rounded-xl overflow-hidden border border-second shadow-sm">
                            <FormHeader formId={form.id} title={form.title} headerImage={headerImage} />
                        </div>
                    </div>

                    <div className="w-full sm:max-w-3xl bg-base-300 md:bg-white sm:border sm:border-second p-3.5 sm:p-8 sm:shadow-sm sm:rounded-lg relative mt-3 sm:mt-4">
                        <div className="border-b border-second pb-3 sm:pb-4">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-darks leading-snug sm:leading-tight">
                                {form.title}
                            </h1>
                            <p className="text-xs sm:text-sm text-tinted mt-1">
                                Dibuat oleh: <span className="font-medium text-darks">{form.author_name}</span>
                            </p>
                        </div>

                        {/* Informasi Detail (Durasi & Jumlah Soal) */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6 mt-2 sm:mt-6">
                            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-base border border-second rounded-lg">
                                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-darks shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-xs text-tinted">Durasi</p>
                                    <p className="text-xs sm:text-sm font-semibold text-darks truncate">{form.duration ? `${form.duration} Menit` : "Tanpa Waktu"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-base border border-second rounded-lg">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-darks shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-xs text-tinted">Jumlah Soal</p>
                                    <p className="text-xs sm:text-sm font-semibold text-darks truncate">{form.question_count} Soal</p>
                                </div>
                            </div>
                        </div>

                        {/* Deskripsi / Petunjuk Pengerjaan */}
                        <div className="mb-6 sm:mb-8">
                            <h3 className="text-xs sm:text-sm font-semibold text-darks mb-2">Deskripsi & Petunjuk:</h3>
                            <div className="p-3 sm:p-4 bg-base border border-second rounded-lg text-xs sm:text-sm text-darks leading-relaxed whitespace-pre-line mb-4">
                                {form.description ? <RichText html={form.description} /> : "Tidak ada deskripsi tambahan untuk formulir ini. Silakan mulai mengerjakan jika sudah siap."}
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6 sm:mb-8 text-amber-800 text-xs sm:text-sm">
                                {/* <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5 text-amber-600" /> */}
                                <p>
                                    Pastikan koneksi internet stabil. Timer akan berjalan otomatis setelah Anda menekan tombol "Mulai Mengerjakan" di bawah ini.
                                </p>
                            </div>
                        </div>

                        {/* Peringatan sudah pernah mengerjakan */}
                        {alreadySubmitted && (
                            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4 sm:mb-6 text-red-600 text-xs sm:text-sm">
                                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
                                <p>
                                    Kamu sudah pernah mengerjakan form ini.
                                </p>
                            </div>
                        )}

                        {/* Tombol Mulai */}
                        <button
                            onClick={alreadySubmitted ? () => navigate("/history") : handleStartExam}
                            disabled={loading}
                            className="hidden sm:flex w-full py-3.5 bg-darks text-white font-bold rounded-lg hover:opacity-90 transition-opacity items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                alreadySubmitted ? "Lihat Riwayat" : "Mulai Mengerjakan"
                            )}
                        </button>
                    </div>

                    {/* Tombol Mulai sticky di bawah (mobile) */}
                    <div className="fixed bottom-0 left-0 right-0 pointer-events-none sm:hidden">
                        <div className="bg-base-300 px-10 pb-4 pt-3 border-t border-second pointer-events-auto">
                            <button
                                onClick={alreadySubmitted ? () => navigate("/history") : handleStartExam}
                                disabled={loading}
                                className="w-full py-5 bg-darks text-white font-bold rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm mb-4"
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    alreadySubmitted ? "Lihat Riwayat" : "Mulai Mengerjakan"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FormDescriptionPage