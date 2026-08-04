import { NavLink, useParams } from "react-router-dom"
import { ClipboardList, FileText, KeyRound, ListChecks } from "lucide-react"

const tabItems = [
    { to: "", label: "Detail", icon: FileText, end: true },
    { to: "questions", label: "Soal", icon: ListChecks, end: true },
    { to: "tokens", label: "Token", icon: KeyRound, end: true },
    { to: "submissions", label: "Submission", icon: ClipboardList, end: false },
]

function Tabs() {
    const { id } = useParams()

    if (!id) return null

    return (
        <div className="w-full mb-6">
            <div
                role="tablist"
                className="tabs tabs-box tabs-lg bg-white border border-second/80 shadow-sm rounded-2xl p-1.5 w-full flex flex-wrap lg:flex-nowrap gap-1 overflow-x-auto scrollbar-none"
            >
                {tabItems.map((tab) => {
                    const targetPath = tab.to ? `/creator/forms/${id}/${tab.to}` : `/creator/forms/${id}`
                    const Icon = tab.icon

                    return (
                        <NavLink
                            key={tab.to || "detail"}
                            to={targetPath}
                            end={tab.end}
                            role="tab"
                            className={({ isActive }) =>
                                `tab flex-1 min-w-[120px] gap-2 text-sm font-medium transition-all duration-200 rounded-xl select-none ${
                                    isActive
                                        ? "tab-active !bg-darks !text-white font-semibold shadow-md shadow-darks/15 scale-[1.01]"
                                        : "text-tinted hover:text-darks hover:bg-second/60 active:scale-[0.98]"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                                    <span>{tab.label}</span>
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </div>
    )
}

export default Tabs
