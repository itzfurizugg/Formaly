import { NavLink, useParams } from "react-router-dom"
import { ClipboardList, FileText, KeyRound, ListChecks } from "lucide-react"

const tabItems = [
    { to: "questions", label: "Soal", icon: ListChecks, end: true },
    { to: "tokens", label: "Token", icon: KeyRound, end: true },
    { to: "submissions", label: "Submission", icon: ClipboardList, end: false },
]

function Tabs() {
    const { id } = useParams()

    return (
        <div className="tabs tabs-box tabs-lg bg-white border border-second shadow-sm rounded-2xl w-full mb-6">
            <NavLink
                to={`/creator/forms/${id}`}
                end
                className={({ isActive }) =>
                    `tab gap-1.5 text-sm text-darks transition-colors ${isActive ? "bg-darks text-base font-semibold" : "hover:bg-second"}`
                }
            >
                <FileText className="h-4 w-4" /> Detail
            </NavLink>
            {tabItems.map((tab) => (
                <NavLink
                    key={tab.to}
                    to={`/creator/forms/${id}/${tab.to}`}
                    end={tab.end}
                    className={({ isActive }) =>
                        `tab gap-1.5 text-sm text-darks transition-colors ${isActive ? "bg-darks text-base font-semibold" : "hover:bg-second"}`
                    }
                >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                </NavLink>
            ))}
        </div>
    )
}

export default Tabs
