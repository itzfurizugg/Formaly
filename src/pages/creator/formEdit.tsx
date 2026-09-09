import { useEffect, useState, useCallback, useRef, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "motion/react"
import {
    BookOpenText,
    Eye,
    ListFilter,
    Save,
    Shuffle,
    Trash2,
    Pipette,
    Repeat,
    Upload,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, confirmDelete, showAlert } from "../../lib/alerts"
import { fadeSlide } from "../../lib/motion"
import { PRESET_HEADER_COLORS } from "../../lib/colorbase"
import { isValidImageUrl } from "../../lib/imageUrl"
import { uploadMedia, deleteMedia } from "../../lib/mediaStorage"
import { pageGet, pageSet } from "../../lib/pageCache"
import RichTextEditor from "../../components/richText"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import FormHeader from "../../components/creator/formHeader"
import TagInput from "../../components/creator/TagInput"
import Loading, { Spinner } from "../../components/loading"

interface FormSettingsData {
    show_score_to_respondent: boolean
    show_answers_to_respondent: boolean
    show_correct_filter_to_respondent: boolean
    randomize_questions: boolean
    allow_multiple_submissions: boolean
}

const DEFAULTS: FormSettingsData = {
    show_score_to_respondent: true,
    show_answers_to_respondent: false,
    show_correct_filter_to_respondent: true,
    randomize_questions: false,
    allow_multiple_submissions: false,
}

const SETTING_ROWS: {
    key: keyof FormSettingsData
    icon: typeof Eye
    title: string
    description: string
    hint?: string
}[] = [
        {
            key: "show_score_to_respondent",
            icon: Eye,
            title: "Tampilkan nilai kepada responden",
            description: "Responden bisa melihat total skor setelah mengirim jawaban.",
            hint: "Jika dimatikan, riwayat & hasil hanya menampilkan status pengerjaan tanpa angka nilai.",
        },
        {
            key: "show_answers_to_respondent",
            icon: BookOpenText,
            title: "Tampilkan jawaban kepada responden",
            description: "Responden bisa melihat rincian jawabannya beserta koreksi benar/salah di halaman hasil.",
            hint: "Cocok dimatikan untuk ujian agar kunci jawaban tidak tersebar.",
        },
        {
            key: "show_correct_filter_to_respondent",
            icon: ListFilter,
            title: "Tampilkan filter benar/salah di halaman hasil",
            description: "Responden bisa memfilter rincian jawaban berdasarkan status benar, salah, isian, atau tanpa penilaian.",
            hint: "Hanya berlaku jika rincian jawaban ditampilkan.",
        },
        {
            key: "randomize_questions",
            icon: Shuffle,
            title: "Acak urutan soal",
            description: "Urutan soal dirandom secara acak setiap kali responden mengerjakan.",
            hint: "Hanya mengubah urutan tampil saat pengerjaan, urutan asli di editor tidak berubah.",
        },
        {
            key: "allow_multiple_submissions",
            icon: Repeat,
            title: "Izinkan dikerjakan lebih dari sekali",
            description: "Responden yang sama boleh mengerjakan form ini berkali-kali.",
            hint: "Jika dimatikan, satu akun hanya bisa mengerjakan form satu kali.",
        },
    ]

// Banner header hanya menerima gambar & video (bukan audio).
const HEADER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mkv", ".mov", ".avi", ".gif"]

interface FormEditCache {
    title: string
    description: string
    duration: number | ""
    passingScore: number | ""
    status: string
    createdAt: string
    headerImage: string
    headerColor: string
    headerMedia: string
    settings: FormSettingsData
}

function FormEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    // Cache data form supaya navigasi "kembali" cukup fade-in tanpa overlay loading.
    // Dibaca sekali lewat state initializer supaya identitasnya stabil; membaca
    // langsung dari pageGet tiap render membuat loadForm (useCallback) selalu
    // baru dan useEffect akan memicu fetch terus-menerus.
    const [cached] = useState<FormEditCache | undefined>(() =>
        user && id ? pageGet<FormEditCache>(`formEdit:${user.id}:${id}`) : undefined
    )

    const [title, setTitle] = useState(cached?.title ?? "")
    const [description, setDescription] = useState(cached?.description ?? "")
    const [duration, setDuration] = useState<number | "">(cached?.duration ?? 0)
    const [passingScore, setPassingScore] = useState<number | "">(cached?.passingScore ?? 70)
    const [status, setStatus] = useState(cached?.status ?? "draft")
    const [createdAt, setCreatedAt] = useState(cached?.createdAt ?? "")
    const [loading, setLoading] = useState(!cached)
    const [saving, setSaving] = useState(false)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [bannerProgress, setBannerProgress] = useState(0)
    const [bannerError, setBannerError] = useState<string | null>(null)
    const bannerInputRef = useRef<HTMLInputElement | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [settings, setSettings] = useState<FormSettingsData>(cached?.settings ?? DEFAULTS)
    const [headerColor, setHeaderColor] = useState(cached?.headerColor ?? "")
    const [headerImage, setHeaderImage] = useState(cached?.headerImage ?? "")
    const [headerMedia, setHeaderMedia] = useState<string | null>(cached?.headerMedia ?? "")

    const cacheKey = user && id ? `formEdit:${user.id}:${id}` : null

    const loadForm = useCallback(async () => {
        if (!user || !id) return
        if (!cached) setLoading(true)
        // select("*") — pakai sekali untuk detail form sekaligus pengaturan
        // (banner, toggle) agar struktur halaman tetap terbuka meski migration
        // kolom pengaturan belum diterapkan (kolom fallback ke default).
        const { data, error: err } = await supabase
            .from("forms")
            .select("*")
            .eq("id", id)
            .eq("creator_id", user.id)
            .single()

        if (err || !data) {
            navigate("/creator")
            return
        }
        const nextSettings: FormSettingsData = {
            show_score_to_respondent: data.show_score_to_respondent ?? DEFAULTS.show_score_to_respondent,
            show_answers_to_respondent: data.show_answers_to_respondent ?? DEFAULTS.show_answers_to_respondent,
            show_correct_filter_to_respondent: data.show_correct_filter_to_respondent ?? DEFAULTS.show_correct_filter_to_respondent,
            randomize_questions: data.randomize_questions ?? DEFAULTS.randomize_questions,
            allow_multiple_submissions: data.allow_multiple_submissions ?? DEFAULTS.allow_multiple_submissions,
        }
        const nextHeaderColor = typeof data.header_color === "string" ? data.header_color : ""
        const nextHeaderImage = typeof data.header_image === "string" ? data.header_image : ""
        const nextHeaderMedia = typeof data.media_url === "string" ? data.media_url : ""

        setTitle(data.title)
        setDescription(data.description || "")
        setDuration(data.duration || 0)
        setPassingScore(data.passing_score || 0)
        setStatus(String(data.status))
        setCreatedAt(data.created_at || "")
        setSettings(nextSettings)
        setHeaderColor(nextHeaderColor)
        setHeaderImage(nextHeaderImage)
        setHeaderMedia(nextHeaderMedia)

        if (cacheKey) {
            pageSet<FormEditCache>(cacheKey, {
                title: data.title,
                description: data.description || "",
                duration: data.duration || 0,
                passingScore: data.passing_score || 0,
                status: String(data.status),
                createdAt: data.created_at || "",
                headerImage: nextHeaderImage,
                headerColor: nextHeaderColor,
                headerMedia: nextHeaderMedia,
                settings: nextSettings,
            })
        }
        setLoading(false)
    }, [user, id, navigate, cached, cacheKey])

    useEffect(() => {
        if (!user || !id) return
        loadForm()
    }, [user, id, loadForm])

    // Simpan hanya data detail form (judul, deskripsi, durasi, nilai, status).
    const saveFormData = async () => {
        if (!id) return
        const payload = {
            p_form_id: id,
            p_title: title,
            p_description: description || null,
            p_duration: duration === "" ? null : duration,
            p_passing_score: passingScore === "" ? 70 : passingScore,
            p_status: status,
        }

        const { error } = await supabase.rpc("update_form", payload)
        if (!error) return

        // Fallback ke UPDATE langsung ketika RPC belum tersedia / signature-nya
        // tidak cocok, ATAU versi RPC lama masih belum memakai cast enum
        // (p_status dikirim sebagai text, kolom status bertipe form_status).
        // PostgREST menangani cast enum secara otomatis, jadi UPDATE langsung
        // ini tetap berhasil. Baris yang benar-benar berubah tetap diverifikasi
        // agar RLS yang memfilter diam-diam tidak tampak seperti sukses.
        const rpcMismatch =
            error.code === "PGRST202" ||
            /(does not exist|not found|could not find the function|schema cache)/i.test(error.message) ||
            /is of type .* but expression is of type/i.test(error.message)
        if (rpcMismatch) {
            const { data, error: fallbackError } = await supabase
                .from("forms")
                .update({
                    title,
                    description: description || null,
                    duration: duration === "" ? null : duration,
                    passing_score: passingScore === "" ? 70 : passingScore,
                    status,
                })
                .eq("id", id)
                .select("id")
                .maybeSingle()

            if (fallbackError) throw new Error(fallbackError.message)
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan kamu pemilik form ini.")
            return
        }
        throw new Error(error.message)
    }

    const saveCache = useCallback(() => {
        if (!cacheKey) return
        pageSet<FormEditCache>(cacheKey, {
            title,
            description,
            duration,
            passingScore,
            status,
            createdAt,
            headerImage,
            headerColor,
            headerMedia: headerMedia || "",
            settings,
        })
    }, [cacheKey, title, description, duration, passingScore, status, createdAt, headerImage, headerColor, headerMedia, settings])

    // Sama seperti halaman Soal: kalau kreator pindah tab / keluar sebelum
    // menekan "Simpan Perubahan", draft saat ini (termasuk banner yang baru
    // di-upload) disimpan ke sessionStorage supaya tidak hilang saat kembali.
    useEffect(() => {
        return () => saveCache()
    }, [saveCache])

    // Sinkronkan nilai banner ke cache tab lain (daftar form) supaya pratinjau
    // tidak basi setelah warna/gambar header disimpan.
    const syncBannerCaches = () => {
        if (!user || !id || !cacheKey) return
        const cachedFormEdit = pageGet<Record<string, unknown> | undefined>(cacheKey)
        if (cachedFormEdit) {
            pageSet(cacheKey, {
                ...cachedFormEdit,
                headerImage: headerImage.trim(),
                headerColor: headerColor || "",
                headerMedia: headerMedia || "",
            })
        }
        const cachedFormList = pageGet<{ id: string; header_color?: string | null; header_image?: string | null; media_url?: string | null }[] | undefined>(`formList:${user.id}`)
        if (cachedFormList) {
            pageSet(`formList:${user.id}`, cachedFormList.map((f) => f.id === id ? { ...f, header_color: headerColor || null, header_image: headerImage.trim() || null, media_url: headerMedia || null } : f))
        }
    }

    // Satu tombol simpan untuk SEMUA perubahan: detail form + banner + pengaturan.
    const handleSaveAll = async (e?: FormEvent) => {
        if (e) e.preventDefault()
        if (!id) return
        if (uploadingBanner) {
            showAlert("Tunggu sampai upload media banner selesai.", "warning")
            return
        }
        // Validasi sama seperti aturan ImageUrlInput: link langsung ke file gambar.
        if (headerImage.trim() && !isValidImageUrl(headerImage)) {
            showAlert("URL gambar header harus diawali http:// atau https://.", "error")
            return
        }
        setSaving(true)

        try {
            await saveFormData()

            // Banner + pengaturan (beberapa kolom ini mungkin belum ada di
            // database sebelum migration dijalankan — diketik longgar biar
            // kolom yang tak dikenal tidak error sebelum diterapkan).
            const { data, error } = await supabase
                .from("forms")
                .update({
                    show_score_to_respondent: settings.show_score_to_respondent,
                    show_answers_to_respondent: settings.show_answers_to_respondent,
                    show_correct_filter_to_respondent: settings.show_correct_filter_to_respondent,
                    randomize_questions: settings.randomize_questions,
                    allow_multiple_submissions: settings.allow_multiple_submissions,
                    header_color: headerColor || null,
                    header_image: headerImage.trim() || null,
                    media_url: headerMedia?.trim() || null,
                })
                .eq("id", id)
                .select("id")
                .maybeSingle()

            // Baris kosong berarti RLS memblokir update diam-diam.
            if (error) throw new Error(error.message)
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan kamu pemilik form ini.")

            syncBannerCaches()
            saveCache()
            alertSaveSuccess()
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Gagal menyimpan perubahan."
            if (/could not find the .* column|does not exist|PGRST204/i.test(msg)) {
                showAlert("Kolom pengaturan/warna header belum ada di database. Terapkan migration di supabase/migrations terlebih dahulu.", "error")
                return
            }
            alertSaveError(msg)
        } finally {
            setSaving(false)
        }
    }

    // Upload media banner: hanya gambar & video. Mengganti media lama langsung
    // menghapus file lama dari storage supaya tidak ada file nyangkut.
    const handleBannerFile = async (file: File) => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
        if (!HEADER_EXTENSIONS.includes(ext as never)) {
            setBannerError("Format tidak didukung. Untuk banner gunakan gambar (JPG, PNG, WebP) atau video (MP4, MKV, MOV, AVI).")
            return
        }
        if (file.size > 100 * 1024 * 1024) {
            setBannerError("Ukuran file melebihi batas maksimal 100 MB.")
            return
        }

        setUploadingBanner(true)
        setBannerProgress(0)
        setBannerError(null)
        try {
            const url = await uploadMedia(file, { onProgress: setBannerProgress })
            const previous = headerMedia
            setHeaderMedia(url)
            if (previous && previous !== url) {
                deleteMedia(previous).catch(() => {
                    console.error("Gagal menghapus media banner lama saat replace:", previous)
                })
            }
        } catch (err) {
            setBannerError(err instanceof Error ? err.message : "Upload gagal. Silakan coba lagi.")
        } finally {
            setUploadingBanner(false)
        }
    }

    const handleBannerRemove = async () => {
        if (!headerMedia) return
        const target = headerMedia
        setHeaderMedia(null)
        deleteMedia(target).catch(() => {
            console.error("Gagal menghapus media banner:", target)
        })
    }

    const handleDeleteForm = () => {
        if (!user || !id) return
        confirmDelete({
            title: "Hapus form ini?",
            description: "Form, soal, token, dan semua submission terkait akan ikut terhapus permanen.",
            onConfirm: async () => {
                setDeleting(true)
                try {
                    // RPC delete_form menghapus seluruh data terkait (soal, token,
                    // submission, jawaban, relasi tag) plus tag yatim dalam satu
                    // transaksi SECURITY DEFINER — pola yang sama dengan tombol
                    // Hapus di daftar form.
                    const { error } = await supabase.rpc("delete_form", { p_form_id: id })
                    if (error) throw new Error(error.message)
                    if (cacheKey) pageSet(cacheKey, undefined)
                    navigate("/creator")
                } finally {
                    setDeleting(false)
                }
            },
        })
    }

    const inputCls = "input w-full bg-white text-xl lg:text-3xl h-auto p-2 border-second focus:border-done focus:outline-none transition-colors"
    const inputWithVal = "input w-full bg-base text-sm lg:text-xl border-second focus:border-done focus:outline-none transition-colors"

    return (
        <>
            <Loading show={loading} />
            {!loading && (
                <motion.div
                    variants={fadeSlide}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col items-center px-3.5 sm:px-6 pt-5 pb-28 sm:pb-10 sm:py-10"
                >
                    <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                        <BackButton to="/creator" />

                        {/* Tabs sticky di atas; yang ikut scroll cuma kolom kiri.
                        Border transparan bawah dipakai untuk mencegah margin-bottom FormTabs
                        collapse keluar dari box sticky, sehingga strip 24px di bawah pill ikut
                        dilapisi bg-second dan shadow card tidak bocor saat lewat di bawahnya. */}
                        <div className="lg:sticky lg:top-0 lg:z-30 lg:bg-second lg:pt-1 bg-base-300 w-full">
                            <FormTabs id={id} active="detail" />
                        </div>

                        {/* Kolom kiri: Detail + Pengaturan ditumpuk (desktop). Di mobile
                        wrapper memakai `contents` agar semua kartu jadi grid-item langsung,
                        urutannya diatur lewat order-*: formEdit → header → tag → formSettings → delete. */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ml-1">
                            {/* Kolom kiri: Detail Form + Pengaturan Form ditumpuk */}
                            <div className="contents lg:block lg:col-span-7 lg:space-y-6">
                                {/* 1. Detail Form */}
                                <div className="order-1 lg:order-1 bg-white border border-second p-3 sm:p-4 lg:p-6 shadow-sm rounded-xl flex flex-col justify-between">
                                    <form onSubmit={handleSaveAll} className="space-y-3">
                                        <div className="overflow-hidden rounded-lg border border-second">
                                            <FormHeader formId={id ?? ""} title={title} headerImage={headerImage} headerColor={headerColor} headerMedia={headerMedia} />
                                        </div>

                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs text-tinted mb-3 sm:mb-2 ml-1">
                                                Dibuat pada {createdAt ? new Date(createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                            </span>
                                            <input type="text" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                                        </div>

                                        <div>
                                            <RichTextEditor
                                                value={description}
                                                onChange={setDescription}
                                                placeholder="Deskripsi Form..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-darks mb-1.5">Durasi (menit)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    className={inputWithVal}
                                                    value={duration}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setDuration(val === "" ? "" : Number(val))
                                                    }}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-darks mb-1.5">Nilai Minimum</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    className={inputWithVal}
                                                    value={passingScore}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setPassingScore(val === "" ? "" : Number(val))
                                                    }}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-darks mb-1.5">Status</label>
                                            <select className="select select-bordered w-full bg-base border-second focus:border-done focus:outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
                                                <option value="draft">Draft</option>
                                                <option value="published">Public</option>
                                            </select>
                                            <p className="text-xs text-tinted mt-1.5 hidden sm:block">
                                                Hanya form berstatus <span className="font-medium text-darks">Public</span> yang bisa diakses orang lain, termasuk lewat tag.
                                            </p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={saving || uploadingBanner}
                                            className="btn bg-darks text-base border-none w-full hidden sm:flex hover:opacity-90 transition-opacity disabled:opacity-60 mb-2 mt-5"
                                        >
                                            {saving ? <Spinner size={16} /> : uploadingBanner ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                                            {saving ? "Menyimpan..." : uploadingBanner ? "Mengupload banner..." : "Simpan Perubahan"}
                                        </button>
                                    </form>
                                </div>

                                {/* 3. Pengaturan Form */}
                                <div className="order-4 lg:order-none bg-white border border-second p-3 sm:p-4 lg:p-6 shadow-sm rounded-xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                            <h2 className="font-semibold text-darks text-lg">Pengaturan Form</h2>
                                        </div>
                                        <p className="text-sm text-tinted mb-4 ml-2">
                                            Atur apa yang dilihat responden dan bagaimana form dikerjakan.
                                        </p>

                                        <div className="px-3.5 sm:px-1 divide-y divide-second/60">
                                            {SETTING_ROWS.map((row) => (
                                                <div key={row.key} className="flex items-start justify-between gap-4 py-4 first:pt-2 last:pb-6">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="shrink-0 bg-base rounded-lg p-2 mt-0.5">
                                                            <row.icon className="h-4 w-4 text-darks" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-darks">{row.title}</p>
                                                            <p className="text-xs text-tinted mt-1 leading-relaxed">{row.description}</p>
                                                            {row.hint && <p className="text-xs text-tinted/70 mt-1.5 italic hidden sm:block">{row.hint}</p>}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        aria-label={row.title}
                                                        checked={settings[row.key]}
                                                        onChange={() => setSettings((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                                                        className="toggle mt-1 shrink-0 border-second bg-tinted/30 checked:border-darks/50 checked:bg-darks/50 transition-colors duration-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Kolom kanan sticky: Header (Banner) + Hapus Form. Di mobile `contents`
                            supaya Banner urut ke-2 (setelah Detail) dan Hapus di paling bawah. */}
                            <div className="contents lg:block lg:col-span-5 lg:space-y-6 lg:sticky lg:top-20 lg:self-start mr-1">
                                {/* 2. Header (Tampilan Banner) */}
                                <div className="order-2 lg:order-none bg-white border border-second p-3 shadow-sm rounded-xl">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                            <h2 className="font-semibold text-darks text-lg">Tampilan Banner</h2>
                                        </div>
                                        <p className="text-sm text-tinted mb-4 ml-2">
                                            Sesuaikan warna tema banner atau gunakan gambar kustom.
                                        </p>

                                        <div className="px-3.5 sm:px-1 mb-4">
                                            {uploadingBanner ? (
                                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-second bg-base p-6">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-darks">
                                                        <Spinner size={16} /> Mengupload...
                                                    </div>
                                                    <div className="w-full max-w-xs h-2 overflow-hidden rounded-full bg-second" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bannerProgress * 100)} aria-label="Progres upload banner">
                                                        {bannerProgress > 0 ? (
                                                            <div className="h-full rounded-full bg-done transition-[width] duration-200 ease-out" style={{ width: `${Math.round(bannerProgress * 100)}%` }} />
                                                        ) : (
                                                            <div className="h-full w-1/3 rounded-full bg-done animate-pulse" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-tinted">
                                                        {bannerProgress > 0 ? `${Math.round(bannerProgress * 100)}%` : "Menunggu proses server..."}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-second bg-base p-6 text-center">
                                                    <Upload className="h-6 w-6 text-darks" />
                                                    <p className="text-sm font-medium text-darks">
                                                        {headerMedia ? "Media banner sudah dipilih." : "Unggah media banner"}
                                                    </p>
                                                    <p className="text-xs text-tinted">JPG, PNG, WebP, MP4, MKV, MOV, AVI · Maks 100 MB</p>
                                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => bannerInputRef.current?.click()}
                                                            className="btn btn-sm bg-darks text-base border-none shadow-none hover:opacity-90 transition-opacity"
                                                        >
                                                            <Upload className="h-3.5 w-3.5" />
                                                            {headerMedia ? "Ganti Media" : "Pilih File"}
                                                        </button>
                                                        {headerMedia && (
                                                            <button
                                                                type="button"
                                                                onClick={handleBannerRemove}
                                                                aria-label="Hapus media banner"
                                                                className="btn btn-sm bg-wrong/10 text-wrong border border-wrong/25 hover:bg-wrong/20 transition-colors"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                                                            </button>
                                                        )}
                                                    </div>
                                                    {bannerError && (
                                                        <p className="mt-2 text-xs text-wrong">{bannerError}</p>
                                                    )}
                                                </div>
                                            )}

                                            <input
                                                ref={bannerInputRef}
                                                type="file"
                                                accept={HEADER_EXTENSIONS.join(",")}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleBannerFile(file)
                                                    e.target.value = ""
                                                }}
                                            />
                                        </div>

                                        <div className="px-3.5 sm:px-1 pb-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {PRESET_HEADER_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        aria-label={`Pilih warna ${color}`}
                                                        onClick={() => setHeaderColor(color)}
                                                        style={{ backgroundColor: color }}
                                                        className={`h-8 w-8 rounded-full transition-all duration-150 hover:scale-110 ${headerColor.toLowerCase() === color.toLowerCase()
                                                            ? "ring-2 ring-darks ring-offset-2 ring-offset-white"
                                                            : ""
                                                            }`}
                                                    />
                                                ))}

                                                <label
                                                    title="Warna kustom"
                                                    className={`relative h-8 w-8 rounded-full overflow-hidden cursor-pointer border border-dashed border-second bg-base items-center justify-center hover:bg-second transition-colors ${headerColor && !PRESET_HEADER_COLORS.some((c) => c.toLowerCase() === headerColor.toLowerCase())
                                                        ? "ring-2 ring-darks ring-offset-2 ring-offset-white"
                                                        : ""
                                                        } flex`}
                                                >
                                                    <input
                                                        type="color"
                                                        aria-label="Warna kustom"
                                                        value={/^#(?:[0-9a-fA-F]{6})$/.test(headerColor) ? headerColor : "#007dcc"}
                                                        onChange={(e) => setHeaderColor(e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                    <Pipette className="h-3.5 w-3.5 text-tinted pointer-events-none" />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={() => setHeaderColor("")}
                                                    disabled={!headerColor}
                                                    className="btn btn-sm rounded-full bg-base text-tinted border border-second hover:bg-white disabled:opacity-50 transition-all duration-200 text-xs py-1 h-8 min-h-0"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tag */}
                                <div className="order-3 lg:order-none bg-white shadow-sm border border-second p-5 rounded-xl">
                                    <div className="ml-2">
                                        <TagInput formId={id ?? ""} />
                                    </div>
                                </div>

                                {/* 4. Hapus Form */}
                                <div className="order-5 lg:order-none bg-white border border-second p-3 shadow-sm rounded-xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                            <h2 className="font-semibold text-wrong text-lg">Hapus Form</h2>
                                        </div>
                                        <p className="text-sm text-tinted mb-4 ml-2 leading-relaxed">
                                            Menghapus form ini secara permanen bersama semua soal, token, submission, dan
                                            jawaban responden. Tindakan ini tidak bisa dibatalkan.
                                        </p>
                                    </div>

                                    <div className="flex sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={handleDeleteForm}
                                            disabled={deleting}
                                            className="btn rounded-full bg-wrong/10 text-wrong border border-wrong/20 hover:bg-wrong/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-fit justify-end ml-2 mb-2"
                                        >
                                            {deleting ? <Spinner size={16} /> : <Trash2 className="h-4 w-4" />}
                                            Hapus Form
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tombol simpan mobile: fixed di bawah, pola "Mulai Mengerjakan" */}
                    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none sm:hidden">
                        <div className="px-4 pb-6 pt-30 bg-gradient-to-t from-base-300 from-20% to-transparent">
                            <button
                                type="button"
                                onClick={() => handleSaveAll()}
                                disabled={saving || uploadingBanner}
                                className="w-fit px-5 h-14 bg-darks mx-auto text-lg text-white font-bold rounded-full flex items-center justify-center gap-2 pointer-events-auto shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {saving ? <Spinner size={16} /> : uploadingBanner ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                                {saving ? "Menyimpan..." : uploadingBanner ? "Mengupload banner..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </>
    )
}

export default FormEdit