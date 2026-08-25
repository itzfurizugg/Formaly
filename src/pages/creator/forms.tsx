import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import FormList from "../../components/creator/formList"
import BackButton from "../../components/backButton"

function CreatorForms() {
    return (
        <div className="flex flex-col items-center px-3 sm:px-6 py-5 sm:py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to="/creator" />
                <div className="ml-2 mr-2">
                    <div className="flex items-center justify-between mb-1">
                        <h1 className="text-3xl lg:text-5xl font-bold font-display text-darks">Kelola Form</h1>
                        <Link to="/creator/forms/new" className="btn bg-darks text-base border-none rounded-full h-10 min-h-0">
                            <Plus className="h-4 w-4" /> <span className="hidden sm:block">Buat Form</span>
                        </Link>
                    </div>
                    <p className="text-sm text-tinted mb-6">Daftar formulir milik kamu.</p>
                </div>
                <FormList />
            </div>
        </div>
    )
}

export default CreatorForms
