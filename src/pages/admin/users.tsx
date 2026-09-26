import { useCallback, useEffect, useState } from "react"
import { Save, Users } from "lucide-react"
import { motion } from "motion/react"
import { supabase } from "../../lib/supabase"
import BackButton from "../../components/backButton"
import { fadeSlide, listContainer, listItem, easeOutExpo } from "../../lib/motion"

type Role = "user" | "creator" | "admin"
type RoleFilter = "all" | Role

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
    const [saving, setSaving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")

    const accountCounts = { user: 0, creator: 0, admin: 0 }
    for (const account of accounts) accountCounts[account.role] += 1

    const filteredAccounts = roleFilter === "all"
        ? accounts
        : accounts.filter(account => account.role === roleFilter)

    const fetchAccounts = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error: err } = await supabase.rpc("admin_list_users")
        if (err) setError(err.message)
        else setAccounts((data || []) as Account[])
        setLoading(false)
    }, [])

    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    const updateRole = async (account: Account, role: Role) => {
        setSaving(account.id)
        setError(null)
        setMessage(null)
        const { error: err } = await supabase.rpc("admin_update_user_role", {
            p_user_id: account.id,
            p_role: role,
        })
        if (err) setError(err.message)
        else {
            setAccounts(current => current.map(item => item.id === account.id ? { ...item, role } : item))
            setMessage(`Role ${account.email} berhasil diperbarui.`)
        }
        setSaving(null)
    }

    return (
        <motion.div
            className="flex flex-col bg-base-300 items-center px-3.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
        >
            <div className="max-w-4xl w-full mt-4">
                <BackButton showOnDesktop />
                <motion.div variants={fadeSlide} initial="hidden" animate="show" className="flex items-center justify-between mb-4.5 ml-1">
                    <div>
                        <h1 className="text-4xl font-bold text-darks">Kelola Akun</h1>
                        <p className="text-sm text-tinted mt-1">{filteredAccounts.length} dari {accounts.length} akun tampil</p>
                    </div>
                    {/* <button onClick={fetchAccounts} className="btn btn-ghost btn-sm rounded-xl"><RefreshCw className="h-4 w-4" />Refresh</button> */}
                </motion.div>

                <motion.div variants={fadeSlide} initial="hidden" animate="show" className="flex items-center gap-2 mt-6">
                    <form className="filter" onReset={() => setRoleFilter("all")}>
                        <input className="btn btn-square" type="reset" value="×" />
                        <input
                            className="btn bg-done/10 border-none"
                            type="radio"
                            name="role"
                            aria-label="User"
                            checked={roleFilter === "user"}
                            onChange={() => setRoleFilter("user")}
                        />
                        <input
                            className="btn bg-pass/10 border-none"
                            type="radio"
                            name="role"
                            aria-label="Creator"
                            checked={roleFilter === "creator"}
                            onChange={() => setRoleFilter("creator")}
                        />
                        <input
                            className="btn bg-darks/10 border-none"
                            type="radio"
                            name="role"
                            aria-label="Admin"
                            checked={roleFilter === "admin"}
                            onChange={() => setRoleFilter("admin")}
                        />
                    </form>
                </motion.div>

                {error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl px-3.5 py-3 mt-4">{error}</motion.div>}
                {message && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-done bg-done/5 border border-done/20 rounded-xl px-3.5 py-3 mt-4">{message}</motion.div>}

                {!loading && accounts.length === 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-tinted"><Users className="h-12 w-12 mx-auto mb-3 opacity-40" />Belum ada akun.</motion.div>}
                {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-tinted">Tidak ada akun dengan role ini.</motion.div>
                )}
                {!loading && filteredAccounts.length > 0 && (
                    <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3 mt-6">
                        {filteredAccounts.map(account => (
                            <motion.div key={account.id} variants={listItem} className="card bg-base border border-second rounded-xl">
                                <div className="card-body p-4 flex-row items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-semibold text-darks truncate">{account.name}</h2>
                                        <p className="text-xs text-tinted truncate">{account.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <select className="select select-sm rounded-xl bg-second border-darks/10" value={account.role} disabled={saving === account.id} onChange={event => updateRole(account, event.target.value as Role)}>
                                            <option value="user">User</option>
                                            <option value="creator">Creator</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        {saving === account.id && <Save className="h-4 w-4 animate-pulse text-tinted" />}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

export default AdminUsers
