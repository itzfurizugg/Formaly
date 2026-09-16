import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
    Moon,
    Sun,
    Shield,
    Info,
    ChevronRight,
} from "lucide-react"
import BackButton from "../components/backButton"
import { showAlert } from "../lib/alerts"
import { easeOutExpo } from "../lib/motion"

function SettingsPage() {
    const navigate = useNavigate()

    const [theme, setTheme] = useState<"light" | "dark">(() => {
        return (localStorage.getItem("setting_theme") as "light" | "dark") || "light"
    })

    useEffect(() => {
        localStorage.setItem("setting_theme", theme)
    }, [theme])

    return (
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-15">
            <div className="w-full max-w-2xl">
                <BackButton to="/profile" showOnDesktop />

                <div className="ml-2">
                    <h1 className="text-3xl lg:text-5xl font-bold font-display text-darks mb-1">Pengaturan</h1>
                    <p className="text-sm text-tinted mb-6">Kelola preferensi tampilan dan aplikasi kamu.</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: easeOutExpo }}
                    className="space-y-3"
                >
                    {/* Preferensi Tampilan & Notifikasi */}
                    <div className="bg-white border border-second rounded-2xl lg:rounded-xl overflow-hidden divide-y divide-second">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-base flex items-center justify-center shrink-0">
                                    {theme === "dark" ? (
                                        <Moon className="h-4 w-4 text-darks" />
                                    ) : (
                                        <Sun className="h-4 w-4 text-darks" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-darks">Mode Gelap</p>
                                    <p className="text-xs text-tinted">Tema tampilan aplikasi</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={theme === "dark"}
                                onClick={() => {
                                    const next = theme === "dark" ? "light" : "dark"
                                    setTheme(next)
                                    showAlert(`Mode ${next === "dark" ? "Gelap" : "Terang"} disimpan`, "info")
                                }}
                                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                                    theme === "dark" ? "bg-done justify-end" : "bg-second justify-start"
                                }`}
                            >
                                <span className="bg-white w-4 h-4 rounded-full shadow-sm" />
                            </button>
                        </div>
                    </div>

                    {/* Tentang & Legalitas */}
                    <div className="bg-white border border-second rounded-2xl lg:rounded-xl overflow-hidden divide-y divide-second">
                        <button
                            onClick={() => navigate("/credit")}
                            className="w-full flex items-center gap-3 p-4 hover:bg-base transition-colors text-left"
                        >
                            <div className="w-9 h-9 rounded-full bg-base flex items-center justify-center shrink-0">
                                <Info className="h-4 w-4 text-darks" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-darks">Tentang Formaly</p>
                                <p className="text-xs text-tinted">Versi aplikasi dan tim pengembang</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-tinted shrink-0" />
                        </button>

                        <div className="p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-base flex items-center justify-center shrink-0">
                                <Shield className="h-4 w-4 text-darks" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-darks">Versi Aplikasi</p>
                                <p className="text-xs text-tinted">v1.0.0 (Formaly Web)</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default SettingsPage