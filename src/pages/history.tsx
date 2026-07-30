import { useState } from "react"
import { Search, RotateCcwClock, FileText } from "lucide-react"
import Card from "../components/card"

const dummyHistory = [
    { title: "AAT Konsentrasi Keahlian Kelas 11 RPL", author: "Mujahid Robbani Sholahudin", duration: "30 menit", questions: 40 },
    { title: "Ujian Tengah Semester Ganjil 2024", author: "Tim Akademik", duration: "60 menit", questions: 50 },
    { title: "Survey Kepuasan Pembelajaran", author: "BAAK", duration: "15 menit", questions: 10 },
]

function History() {
    const [search, setSearch] = useState("")

    const filtered = dummyHistory.filter(
        (item) =>
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.author.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <RotateCcwClock className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Histori</h1>
                </div>
                <p className="text-sm text-tinted mb-6">
                    Formulir yang pernah kamu kerjakan.
                </p>

                <div className="join w-full mb-6">
                    <div className="join-item flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cari histori..."
                            className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <FileText className="h-12 w-12 text-tinted/40 mx-auto mb-3" />
                        <p className="text-tinted">
                            {search ? "Histori tidak ditemukan." : "Belum ada histori formulir."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((item, i) => (
                            <Card
                                key={i}
                                title={item.title}
                                author={item.author}
                                duration={item.duration}
                                questions={item.questions}
                                to="/form/description"
                                buttonLabel="Lihat"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default History
