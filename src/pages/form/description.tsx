import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Clock, FileText, ArrowLeft, AlertCircle } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

interface FormItem {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
    question_count: number
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

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            navigate("/login")
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
                    users:creator_id ( name ),
                    questions ( id )
                `)
                .eq("id", formIdParam)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setForm({
                            id: data.id,
                            title: data.title,
                            description: data.description || "",
                            author_name: data.users?.name || "Creator",
                            duration: data.duration || 0,
                            question_count: data.questions ? data.questions.length : 0,
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
    }, [form, formIdParam, user, authLoading, navigate])

    if (!form) {
        return loading ? (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg" />
            </div>
        ) : null
    }

    const handleStartExam = () => {
        setLoading(true)
        // Navigasi ke halaman pengerjaan soal (FormPage) dengan membawa formId
        navigate("/form", { state: { formId: form.id } })
    }

    return (
        <div className="flex flex-col items-center px-4 py-10 min-h-[80vh] justify-center">
            <div className="w-full max-w-2xl bg-white border border-second p-8 shadow-sm rounded-lg relative">
                
                {/* Tombol Kembali */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
                </button>

                <div className="border-b border-second pb-6 mb-6">
                    <span className="inline-block px-3 py-1 bg-done/10 text-done text-xs font-semibold rounded-full mb-3">
                        Formulir / Ujian Tersedia
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-darks leading-tight">
                        {form.title}
                    </h1>
                    <p className="text-sm text-tinted mt-2">
                        Dibuat oleh: <span className="font-medium text-darks">{form.author_name}</span>
                    </p>
                </div>

                {/* Informasi Detail (Durasi & Jumlah Soal) */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-4 bg-base border border-second rounded-lg">
                        <Clock className="h-6 w-6 text-done" />
                        <div>
                            <p className="text-xs text-tinted">Durasi Pengerjaan</p>
                            <p className="text-sm font-semibold text-darks">{form.duration} Menit</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-base border border-second rounded-lg">
                        <FileText className="h-6 w-6 text-done" />
                        <div>
                            <p className="text-xs text-tinted">Jumlah Soal</p>
                            <p className="text-sm font-semibold text-darks">{form.question_count} Soal</p>
                        </div>
                    </div>
                </div>

                {/* Deskripsi / Petunjuk Pengerjaan */}
                <div className="mb-8">
                    <h3 className="text-sm font-semibold text-darks mb-2">Deskripsi & Petunjuk:</h3>
                    <div className="p-4 bg-base border border-second rounded-lg text-sm text-darks leading-relaxed whitespace-pre-line">
                        {form.description || "Tidak ada deskripsi tambahan untuk formulir ini. Silakan mulai mengerjakan jika sudah siap."}
                    </div>
                </div>

                {/* Peringatan sebelum mulai */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-8 text-amber-800 text-xs md:text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                    <p>
                        Pastikan koneksi internet stabil. Timer akan berjalan otomatis setelah Anda menekan tombol "Mulai Mengerjakan" di bawah ini.
                    </p>
                </div>

                {/* Tombol Mulai */}
                <button
                    onClick={handleStartExam}
                    disabled={loading}
                    className="w-full py-3.5 bg-darks text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
                >
                    {loading ? (
                        <span className="loading loading-spinner loading-sm" />
                    ) : (
                        "Mulai Mengerjakan"
                    )}
                </button>
            </div>
        </div>
    )
}

export default FormDescriptionPage