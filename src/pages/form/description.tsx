import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Clock, FileText } from "lucide-react"
import { RichText } from "../../components/richText"
import { supabase } from "../../lib/supabase"
import { showAlert } from "../../lib/alerts"
import { useAuth } from "../../lib/auth-context"
import { loginUrl } from "../../lib/redirect"
import { startFormSubmission } from "../../lib/formStart"
import TokenInputModal from "../../components/TokenInputModal"
import BackButton from "../../components/backButton"
import FormHeader from "../../components/creator/formHeader"
import { Spinner } from "../../components/loading"

interface FormItem {
    id: string
    title: string
    description: string
    author_name: string
    duration: number
    question_count: number
    status?: string
    header_image?: string | null
    header_color?: string | null
    media_url?: string | null
}

interface LocationState {
    form?: FormItem
}

function FormDescriptionPage() {
    // const id = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const locationState = location.state as LocationState | null
    const params = new URLSearchParams(location.search)
    const formIdParam = params.get("formId")
    const [form, setForm] = useState<FormItem | null>(locationState?.form || null)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [allowMultiple, setAllowMultiple] = useState(false)

    const [headerImage, setHeaderImage] = useState<string | null>(null)
    const [headerColor, setHeaderColor] = useState<string | null>(null)
    const [headerMedia, setHeaderMedia] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showTokenModal, setShowTokenModal] = useState(false)

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

        if (!form) {
            navigate("/")
        }

        if (form?.status && String(form.status).toLowerCase() !== "published") {
            navigate("/")
        }
    }, [form, formIdParam, user, authLoading, navigate, location])

    // Cek apakah user sudah pernah mengerjakan form ini (hanya bila form
    // tidak mengizinkan dikerjakan lebih dari sekali).
    useEffect(() => {
        if (authLoading || !user || !formId) return
        supabase
            .from("submissions")
            .select("id")
            .eq("user_id", user.id)
            .eq("form_id", formId)
            .maybeSingle()
            .then(({ data }) => {
                const hasSubmission = !!data
                setAlreadySubmitted(hasSubmission && !allowMultiple)
                if (hasSubmission && !allowMultiple) {
                    showAlert("Kamu sudah pernah mengerjakan form ini.", "error")
                }
            })
    }, [formId, user, authLoading, allowMultiple])

    // Ambil header image + warna header + pengaturan "boleh dikerjakan ulang".
    // requires_token tidak perlu diambil di sini — biarkan RPC yang memutuskan.
    useEffect(() => {
        if (!formId) return
        let cancelled = false
        supabase
            .from("forms")
            .select("header_image, header_color, media_url, allow_multiple_submissions")
            .eq("id", formId)
            .single()
            .then(({ data }) => {
                if (cancelled) return
                const row = data as { header_image?: string | null; header_color?: string | null; media_url?: string | null; allow_multiple_submissions?: boolean | null } | null
                setHeaderImage(row?.header_image || null)
                setHeaderColor(row?.header_color || null)
                setHeaderMedia(row?.media_url || null)
                setAllowMultiple(!!row?.allow_multiple_submissions)
            })
        return () => { cancelled = true }
    }, [formId])

    /**
     * Mulai pengerjaan — selalu coba RPC tanpa token dulu.
     * Kalau backend bilang "Token wajib diisi" → baru tampilkan modal.
     */
    const beginAttempt = async (tokenCode?: string) => {
        if (!form?.id) return
        setLoading(true)
        try {
            const submissionId = await startFormSubmission(form.id, tokenCode)
            navigate(`/form/${form.id}`, { state: { submissionId } })
        } catch (err) {
            const msg = err instanceof Error ? err.message : ""
            if (msg.includes("Token wajib diisi")) {
                setShowTokenModal(true)
            } else {
                showAlert(msg || "Gagal memulai pengerjaan.", "error")
            }
            setLoading(false)
        }
    }

    const handleStartClick = () => {
        if (alreadySubmitted) {
            navigate("/history")
            return
        }
        beginAttempt()
    }

    return (
        <>
            {!loading && form && (
                <div className="flex flex-col items-center min-h-screen sm:min-h-[80vh] sm:justify-center pt-6 pb-28 sm:px-4 sm:py-10 bg-base-300 sm:bg-transparent">
                    {locationState?.form && (
                        <BackButton to="/" className="ml-3.5 sm:ml-0" />
                    )}

                    <div className="w-full sm:max-w-3xl px-3.5 sm:px-0">
                        <div className="rounded-xl overflow-hidden border border-second shadow-sm">
                            <FormHeader formId={form.id} title={form.title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
                        </div>
                    </div>

                    <div className="w-full sm:max-w-3xl bg-base-300 md:bg-white sm:border sm:border-second p-4 pt-0 sm:p-8 sm:shadow-sm sm:rounded-lg relative mt-3 sm:mt-4">
                        <div className="border-b border-second pb-3 sm:pb-4">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-darks leading-snug sm:leading-tight">
                                {form.title}
                            </h1>
                            <p className="text-xs sm:text-sm text-tinted mt-1">
                                Dibuat oleh: <span className="font-medium text-darks">{form.author_name}</span>
                            </p>
                        </div>

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

                        <div className="mb-6 sm:mb-8">
                            <h3 className="text-xs sm:text-sm font-semibold text-darks mb-2">Deskripsi & Petunjuk:</h3>
                            <div className="p-3 sm:p-4 bg-base border border-second rounded-lg text-xs sm:text-sm text-darks leading-relaxed whitespace-pre-line mb-6 sm:mb-8">
                                {form.description ? <RichText html={form.description} /> : "Tidak ada deskripsi tambahan untuk formulir ini. Silakan mulai mengerjakan jika sudah siap."}
                            </div>
                        </div>

                        <button
                            onClick={handleStartClick}
                            disabled={loading}
                            className="hidden sm:flex w-full py-3.5 bg-darks text-white font-bold rounded-lg hover:opacity-90 transition-opacity items-center justify-center gap-2 text-sm disabled:opacity-60"
                        >
                            {loading ? (
                                <Spinner size={16} />
                            ) : (
                                alreadySubmitted ? "Lihat Riwayat" : "Mulai Mengerjakan"
                            )}
                        </button>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 pointer-events-none sm:hidden">
                        <div className="px-3.5 pb-4 pt-14 bg-gradient-to-t from-base-300 via-base-300/85 to-transparent">
                            <button
                                onClick={() => {
                                    if (alreadySubmitted) {
                                        navigate("/history")
                                        return
                                    }
                                    beginAttempt()
                                }}
                                disabled={loading}
                                className="w-auto p-6 h-16 bg-darks text-lg text-white font-bold rounded-full hover:opacity-90 transition-opvalidacity flex items-center justify-center gap-2 mb-4 mx-auto pointer-events-auto disabled:pointer-events-none"
                            >
                                {loading ? (
                                    <Spinner size={16} />
                                ) : (
                                    alreadySubmitted ? "Lihat Riwayat" : "Mulai Mengerjakan"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TokenInputModal
                open={showTokenModal}
                onClose={() => setShowTokenModal(false)}
                formId={formId ?? ""}
                onStarted={(submissionId) => {
                    setLoading(true)
                    navigate(`/form/${form?.id}`, { state: { submissionId } })
                }}
            />
        </>
    )
}

export default FormDescriptionPage