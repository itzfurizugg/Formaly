import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { Pipette } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import BackButton from "../../components/backButton"
import { alertSaveError, alertSaveSuccess } from "../../lib/alerts"
import RichTextEditor from "../../components/richText"
import { Spinner } from "../../components/loading"
import { fadeSlide } from "../../lib/motion"
import ModeSelector from "../../components/creator/ModeSelector"
import FormHeader from "../../components/creator/formHeader"
import MediaUpload from "../../components/MediaUpload"
import { PRESET_HEADER_COLORS } from "../../lib/colorbase"
import { LAYOUT_QUIZ, type FormLayoutMode } from "../../lib/formPages"

function FormNew() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [duration, setDuration] = useState<number | "">(0)
    const [passingScore, setPassingScore] = useState<number | "">(70)
    const [layoutMode, setLayoutMode] = useState<FormLayoutMode>(LAYOUT_QUIZ)
    const [headerColor, setHeaderColor] = useState("")
    const [headerMedia, setHeaderMedia] = useState<string | null>("")
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)

        const { data, error: err } = await supabase
            .from("forms")
            .insert({
                creator_id: user.id,
                title,
                description: description || null,
                duration: duration === "" ? null : duration,
                passing_score: passingScore === "" ? 70 : passingScore,
                status: "draft",
                layout_mode: layoutMode,
                header_color: headerColor || null,
                media_url: headerMedia?.trim() || null,
            })
            .select("id")
            .single()

        setLoading(false)
        if (err) {
            alertSaveError(err.message)
            return
        }
        alertSaveSuccess("Form berhasil dibuat.")
        navigate(`/creator/forms/${data.id}`)
    }

    const inputCls = "input w-full rounded-xl bg-base-200 dark:bg-base text-lg lg:text-2xl h-auto p-2 pl-4 border-second dark:border-darks/30 focus:border-done focus:outline-none transition-colors scroll-mt-52 sm:scroll-mt-44"
    const titleForm = "input w-full rounded-xl bg-base-200 dark:bg-base text-xl sm:text-3xl h-15 sm:h-20 p-2.5 sm:pl-4 lg:p-6 border-second dark:border-darks/30 focus:border-done focus:outline-none transition-colors scroll-mt-52 sm:scroll-mt-44"

    return (
        <motion.div
            variants={fadeSlide}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-15"
        >
            <div className="w-full max-w-7xl">
                <BackButton to="/creator/forms" showOnDesktop />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="sticky top-16 sm:top-15 lg:top-0 z-30 -mx-3.5 box-border min-h-[108px] bg-base-300 px-3.5 py-3 sm:-mx-6 sm:px-6 sm:py-4 sm:min-h-[96px] lg:min-h-[72px]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold text-darks">Buat Form Baru</h1>
                                <p className="text-sm text-tinted">Lengkapi informasi dasar form.</p>
                            </div>
                            <button type="submit" disabled={loading || uploadingBanner} className="btn bg-darks text-base justify-center h-11 rounded-xl border-none w-full sm:w-auto sm:px-6 hover:opacity-90 transition-opacity disabled:opacity-60">
                                {loading ? <Spinner size={16} /> : "Simpan & Lanjut"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
                        <div className="lg:col-span-7 self-start space-y-4 lg:sticky lg:top-24 bg-white dark:bg-second border border-second p-3 lg:p-4 shadow-sm rounded-xl">
                            <div className="overflow-hidden rounded-lg border border-second">
                                <FormHeader formId="new-form" title={title || "Judul Form"} headerColor={headerColor} headerMedia={headerMedia} />
                            </div>
                            <input
                                type="text"
                                required
                                className={titleForm}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul Form"
                            />
                            <RichTextEditor value={description} onChange={setDescription} placeholder="Deskripsi Form" />
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-darks mb-1.5">Durasi (menit)</label>
                                    <input type="number" min={0} step={1} className={inputCls} value={duration} onFocus={(e) => e.target.select()} onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-darks mb-1.5">Passing Score</label>
                                    <input type="number" min={0} max={100} step={1} className={inputCls} value={passingScore} onFocus={(e) => e.target.select()} onChange={(e) => setPassingScore(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 self-start space-y-4">
                            <div className="bg-white dark:bg-second border border-second p-3 shadow-sm rounded-xl">
                                <h2 className="font-semibold text-darks text-lg mb-1 ml-1">Tampilan Banner</h2>
                                <p className="text-sm text-tinted mb-4 ml-1">Sesuaikan warna tema banner atau gunakan gambar kustom.</p>
                                <div className="px-1 mb-4">
                                    <MediaUpload compact allow={["image"]} value={headerMedia} onChange={setHeaderMedia} onUploadingChange={setUploadingBanner} />
                                </div>
                                <div className="px-1 flex flex-wrap items-center gap-2">
                                    {PRESET_HEADER_COLORS.map((color) => (
                                        <button key={color} type="button" aria-label={`Pilih warna ${color}`} onClick={() => setHeaderColor(color)} style={{ backgroundColor: color }} className={`h-8 w-8 rounded-full transition-all duration-150 hover:scale-110 ${headerColor.toLowerCase() === color.toLowerCase() ? "ring-2 ring-darks ring-offset-2 ring-offset-white dark:ring-offset-second" : ""}`} />
                                    ))}
                                    <label title="Warna kustom" className="relative h-8 w-8 rounded-full overflow-hidden cursor-pointer border border-dashed border-second bg-base items-center justify-center flex">
                                        <input type="color" aria-label="Warna kustom" value={/^#(?:[0-9a-fA-F]{6})$/.test(headerColor) ? headerColor : "#007dcc"} onChange={(e) => setHeaderColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <Pipette className="h-3.5 w-3.5 text-tinted pointer-events-none" />
                                    </label>
                                    <button type="button" onClick={() => setHeaderColor("")} disabled={!headerColor} className="btn btn-sm rounded-full bg-base text-tinted border border-second hover:bg-white disabled:opacity-50 transition-all text-xs py-1 h-8 min-h-0">Reset</button>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-second border border-second p-3 lg:p-4 shadow-sm rounded-xl">
                                <label className="block text-xl font-medium text-darks mb-4">Mode Form</label>
                                <ModeSelector value={layoutMode} onChange={setLayoutMode} />
                                <p className="text-xs text-tinted mt-1.5 ml-1">Mode menentukan cara soal ditampilkan ke responden. Bisa diubah nanti di halaman Detail form.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}

export default FormNew