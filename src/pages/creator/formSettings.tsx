import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
    ClipboardList,
    Eye,
    EyeOff,
    Info,
    KeyRound,
    ListChecks,
    Loader2,
    Save,
    Settings,
    Share2,
    Shuffle,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import { alertSaveError, alertSaveSuccess, showAlert } from "../../lib/alerts"
import BackButton from "../../components/backButton"
import Loading from "../../components/loading"

interface FormSettingsData {
    show_score_to_respondent: boolean
    show_answers_to_respondent: boolean
    randomize_questions: boolean
}

const DEFAULTS: FormSettingsData = {
    show_score_to_respondent: true,
    show_answers_to_respondent: false,
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
        icon: EyeOff,
        title: "Tampilkan jawaban kepada responden",
        description: "Responden bisa melihat rincian jawabannya beserta koreksi benar/salah di halaman hasil.",
        hint: "Cocok dimatikan untuk ujian agar kunci jawaban tidak tersebar.",
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
    const [settings, setSettings] = useState<FormSettingsData>(DEFAULTS)

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
            randomize_questions: data.randomize_questions ?? DEFAULTS.randomize_questions,
        })
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
        setSaving(true)
        try {
            const { data, error } = await supabase
                .from("forms")
                .update({
                    show_score_to_respondent: settings.show_score_to_respondent,
                    show_answers_to_respondent: settings.show_answers_to_respondent,
                    randomize_questions: settings.randomize_questions,
                })
                .eq("id", id)
                .select("id")
                .maybeSingle()

            // Baris kosong berarti RLS memblokir update diam-diam.
            if (error) throw new Error(error.message)
            if (!data) throw new Error("Perubahan tidak tersimpan. Pastikan kamu pemilik form ini.")
            alertSaveSuccess("Pengaturan berhasil disimpan.")
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan."
            if (/could not find the .* column|does not exist|PGRST204/i.test(msg)) {
                showAlert("Kolom pengaturan belum ada di database. Terapkan migration supabase/migrations/20260822000000_form_settings.sql terlebih dahulu.", "error")
                return
            }
            alertSaveError(msg)
        } finally {
            setSaving(false)
        }
    }

    const tabBtn = "btn btn-sm bg-base text-darks border border-second hover:bg-second"

    return (
        <>
            <Loading show={loading} />
            {!loading && (
                <div className="flex flex-col items-center px-3 py-10">
                    <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                        <BackButton to="/creator" />

                        <div className="flex flex-wrap gap-2 mb-6">
                            <button onClick={() => navigate(`/creator/forms/${id}`)} className={tabBtn}>
                                <Info className="h-3.5 w-3.5" /> <span className="hidden sm:block">Detail Form</span>
                            </button>
                            <button onClick={() => navigate(`/creator/forms/${id}/questions`)} className={`${tabBtn} lg:hidden`}>
                                <ListChecks className="h-3.5 w-3.5" /> <span className="hidden sm:block">Soal</span>
                            </button>
                            <button onClick={() => navigate(`/creator/forms/${id}/shared`)} className={tabBtn}>
                                <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:block">Bagikan</span>
                            </button>
                            <button onClick={() => navigate(`/creator/forms/${id}/tokens`)} className={tabBtn}>
                                <KeyRound className="h-3.5 w-3.5" /> <span className="hidden sm:block">Token</span>
                            </button>
                            <button onClick={() => navigate(`/creator/forms/${id}/submissions`)} className={tabBtn}>
                                <ClipboardList className="h-3.5 w-3.5" /> <span className="hidden sm:block">Responden</span>
                            </button>
                            <button className="btn btn-sm bg-darks text-base border-none">
                                <Settings className="h-3.5 w-3.5" /> <span className="hidden sm:block">Pengaturan</span>
                            </button>
                        </div>

                        <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl max-w-3xl">
                            <div className="flex items-center gap-2 mb-1 mt-2 ml-2">
                                <h2 className="font-semibold text-darks">Pengaturan Form</h2>
                            </div>
                            <p className="text-sm text-tinted mb-4 ml-2">
                                Atur apa yang dilihat responden dan bagaimana form dikerjakan.
                            </p>

                            <div className="divide-y divide-base">
                                {SETTING_ROWS.map((row) => (
                                    <div key={row.key} className="flex items-start justify-between gap-4 py-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="shrink-0 bg-base border border-second rounded-lg p-2 mt-0.5">
                                                <row.icon className="h-4 w-4 text-darks" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-darks">{row.title}</p>
                                                <p className="text-xs text-tinted mt-1 leading-relaxed">{row.description}</p>
                                                {row.hint && <p className="text-xs text-tinted/70 mt-1 italic">{row.hint}</p>}
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            aria-label={row.title}
                                            checked={settings[row.key]}
                                            onChange={() => toggleSetting(row.key)}
                                            className="toggle mt-1 shrink-0 border-second bg-tinted/30 checked:border-done/50 checked:bg-done/50"
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
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FormSettings
