import { useNavigate } from "react-router-dom"
import {
    ClipboardList,
    Info,
    KeyRound,
    ListChecks,
    Settings,
    Share2,
} from "lucide-react"

type IconType = typeof Info
export type FormTabKey =
    | "detail"
    | "questions"
    | "shared"
    | "tokens"
    | "submissions"
    | "settings"

const TABS: {
    key: FormTabKey
    path: (id: string) => string
    label: string
    icon: IconType
}[] = [
    { key: "detail", path: (id) => `/creator/forms/${id}`, label: "Detail", icon: Info },
    { key: "questions", path: (id) => `/creator/forms/${id}/questions`, label: "Soal", icon: ListChecks },
    { key: "shared", path: (id) => `/creator/forms/${id}/shared`, label: "Bagikan", icon: Share2 },
    { key: "tokens", path: (id) => `/creator/forms/${id}/tokens`, label: "Token", icon: KeyRound },
    { key: "submissions", path: (id) => `/creator/forms/${id}/submissions`, label: "Responden", icon: ClipboardList },
    { key: "settings", path: (id) => `/creator/forms/${id}/settings`, label: "Pengaturan", icon: Settings },
]

// Baris tab yang dipakai bersama semua halaman sub-form creator.
// Tab "Soal" disembunyikan di desktop karena halaman detail sudah
// menampilkan editor soal berdampingan; kecuali saat tab itu sendiri aktif.
function FormTabs({ id, active }: { id?: string; active: FormTabKey }) {
    const navigate = useNavigate()
    // id dari useParams bisa undefined saat route belum match; jangan render apa pun.
    if (!id) return null

    return (
        <div className="flex flex-wrap gap-2 mb-6 lg:mt-6">
            {TABS.map(({ key, path, label, icon: Icon }) => (
                <button
                    key={key}
                    onClick={() => navigate(path(id))}
                    className={`btn btn-sm rounded-full ${
                        active === key
                            ? "bg-darks text-base border-none"
                            : "bg-base text-darks border border-second hover:bg-white hover:shadow-sm"
                    }${key === "questions" && active !== "questions" ? " lg:hidden" : ""}`}
                >
                    <Icon className="h-3.5 w-3.5" />
                    {/* Mobile: label hanya di tab aktif; sm ke atas semua label tampil */}
                    <span className={`${active === key ? "inline" : "hidden"} sm:inline`}>{label}</span>
                </button>
            ))}
        </div>
    )
}

export default FormTabs
