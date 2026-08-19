import { Outlet } from "react-router-dom"

function CreatorLayout() {
    return (
        // lg:pl-64 memberi ruang untuk CreatorSidebar yang fixed di sisi kiri (desktop).
        <div className="bg-second min-h-screen lg:pl-64">
            <Outlet />
        </div>
    )
}

export default CreatorLayout