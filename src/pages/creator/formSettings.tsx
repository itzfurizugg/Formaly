import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
    BookOpenText,
    Eye,
    ListFilter,
    Loader2,
    Pipette,
    Shuffle,
    Trash2,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, confirmDelete, showAlert } from "../../lib/alerts"
import { PRESET_HEADER_COLORS } from "../../lib/colorbase"
import { isValidImageUrl } from "../../lib/imageUrl"
import { pageGet, pageSet } from "../../lib/pageCache"
import ImageUrlInput from "../../components/creator/imageUrlInput"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"
import Loading from "../../components/loading"

interface FormSettingsData {
    show_score_to_respondent: boolean
    show_answers_to_respondent: boolean
    show_correct_filter_to_respondent: boolean
    randomize_questions: boolean
}

const DEFAULTS: FormSettingsData = {
    show_score_to_respondent: true,
    show_answers_to_respondent: false,
    show_correct_filter_to_respondent: true,
    randomize_questions: false,
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
]

function FormSettings() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [settings, setSettings] = useState<FormSettingsData>(DEFAULTS)
    const [headerColor, setHeaderColor] = useState("")
    // Header gambar dipindah dari tab Detail (formEdit.tsx) ke sini.
    const [headerImage, setHeaderImage] = useState("")

    const loadSettings = useCallback(async () => {
        if (!user || !id) return
        setLoading(true)
        // Pakai select("*") supaya halaman tetap terbuka meski migration kolom
        // pengaturan belum diterapkan di database (kolom fallback ke default).
        const { data } = await supabase
            .from("forms")
            .select("*")
            .eq("id", id)
            .eq("creator_id", user.id)
            .maybeSingle()

        if (!data) {
            navigate("/creator")
            return
        }
        setSettings({
            show_score_to_respondent: data.show_score_to_respondent ?? DEFAULTS.show_score_to_respondent,
            show_answers_to_respondent: data.show_answers_to_respondent ?? DEFAULTS.show_answers_to_respondent,
            show_correct_filter_to_respondent: data.show_correct_filter_to_respondent ?? DEFAULTS.show_correct_filter_to_respondent,
            randomize_questions: data.randomize_questions ?? DEFAULTS.randomize_questions,
        })
        setHeaderColor(typeof data.header_color === "string" ? data.header_color : "")
        setHeaderImage(typeof data.header_image === "string" ? data.header_image : "")
        setLoading(false)
    }, [user, id, navigate])

    useEffect(() => {
        if (!user || !id) return
        loadSettings()
    }, [user, id, loadSettings])

    const toggleSetting = (key: keyof FormSettingsData) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const handleSave = async () => {
        if (!id) return
        // Validasi sama seperti aturan ImageUrlInput: link langsung ke file gambar.
        if (headerImage.trim() && !isValidImageUrl(headerImage)) {
            showAlert("URL gambar header harus diawali http:// atau https://.", "error")
            return
        }
        setSaving(true)
        try {
            const { data, error } = await supabase
                .from("forms")
                .update({
                    show_score_to_respondent: settings.show_score_to_respondent,
                    show_answers_to_respondent: settings.show_answers_to_respondent,
                    show_correct_filter_to_respondent: settings.show_correct_filter_to_respondent,
                    randomize_questions: settings.randomize_questions,
                    header_color: headerColor || null,
                    header_image: headerImage.trim() || null,
                })
                .eq("id", id)
                .select("id")
                .maybeSingle()

            // Baris kosong berarti RLS memblokir update diam-diam.
            if (error) throw new Error(error.message)
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan kamu pemilik form ini.")

            // Sinkronkan cache tab Detail supaya pratinjau header di formEdit
            // langsung segar saat user pindah tab tanpa menunggu refetch.
            if (user) {
                const cachedFormEdit = pageGet<Record<string, unknown> | undefined>(`formEdit:${user.id}:${id}`)
                if (cachedFormEdit) {
                    pageSet(`formEdit:${user.id}:${id}`, {
                        ...cachedFormEdit,
                        headerImage: headerImage.trim(),
                        headerColor,
                    })
                }
            }
            alertSaveSuccess("Pengaturan berhasil disimpan.")
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan."
            if (/could not find the .* column|does not exist|PGRST204/i.test(msg)) {
                showAlert("Kolom pengaturan/warna header belum ada di database. Terapkan migration di supabase/migrations terlebih dahulu.", "error")
                return
            }
            alertSaveError(msg)
        } finally {
            setSaving(false)
        }
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
                    // Buang cache tab Detail agar tidak menampilkan form yang sudah dihapus.
                    pageSet(`formEdit:${user.id}:${id}`, undefined)
                    navigate("/creator")
                } finally {
                    setDeleting(false)
                }
            },
        })
    }

    return (
        <>
            <Loading show={loading} />
            {!loading && (
                <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
                    <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                        <BackButton to="/creator" />

                        <FormTabs id={id} active="settings" />

                        <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl max-w-8xl mb-3">
                            {/* <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                <h2 className="font-semibold text-darks">Warna Header</h2>
                            </div>
                            <p className="text-sm text-tinted mb-4 ml-2">
                                Warna dipakai sebagai latar header form bila gambar header (tab Detail) tidak diatur.
                            </p> */}

                            {/* Pratinjau langsung */}
                            <div className="px-3.5 sm:px-1 mb-4">
                                <div
                                    className={`relative h-20 rounded-xl overflow-hidden flex items-center px-4 ${
                                        headerColor ? "" : "bg-gradient-to-br from-slate-600 to-slate-800"
                                    }`}
                                    style={headerColor ? { backgroundColor: headerColor } : undefined}
                                >
                                    <div
                                        className="absolute inset-0 opacity-[0.08]"
                                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }}
                                    />
                                    <span className="relative z-10 text-lg font-semibold text-white drop-shadow-sm">Pratinjau Banner</span>
                                    <span className="relative z-10 ml-auto text-xs font-mono text-white/80">{headerColor || "gradien acak"}</span>
                                </div>
                            </div>

                            {/* Swatch warna preset + kustom */}
                            <div className="px-3.5 sm:px-1 pb-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {PRESET_HEADER_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            aria-label={`Pilih warna ${color}`}
                                            onClick={() => setHeaderColor(color)}
                                            style={{ backgroundColor: color }}
                                            className={`h-9 w-9 rounded-full transition-transform hover:scale-110 ${
                                                headerColor.toLowerCase() === color.toLowerCase()
                                                    ? "ring-2 ring-darks ring-offset-2 ring-offset-white"
                                                    : ""
                                            }`}
                                        />
                                    ))}

                                    {/* Warna kustom via native color picker */}
                                    <label
                                        title="Warna kustom"
                                        className={`relative h-9 w-9 rounded-full overflow-hidden cursor-pointer border border-dashed border-second bg-base items-center justify-center hover:bg-second transition-colors ${
                                            headerColor && !PRESET_HEADER_COLORS.some((c) => c.toLowerCase() === headerColor.toLowerCase())
                                                ? "ring-2 ring-darks ring-offset-2 ring-offset-white"
                                                : ""
                                        } hidden sm:flex`}
                                    >
                                        <input
                                            type="color"
                                            aria-label="Warna kustom"
                                            value={/^#(?:[0-9a-fA-F]{6})$/.test(headerColor) ? headerColor : "#007dcc"}
                                            onChange={(e) => setHeaderColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Pipette className="h-4 w-4 text-tinted pointer-events-none" />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setHeaderColor("")}
                                        disabled={!headerColor}
                                        className="btn btn-sm rounded-full bg-base text-tinted border border-second hover:bg-white disabled:opacity-50"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Header gambar (dipindah dari tab Detail). Bila diisi,
                                gambar ini menang atas warna di atas. */}
                            <div className="px-3.5 sm:px-1 pb-1 mt-5">
                                <ImageUrlInput
                                    label="URL Gambar Header"
                                    placeholder="https://... (tampil di halaman deskripsi form)"
                                    value={headerImage}
                                    onChange={setHeaderImage}
                                />
                            </div>
                        </div>

                        <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl max-w-8xl">
                            <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                <h2 className="font-semibold text-darks">Pengaturan Form</h2>
                            </div>
                            <p className="text-sm text-tinted mb-4 ml-2">
                                Atur apa yang dilihat responden dan bagaimana form dikerjakan.
                            </p>

                            <div className="px-3.5 sm:px-1">
                                {SETTING_ROWS.map((row) => (
                                    <div key={row.key} className="flex items-start justify-between gap-4 py-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="shrink-0 bg-base rounded-lg p-2 mt-0.5">
                                                <row.icon className="h-4 w-4 text-darks" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-darks">{row.title}</p>
                                                <p className="text-xs text-tinted mt-1 leading-relaxed">{row.description}</p>
                                                {row.hint && <p className="text-xs text-tinted/70 mt-1 italic hidden sm:block">{row.hint}</p>}
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            aria-label={row.title}
                                            checked={settings[row.key]}
                                            onChange={() => toggleSetting(row.key)}
                                            className="toggle mt-1 shrink-0 border-second bg-tinted/30 checked:border-darks/50 checked:bg-darks/50"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60 mb-3 mt-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <p>Simpan Pengaturan</p>}
                                {/* Simpan Pengaturan */}
                            </button>
                        </div>

                        {/* Zona destruktif: hapus form permanen beserta seluruh datanya. */}
                        <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl max-w-8xl mt-3">
                            <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                <h2 className="font-semibold text-wrong">Hapus Form</h2>
                            </div>
                            <p className="text-sm text-tinted mb-4 ml-2 leading-relaxed">
                                Menghapus form ini secara permanen bersama semua soal, token, submission, dan
                                jawaban responden. Tindakan ini tidak bisa dibatalkan.
                            </p>

                            <button
                                type="button"
                                onClick={handleDeleteForm}
                                disabled={deleting}
                                className="btn bg-wrong/10 text-wrong border border-wrong/20 hover:bg-wrong/20 transition-colors w-full mb-3"
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Hapus Form
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FormSettings
