import { Outlet } from "react-router-dom"
import CreatorNavbar from "../../components/creator/navbar"

function CreatorLayout() {
    return (
        <div className="bg-second min-h-screen">
            <CreatorNavbar />
            <Outlet />
        </div>
    )
}

export default CreatorLayout