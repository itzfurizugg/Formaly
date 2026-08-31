import Loading from "./loading"

/** Loading full-area untuk fallback Suspense / pengecekan auth.
 * Memakai komponen Loading yang sama agar konsisten di seluruh proyek. */
function LoadingPage({ label = "Memuat..." }: { label?: string }) {
    return <Loading inline label={label} />
}

export default LoadingPage
