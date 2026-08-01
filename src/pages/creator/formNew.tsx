import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

function FormNew() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [duration, setDuration] = useState(0)
    const [passingScore, setPassingScore] = useState(70)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)
        setError(null)

        const { data, error: err } = await supabase
            .from("forms")
            .insert({
                creator_id: user.id,
                title,
                description: description || null,
                duration: duration || null,
                passing_score: passingScore,
                status: "draft",
            })
            .select("id")
            .single()

        setLoading(false)
        if (err) {
            setError(err.message)
            return
        }
        navigate(`/creator/forms/${data.id}`)
    }

    const inputCls = "input w-full bg-base border-second focus:border-done focus:outline-none transition-colors"

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="w-full max-w-xl">
                <button
                    onClick={() => navigate("/creator/forms")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <h1 className="text-2xl font-bold text-darks mb-1">Buat Form Baru</h1>
                <p className="text-sm text-tinted mb-6">Lengkapi informasi dasar form.</p>

                {error && (
                    <div role="alert" className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-lg px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-second p-6 shadow-sm rounded-2xl">
                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Judul</label>
                        <input
                            type="text"
                            required
                            className={inputCls}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Ujian Matematika"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-darks mb-1.5">Deskripsi</label>
                        <textarea
                            className="textarea w-full bg-base border-second focus:border-done focus:outline-none transition-colors"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi / petunjuk pengerjaan"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Durasi (menit)</label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className={inputCls}
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Passing Score</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                className={inputCls}
                                value={passingScore}
                                onChange={(e) => setPassingScore(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn bg-darks text-base border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {loading ? <span className="loading loading-spinner loading-sm" /> : "Simpan & Lanjut"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default FormNew
