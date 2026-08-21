import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth-context"
import BackButton from "../../components/backButton"
import { alertSaveError, alertSaveSuccess } from "../../lib/alerts"
import RichTextEditor from "../../components/richText"

function FormNew() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [duration, setDuration] = useState<number | "">(0)
    const [passingScore, setPassingScore] = useState<number | "">(70)
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

    const inputCls = "input w-full bg-white text-xl lg:text-3xl h-auto p-2 border-second focus:border-done focus:outline-none transition-colors"
    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-5xl">
                <BackButton to="/creator" />

                <h1 className="text-2xl font-bold text-darks mb-1">Buat Form Baru</h1>
                <p className="text-sm text-tinted mb-6">Lengkapi informasi dasar form.</p>

                <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-second p-3 lg:p-6 shadow-sm rounded-xl">
                    <div>
                        {/* <label className="block text-sm font-medium text-darks mb-1.5">Judul</label> */}
                        <input
                            type="text"
                            required
                            className={inputCls}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Judul Form"
                        />
                    </div>

                    <div>
                        {/* <label className="block text-sm font-medium text-darks mb-1.5">Deskripsi</label> */}
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Deskripsi Form"
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
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setDuration(val === "" ? "" : Number(val))
                                }}
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
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setPassingScore(val === "" ? "" : Number(val))
                                }}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn bg-darks text-base mt-10 h-12 border-none w-full hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {loading ? <span className="loading loading-spinner loading-sm" /> : "Simpan & Lanjut"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default FormNew
