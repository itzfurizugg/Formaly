import type { ReactNode } from "react"
import { useCreatorAccess } from "./useCreatorAccess"

// Gerbang akses area creator. Tidak ada lagi loading terpisah "Memeriksa
// akses..." di sini — pengecekan role dimigrasikan ke useCreatorAccess yang
// hasilnya di-cache (sessionStorage). Selama role belum terkonfirmasi, children
// tidak di-render; begitu allowed, halaman langsung tampil. Redirect untuk user
// yang tidak berhak ditangani di dalam hook.
function RequireCreator({ children }: { children: ReactNode }) {
    const { allowed } = useCreatorAccess()

    // allowed di-cache dari query role; kalau belum pernah dicek nilainya false
    // sampai query selesai (biasanya sangat singkat & sudah ter-cache di refresh).
    if (!allowed) return null

    return <>{children}</>
}

export default RequireCreator