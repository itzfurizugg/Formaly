import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, ChevronRight, Search, Trash2, Users, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { supabase } from "../../lib/supabase"
import BackButton from "../../components/backButton"
import ModalPortal from "../../components/modalPortal"
import { fadeSlide, listContainer, listItem, easeOutExpo } from "../../lib/motion"
import { showAlert } from "../../lib/alerts"

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
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
    const [search, setSearch] = useState("")
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "success">("idle")
    const [deletedAccountInfo, setDeletedAccountInfo] = useState<{ name: string; email: string } | null>(null)

    const accountCounts = { user: 0, creator: 0, admin: 0 }
    for (const account of accounts) accountCounts[account.role] += 1

    // Pencarian dicek di frontend karena data admin sudah di-full load
    // lewat admin_list_users (seluruh akun, bukan per halaman).
    const query = search.trim().toLowerCase()
    const filteredAccounts = accounts.filter((account) => {
        if (roleFilter !== "all" && account.role !== roleFilter) return false
        if (!query) return true
        return account.name.toLowerCase().includes(query) || account.email.toLowerCase().includes(query)
    })

    const closeModal = useCallback(() => {
        setSelectedAccount(null)
        setDeleteStep("idle")
        setDeletedAccountInfo(null)
    }, [])

    const fetchAccounts = useCallback(async () => {
        setLoading(true)
        const { data, error: err } = await supabase.rpc("admin_list_users")
        if (err) {
            showAlert(err.message, "error")
        } else setAccounts((data || []) as Account[])
        setLoading(false)
    }, [])

    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    useEffect(() => {
        if (!selectedAccount) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeModal()
        }
        window.addEventListener("keydown", onKeyDown)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            document.body.style.overflow = prevOverflow
        }
    }, [selectedAccount, closeModal])

    const updateRole = async (account: Account, role: Role) => {
        setSaving(account.id)
        const { error: err } = await supabase.rpc("admin_update_user_role", {
            p_user_id: account.id,
            p_role: role,
        })
        if (err) {
            showAlert(err.message, "error")
        } else {
            setAccounts(current => current.map(item => item.id === account.id ? { ...item, role } : item))
            setSelectedAccount(current => current && current.id === account.id ? { ...current, role } : current)
            showAlert(`Role ${account.name} berhasil diperbarui.`, "success")
        }
        setSaving(null)
    }

    const deleteAccount = async (account: Account) => {
        setSaving(account.id)
        const { error: rpcErr } = await supabase.rpc("admin_delete_user", {
            p_user_id: account.id,
        })
        let err = rpcErr
        if (err && err.message?.toLowerCase().includes("function") && err.message?.toLowerCase().includes("not exist")) {
            const { error: tableErr } = await supabase.from("users").delete().eq("id", account.id)
            err = tableErr
        }
        if (err) {
            showAlert(err.message, "error")
        } else {
            setAccounts(current => current.filter(item => item.id !== account.id))
            setDeletedAccountInfo({ name: account.name, email: account.email })
            setDeleteStep("success")
            showAlert(`Akun ${account.email} berhasil dihapus.`, "success")
        }
        setSaving(null)
    }

    // Satu markup untuk dua penempatan: inline di flow (desktop) dan fixed di
    // bawah layar (mobile), jadi behave-nya sama persis di kedua breakpoint.
    const searchField = (
        <label className="input w-full rounded-xl bg-base border border-second focus-within:border-darks/20 flex items-center gap-2">
            <Search className="h-4 w-4 text-tinted shrink-0" />
            <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari akun berdasarkan nama atau email..."
                className="grow bg-transparent text-sm text-darks placeholder:text-tinted focus:outline-none"
                aria-label="Cari akun"
            />
            {search && (
                <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="btn btn-ghost btn-xs btn-circle text-tinted hover:text-darks shrink-0"
                    aria-label="Hapus pencarian"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </label>
    )

    return (
        <>
            <motion.div
                className="flex flex-col bg-base-300 items-center px-3.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, ease: easeOutExpo }}
            >
                <div className="max-w-4xl w-full mt-4 pb-28 sm:pb-6">
                    <BackButton showOnDesktop />
                    <motion.div variants={fadeSlide} initial="hidden" animate="show" className="flex items-center justify-between mb-4.5 ml-1">
                        <div>
                            <h1 className="text-4xl font-bold text-darks">Kelola Akun</h1>
                            <p className="text-sm text-tinted mt-1">{filteredAccounts.length} dari {accounts.length} akun tampil</p>
                        </div>
                        {/* <button onClick={fetchAccounts} className="btn btn-ghost btn-sm rounded-xl"><RefreshCw className="h-4 w-4" />Refresh</button> */}
                    </motion.div>

                    <motion.div variants={fadeSlide} initial="hidden" animate="show" className="flex flex-col items-start gap-2 mt-6">
                        <label className="text-md">Role Akun: </label>
                        <form className="filter" onReset={() => setRoleFilter("all")}>
                            <input className="btn btn-square" type="reset" value="×" />
                            <input
                                className="btn bg-done/10 border-none rounded-full"
                                type="radio"
                                name="role"
                                aria-label="User"
                                checked={roleFilter === "user"}
                                onChange={() => setRoleFilter("user")}
                            />
                            <input
                                className="btn bg-pass/10 border-none rounded-full"
                                type="radio"
                                name="role"
                                aria-label="Creator"
                                checked={roleFilter === "creator"}
                                onChange={() => setRoleFilter("creator")}
                            />
                            <input
                                className="btn bg-darks/10 border-none rounded-full"
                                type="radio"
                                name="role"
                                aria-label="Admin"
                                checked={roleFilter === "admin"}
                                onChange={() => setRoleFilter("admin")}
                            />
                        </form>
                    </motion.div>

                    {/* Search desktop: ikut flow, disembunyikan di mobile karena
                    versi fixed di bawah layar yang dipakai. */}
                    <motion.div variants={fadeSlide} initial="hidden" animate="show" className="mt-6 hidden sm:block">
                        {searchField}
                    </motion.div>

                    {!loading && accounts.length === 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-tinted"><Users className="h-12 w-12 mx-auto mb-3 opacity-40" />Belum ada akun.</motion.div>}
                    {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-tinted">
                            {query ? `Tidak ada akun yang cocok dengan "${search.trim()}".` : "Tidak ada akun dengan role ini."}
                        </motion.div>
                    )}
                    {!loading && filteredAccounts.length > 0 && (
                        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3 mt-6">
                            {filteredAccounts.map(account => (
                                <motion.div
                                    key={account.id}
                                    variants={listItem}
                                    layoutId={`account-card-${account.id}`}
                                    onClick={() => {
                                        setSelectedAccount(account)
                                        setDeleteStep("idle")
                                        setDeletedAccountInfo(null)
                                    }}
                                    className="card bg-base border border-second rounded-xl hover:border-darks/20 hover:shadow-sm transition-colors cursor-pointer"
                                >
                                    <div className="card-body p-4 flex-row items-center justify-between gap-2">
                                        <Link
                                            to={`#user-${account.id}`}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setSelectedAccount(account)
                                                setDeleteStep("idle")
                                                setDeletedAccountInfo(null)
                                            }}
                                            className="min-w-0 flex-1 group focus:outline-none"
                                            aria-label={`Detail akun ${account.name}`}
                                        >
                                            <h2 className="text-xl font-semibold text-darks truncate group-hover:underline">
                                                {account.name}
                                            </h2>
                                            <p className="text-xs text-tinted truncate">{account.email}</p>
                                        </Link>
                                        <div
                                            className="flex items-center gap-2 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ChevronRight />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {selectedAccount && (
                            <ModalPortal key="account-modal-portal">
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <motion.div
                                        key="account-modal-backdrop"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.22, ease: "easeOut" }}
                                        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                                        onClick={closeModal}
                                    />
                                    <motion.div
                                        layoutId={`account-card-${selectedAccount.id}`}
                                        className="relative w-full max-w-lg bg-base border border-second rounded-lg shadow-2xl z-10 overflow-hidden"
                                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                        role="dialog"
                                        aria-modal="true"
                                    >
                                        <div className="p-6">
                                            <AnimatePresence mode="wait">
                                                {deleteStep === "idle" && (
                                                    <motion.div
                                                        key="idle"
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -6 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0 flex-1">
                                                                <h2 className="text-2xl font-bold text-darks truncate">
                                                                    {selectedAccount.name}
                                                                </h2>
                                                                <p className="text-xs text-tinted truncate">
                                                                    {selectedAccount.email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 8 }}
                                                            transition={{ duration: 0.2, delay: 0.05 }}
                                                            className="mt-6 space-y-4"
                                                        >
                                                            <div className="bg-second/50 rounded-xl p-3.5 space-y-2 text-sm">
                                                                <div className="flex items-center justify-between text-xs text-tinted">
                                                                    <span>ID Akun</span>
                                                                    <span className="font-mono text-darks select-all text-[11px] sm:text-xs">
                                                                        {selectedAccount.id}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs text-tinted">
                                                                    <span>Terdaftar</span>
                                                                    <span className="text-darks">
                                                                        {new Date(selectedAccount.created_at).toLocaleDateString("id-ID", {
                                                                            day: "numeric",
                                                                            month: "long",
                                                                            year: "numeric",
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 border-t border-second">
                                                                <div className="mb-2.5 flex flex-col">
                                                                    <span className="text-sm font-semibold text-darks leading-none">Role Pengguna</span>
                                                                    <span className="text-xs text-tinted leading-none mt-1.5">Ubah hak akses akun</span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-1.5 bg-second/50 rounded-lg p-1">
                                                                    {(["user", "creator", "admin"] as Role[]).map((roleOption) => {
                                                                        const isActive = selectedAccount.role === roleOption
                                                                        const isSavingThis = saving === selectedAccount.id
                                                                        const label = roleOption === "user" ? "User" : roleOption === "creator" ? "Creator" : "Admin"
                                                                        const activeColor =
                                                                            roleOption === "user"
                                                                                ? "bg-done text-white"
                                                                                : roleOption === "creator"
                                                                                    ? "bg-success text-white"
                                                                                    : "bg-darks text-white"
                                                                        return (
                                                                            <button
                                                                                key={roleOption}
                                                                                type="button"
                                                                                disabled={isSavingThis}
                                                                                onClick={() => updateRole(selectedAccount, roleOption)}
                                                                                className={`relative flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${isActive
                                                                                    ? `${activeColor} shadow-sm`
                                                                                    : "text-tinted hover:text-darks"
                                                                                    }`}
                                                                            >
                                                                                {label}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-second">
                                                                <div className="min-w-0 flex flex-col">
                                                                    <span className="text-sm font-semibold text-darks leading-none">Hapus Pengguna</span>
                                                                    <span className="text-xs text-tinted leading-none mt-1.5">Akun pengguna akan dihapus dari Formaly</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteStep("confirm")}
                                                                    className="btn btn-sm items-center rounded-sm bg-wrong/10 text-wrong hover:bg-wrong/20 border-none shrink-0"
                                                                >
                                                                    <Trash2 className="h-3 w-3" /> Hapus
                                                                </button>
                                                            </div>
                                                        </motion.div>

                                                        <div className="mt-6 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={closeModal}
                                                                className="btn btn-sm rounded-sm bg-second hover:bg-second/80 text-darks border-none px-4"
                                                            >
                                                                Tutup
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {deleteStep === "confirm" && (
                                                    <motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -6 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex flex-col items-center text-center py-2"
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-wrong/10 text-wrong flex items-center justify-center mb-3">
                                                            <Trash2 className="h-8 w-8" />
                                                        </div>
                                                        <h3 className="text-xl font-medium text-darks">Hapus Akun <span className="font-extrabold">{selectedAccount.name}?</span></h3>
                                                        <p className="text-sm text-tinted mt-1 max-w-sm">
                                                            Akun <span className="font-semibold text-darks">{selectedAccount.name}</span> ({selectedAccount.email}) akan dihapus secara permanen dari Formaly. Tindakan ini tidak dapat dibatalkan.
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-6 w-full justify-center">
                                                            <button
                                                                type="button"
                                                                disabled={saving === selectedAccount.id}
                                                                onClick={() => setDeleteStep("idle")}
                                                                className="btn btn-sm rounded-sm bg-second hover:bg-second/80 text-darks border-none px-4"
                                                            >
                                                                Batal
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={saving === selectedAccount.id}
                                                                onClick={() => deleteAccount(selectedAccount)}
                                                                className="btn btn-sm rounded-sm bg-wrong/10 hover:bg-wrong/90 text-wrong hover:text-white border-none px-4"
                                                            >
                                                                {saving === selectedAccount.id ? "Menghapus..." : "Ya, Hapus Akun"}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {deleteStep === "success" && (
                                                    <motion.div
                                                        key="success"
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -6 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex flex-col items-center text-center py-2"
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-done/10 text-done flex items-center justify-center mb-3">
                                                            <CheckCircle2 className="h-12 w-12" />
                                                        </div>
                                                        <h3 className="text-xl font-bold text-darks">Akun Berhasil Dihapus</h3>
                                                        <p className="text-sm text-tinted max-w-sm">
                                                            Akun <span className="font-semibold text-darks">{deletedAccountInfo?.name || selectedAccount.name}</span> telah berhasil dihapus dari Formaly.
                                                        </p>
                                                        <div className="mt-6 flex justify-center w-full">
                                                            <button
                                                                type="button"
                                                                onClick={closeModal}
                                                                className="btn btn-sm rounded-full bg-darks text-white hover:bg-darks/90 border-none px-3.5"
                                                            >
                                                                Tutup
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                </div>
                            </ModalPortal>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Search mobile: pola yang sama dengan tombol "Simpan Perubahan" di
            formEdit — fixed di bawah layar, pointer-events-none supaya gradiennya
            tidak menutup tap, isinya yang pointer-events-auto.

            Hanya search bar yang dianimasikan (naik dari bawah + fade); gradien dan
            blur tetap statis. Delay dikunci ke `loading` supaya bar tidak muncul
            dulu lalu "kedip" saat data akun selesai fetched. */}
            <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none sm:hidden">
                <div className="absolute inset-x-0 bottom-0 h-30 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-darks/25 from-20% to-darks/0" />
                    <div
                        className="absolute inset-0 backdrop-blur-[1px]"
                        style={{ maskImage: "linear-gradient(to top, black 0%, black 40%, transparent 70%)" }}
                    />
                    <div
                        className="absolute inset-0 backdrop-blur-[2px]"
                        style={{ maskImage: "linear-gradient(to top, black 0%, black 25%, transparent 50%)" }}
                    />
                    <div
                        className="absolute inset-0 backdrop-blur-[4px]"
                        style={{ maskImage: "linear-gradient(to top, black 0%, black 15%, transparent 30%)" }}
                    />
                </div>
                <div className="relative px-3.5 pb-8 pt-10">
                    <motion.div
                        className="pointer-events-auto"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: easeOutExpo, delay: loading ? 0 : 0.15 }}
                    >
                        {searchField}
                    </motion.div>
                </div>
            </div>
        </>
    )
}

export default AdminUsers
