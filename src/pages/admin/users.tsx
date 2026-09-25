import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Save, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"

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
        const { error: err } = await supabase.from("users").update({ role }).eq("id", account.id)
        if (err) setError(err.message)
        else {
            setAccounts(current => current.map(item => item.id === account.id ? { ...item, role } : item))
            setMessage(`Role ${account.email} berhasil diperbarui.`)
        }
        setSaving(null)
    }

    return (
        <div className="flex flex-col items-center px-3.5 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <h1 className="text-2xl font-bold text-darks">Kelola Akun</h1>
                        <p className="text-sm text-tinted mt-1">{filteredAccounts.length} dari {accounts.length} akun tampil</p>
                    </div>
                    <button onClick={fetchAccounts} className="btn btn-ghost btn-sm rounded-xl"><RefreshCw className="h-4 w-4" />Refresh</button>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    <label htmlFor="role-filter" className="text-sm text-tinted">Filter role</label>
                    <select id="role-filter" className="select select-sm rounded-xl bg-second border-darks/10" value={roleFilter} onChange={event => setRoleFilter(event.target.value as RoleFilter)}>
                        <option value="all">Semua role</option>
                        <option value="user">User</option>
                        <option value="creator">Creator</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                {error && <div className="text-sm text-wrong bg-wrong/5 border border-wrong/20 rounded-xl px-3.5 py-3 mt-4">{error}</div>}
                {message && <div className="text-sm text-done bg-done/5 border border-done/20 rounded-xl px-3.5 py-3 mt-4">{message}</div>}

                {!loading && accounts.length === 0 && <div className="text-center py-20 text-tinted"><Users className="h-12 w-12 mx-auto mb-3 opacity-40" />Belum ada akun.</div>}
                {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
                    <div className="text-center py-20 text-tinted">Tidak ada akun dengan role ini.</div>
                )}
                {!loading && filteredAccounts.length > 0 && (
                    <div className="space-y-3 mt-6">
                        {filteredAccounts.map(account => (
                            <div key={account.id} className="card bg-base border border-second rounded-xl">
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminUsers
