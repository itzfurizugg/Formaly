import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { showAlert } from "../../lib/alerts"

interface TagInputProps {
    formId: string
    /** Dipanggil setelah tags berubah dan tersimpan di database. */
    onChange?: (tags: string[]) => void
}

/**
 * Komponen input tag untuk sebuah form. Mengelola state tags, tambah, hapus,
 * dan sinkronisasi ke database (RPC set_form_tags / delete_unused_tags dengan
 * fallback operasi langsung bila RPC belum diterapkan di DB).
 */
export default function TagInput({ formId, onChange }: TagInputProps) {
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")

    const applyTags = useCallback(
        (next: string[]) => {
            setTags(next)
            onChange?.(next)
        },
        [onChange]
    )

    useEffect(() => {
        let cancelled = false
        supabase
            .from("form_tags")
            .select("tag:tags ( name )")
            .eq("form_id", formId)
            .then(({ data }) => {
                if (cancelled) return
                if (data) {
                    applyTags(
                        data
                            .map((r) => (r.tag as unknown as { name: string } | null)?.name)
                            .filter((n): n is string => !!n)
                    )
                }
            })
        return () => {
            cancelled = true
        }
    }, [formId, applyTags])

    /** Hapus baris tag yang sudah tidak dirujuk form manapun. Pakai RPC
     * SECURITY DEFINER (delete_unused_tags) supaya DELETE ke tabel tags tidak
     * bisa diblokir RLS di sisi client; verifikasi referensi dilakukan di
     * database. Bila RPC belum diterapkan, fallback ke loop per-tag yang
     * best-effort (bila dibatasi RLS, PostgREST sukses tanpa menghapus apa pun). */
    const deleteOrphanTags = async (tagIds: (string | number)[]) => {
        const { error } = await supabase.rpc("delete_unused_tags", { p_tag_ids: tagIds.map(String) })
        if (!error) return
        if (!/PGRST202|could not find the function|schema cache/i.test(error.message)) {
            throw new Error("Gagal membersihkan tag yang tidak terpakai: " + error.message)
        }
        for (const tagId of tagIds) {
            const { count } = await supabase
                .from("form_tags")
                .select("tag_id", { count: "exact", head: true })
                .eq("tag_id", tagId)
            if ((count ?? 0) > 0) continue
            await supabase.from("tags").delete().eq("id", tagId)
        }
    }

    const addTag = useCallback(async () => {
        const value = tagInput.trim()
        if (!value) return
        const nextNames = [...new Set([...tags, value])]
        try {
            const { data, error } = await supabase.rpc("set_form_tags", {
                p_form_id: formId,
                p_tag_names: nextNames,
            })
            if (!error) {
                applyTags((data ?? []) as string[])
            } else if (/PGRST202|could not find the function|schema cache/i.test(error.message)) {
                showAlert("Fungsi set_form_tags belum tersedia. Periksa database.", "warning")
            } else {
                showAlert("Gagal menambahkan tag: " + error.message, "error")
            }
        } catch (err) {
            showAlert(err instanceof Error ? err.message : "Gagal menambahkan tag.", "error")
        }
        setTagInput("")
    }, [formId, tags, tagInput, applyTags])

    const removeTag = useCallback(
        async (name: string) => {
            const nextNames = tags.filter((t) => t !== name).map((t) => t.trim())
            try {
                // Satu panggilan RPC atomik: hapus relasi, bersihkan tag yatim,
                // kembalikan daftar aktual.
                const { data, error } = await supabase.rpc("set_form_tags", {
                    p_form_id: formId,
                    p_tag_names: nextNames,
                })
                if (!error) {
                    applyTags((data ?? []) as string[])
                    return
                }
                if (!/PGRST202|could not find the function|schema cache/i.test(error.message)) {
                    throw new Error("Gagal menghapus tag: " + error.message)
                }

                // Fallback lama — operasi langsung mungkin terblokir RLS.
                const { data: existing } = await supabase.from("tags").select("id").eq("name", name).maybeSingle()
                if (existing?.id) {
                    const { error: delErr } = await supabase.from("form_tags").delete().eq("form_id", formId).eq("tag_id", existing.id)
                    if (delErr) throw delErr
                    await deleteOrphanTags([existing.id])
                }
                // Ambil ulang dari DB sebagai source of truth.
                const { data: verifyRel } = await supabase
                    .from("form_tags")
                    .select("tag:tags ( name )")
                    .eq("form_id", formId)
                const verifiedTags = (verifyRel ?? [])
                    .map((r) => (r.tag as unknown as { name: string } | null)?.name)
                    .filter((n): n is string => !!n)
                if (verifiedTags.includes(name)) {
                    showAlert("Tag tidak bisa dihapus dari server. Periksa izin database.", "warning")
                }
            } catch (err) {
                showAlert(err instanceof Error ? err.message : "Gagal menghapus tag.", "error")
            }
        },
        [formId, tags, applyTags]
    )

    return (
        <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-darks mb-1.5">Tag</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="input flex-1 bg-base border-second focus:border-done focus:outline-none transition-colors"
                    placeholder="Form akan bisa ditemukan di beranda dengan memasukkan tag ini."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                        }
                    }}
                />
                <button type="button" onClick={addTag} className="btn bg-base text-darks border border-second hover:bg-second">
                    Tambah
                </button>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((t) => (
                        <span key={t} className="badge gap-1 py-3 rounded-full bg-done/10 text-done border-none">
                            @{t}
                            <button
                                type="button"
                                onClick={() => removeTag(t)}
                                className="hover:text-wrong transition-colors"
                                aria-label={`Hapus tag ${t}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <p className="text-xs text-tinted mt-2">
                Tag pertama dipakai sebagai link singkat form, contoh: <span className="font-medium text-darks">/form/CODEVERSE</span>.
            </p>
        </div>
    )
}