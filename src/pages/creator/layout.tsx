import { Outlet } from "react-router-dom"

function CreatorLayout() {
    return (
        <div className="bg-second min-h-screen">
            <Outlet />
        </div>
    )
}

export default CreatorLayout