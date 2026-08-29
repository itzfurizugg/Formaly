import LinearProgress from "./LinearProgress"

// Splash layar penuh untuk first load / refresh. Dirender oleh App saat sinyal
// auth masih loading — beda dengan Loading.tsx yang dipakai inline/overlay.
function AppSplash() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-base-300">
            <div className="w-full max-w-[220px] px-6">
                <LinearProgress label="Memuat..." />
            </div>
        </div>
    )
}

export default AppSplash