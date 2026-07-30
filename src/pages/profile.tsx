import { UserRound, Mail, LogOut } from "lucide-react"

function Profile() {
    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <UserRound className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Profil</h1>
                </div>
                <p className="text-sm text-tinted mb-8">
                    Informasi akun kamu.
                </p>

                <div className="bg-white rounded-2xl border border-second p-8 shadow-sm">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-darks flex items-center justify-center mb-3">
                            <UserRound className="h-7 w-7 text-base" />
                        </div>
                        <h2 className="text-lg font-bold text-darks">Mujahid Robbani</h2>
                        <p className="text-sm text-tinted">murid</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Nama</label>
                            <div className="relative">
                                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="text"
                                    className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    value="Mujahid Robbani"
                                    readOnly
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="email"
                                    className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    value="mujahid@email.com"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    <button className="btn bg-wrong text-base border-none w-full mt-6 hover:opacity-90 transition-opacity">
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Profile
