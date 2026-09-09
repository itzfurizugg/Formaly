import { useNavigate, useRouteError, isRouteErrorResponse } from "react-router-dom"
import { motion } from "motion/react"
import { AlertTriangle, Home, ArrowLeft } from "lucide-react"
import { easeOutExpo } from "../lib/motion"

function ErrorHandling() {
    const navigate = useNavigate()
    const error = useRouteError()

    let title = "Terjadi Kesalahan"
    let message = "Sepertinya ada yang tidak beres. Silakan coba lagi."

    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            title = "Halaman Tidak Ditemukan"
            message = "Halaman yang kamu cari tidak ada atau sudah dipindahkan."
        } else {
            title = `Kesalahan ${error.status}`
            message = error.statusText || message
        }
    } else if (error instanceof Error) {
        message = error.message || message
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-3.5 bg-second">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: easeOutExpo }}
                className="flex flex-col items-center text-center max-w-sm"
            >
                <div className="w-16 h-16 rounded-full bg-wrong/10 flex items-center justify-center mb-5">
                    <AlertTriangle className="h-8 w-8 text-wrong" />
                </div>
                <h1 className="text-2xl font-bold text-darks mb-2">{title}</h1>
                <p className="text-sm text-tinted mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn rounded-full bg-base text-darks border border-second hover:bg-second transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="btn rounded-full bg-darks text-base border-none hover:opacity-90 transition-opacity"
                    >
                        <Home className="h-4 w-4" />
                        Beranda
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export default ErrorHandling
