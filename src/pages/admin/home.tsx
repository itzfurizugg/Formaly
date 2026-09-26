import { useCallback, useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { fadeSlide, listContainer, listItem } from "../../lib/motion"
import { supabase } from "../../lib/supabase"

type Role = "user" | "creator" | "admin"

type Account = {
    id: string
    name: string
    email: string
    role: Role
    created_at: string
}

function AdminUsers() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const accountCounts = { user: 0, creator: 0, admin: 0 }
    for (const account of accounts) accountCounts[account.role] += 1

    const fetchAccounts = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase.rpc("admin_list_users")
        if (err) setError(err.message)
        else setAccounts((data || []) as Account[])
        setLoading(false)
    }, [])

    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    return (
        <motion.div
            className="flex flex-col items-center px-3.5 py-10"
            initial="hidden"
            animate="show"
            variants={fadeSlide}
        >
            <div className="max-w-4xl w-full">
                <motion.div variants={fadeSlide} className="flex items-center justify-between mb-1">
                    <div className="ml-1">
                        <h1 className="text-4xl font-bold text-darks">Administrator</h1>
                        <p className="text-sm text-tinted mt-0.5">Data semua pengguna Formaly</p>
                    </div>
                </motion.div>

                <motion.div variants={listContainer} initial="hidden" animate="show" className="w-full mt-6">
                    <div className="stats stats-vertical lg:stats-horizontal w-full grid grid-cols-2 gap-2 overflow-visible p-0 shadow-none sm:gap-3 lg:grid-cols-4">
                        <motion.div variants={listItem} className="stat min-w-0 rounded-xl border-none bg-done p-3 text-white shadow-sm ring-1 ring-done/30 sm:p-4">
                            <div className="stat-title whitespace-normal text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">Akun Pengguna</div>
                            <div className="stat-value mt-1 text-4xl font-extrabold leading-none text-white sm:text-6xl">{loading ? "..." : accountCounts.user}</div>
                            <div className="stat-desc mt-1 line-clamp-1 whitespace-normal text-[10px] leading-tight text-white/70 sm:text-sm hidden sm:block">Role pengguna</div>
                        </motion.div>

                        <motion.div variants={listItem} className="stat min-w-0 rounded-xl border-none bg-pass p-3 text-white shadow-sm ring-1 ring-pass/30 sm:p-4">
                            <div className="stat-title whitespace-normal text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">Akun Kreator</div>
                            <div className="stat-value mt-1 text-4xl font-extrabold leading-none text-white sm:text-6xl">{loading ? "..." : accountCounts.creator}</div>
                            <div className="stat-desc mt-1 line-clamp-1 whitespace-normal text-[10px] leading-tight text-white/70 sm:text-sm hidden sm:block">Role kreator</div>
                        </motion.div>

                        <motion.div variants={listItem} className="stat min-w-0 rounded-xl border-none bg-darks p-3 text-white shadow-sm ring-1 ring-darks/20 sm:p-4">
                            <div className="stat-title whitespace-normal text-[11px] font-semibold leading-tight text-white/80 sm:text-xs">Akun Administrator</div>
                            <div className="stat-value mt-1 text-4xl font-extrabold leading-none text-white sm:text-6xl">{loading ? "..." : accountCounts.admin}</div>
                            <div className="stat-desc mt-1 line-clamp-1 whitespace-normal text-[10px] leading-tight text-white/70 sm:text-sm hidden sm:block">Role administrator</div>
                        </motion.div>

                        <motion.div variants={listItem} className="stat min-w-0 rounded-xl border-none bg-white p-3 text-darks shadow-sm ring-1 ring-second dark:bg-base dark:text-white sm:p-4">
                            <div className="stat-title whitespace-normal text-[11px] font-semibold leading-tight text-darks/70 dark:text-white/80 sm:text-xs">Total Pengguna</div>
                            <div className="stat-value mt-1 text-4xl font-extrabold leading-none text-darks dark:text-white sm:text-6xl">{loading ? "..." : accounts.length}</div>
                            <div className="stat-desc mt-1 line-clamp-1 whitespace-normal text-[10px] leading-tight text-darks/60 dark:text-white/70 sm:text-sm hidden sm:block">Seluruh akun terdaftar</div>
                        </motion.div>
                    </div>
                </motion.div>

                {error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl px-3.5 py-3 mt-4">{error}</motion.div>}

                <motion.div variants={fadeSlide} className="w-full mt-6">
                    <Link
                        to="/admin/userManagement"
                        className="group relative mb-5 flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all active:scale-[0.98] dark:border-darks/15 dark:bg-second"
                    >
                        <div className="relative z-10 ml-1 min-w-0 flex-1 pr-14">
                            <div className="flex items-center gap-1.5">
                                <span className="block text-base font-bold text-darks">Kelola Akun</span>
                            </div>
                            <span className="block text-xs text-tinted">Daftar akun pengguna Formaly</span>
                        </div>

                        <ChevronRight className="relative z-10 h-4 w-4 shrink-0 text-tinted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </motion.div>
            </div>
        </motion.div>
    )
}

export default AdminUsers
