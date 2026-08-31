import Loading from "./loading"

// Splash layar penuh untuk first load / refresh. Dirender oleh App saat sinyal
// auth masih loading — beda dengan Loading.tsx yang dipakai inline/overlay.
function AppSplash() {
    return <Loading label="Memuat..." />
}

export default AppSplash
