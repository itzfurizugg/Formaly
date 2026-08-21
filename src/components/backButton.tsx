import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface BackButtonProps {
    to?: string
    onClick?: () => void
    label?: string
    className?: string
}

// Tombol kembali bergaya "liquid glass" iOS 26: lingkaran frosted glass
// (backdrop-blur + border transparan + highlight gradasi) dengan panah.
// Teks label disembunyikan; cukup lingkaran berisi ikon panah.
function BackButton({ to, onClick, label = "Kembali", className = "" }: BackButtonProps) {
    const navigate = useNavigate()

    const handleClick = () => {
        if (onClick) onClick()
        else if (to) navigate(to)
        else navigate(-1)
    }

    return (
        <button
            onClick={handleClick}
            aria-label={label}
            title={label}
            className={`group inline-flex items-center -mt-5 mb-4 lg:hidden text-darks ${className}`}
        >
            <span className="relative size-9 md:size-10 shrink-0 rounded-full flex items-center justify-center border border-white/70 bg-gradient-to-b from-white/70 to-white/30 backdrop-blur-xl shadow-[0_2px_12px_rgba(57,62,70,0.18)] transition-all duration-200 hover:from-white/80 hover:to-white/40 active:scale-95">
                <ArrowLeft className="h-4 w-4 md:h-[18px] md:w-[18px] text-darks" strokeWidth={2.2} />
            </span>
        </button>
    )
}

export default BackButton
