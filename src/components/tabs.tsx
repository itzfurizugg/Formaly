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
        <div className="w-full mb-6 flex">
            <div
                role="tablist"
                className="tabs tabs-box bg-white border border-second p-1 w-full rounded-none flex flex-row flex-nowrap items-center justify-between gap-1"
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
                                `tab flex-1 flex flex-row items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-none text-xs sm:text-sm font-medium transition-all select-none whitespace-nowrap ${
                                    isActive
                                        ? "tab-active !bg-darks !text-white font-semibold shadow-sm"
                                        : "text-tinted hover:text-darks hover:bg-second/60"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isActive ? "scale-105" : ""}`} />
                                    <span className={`whitespace-nowrap ${isActive ? "block" : "hidden sm:block"}`}>
                                        {tab.label}
                                    </span>
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