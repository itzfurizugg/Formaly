import { supabase } from "./supabase"

/**
 * Memulai pengerjaan form lewat RPC start_form_submission.
 *
 * - Kalau forms.requires_token = true, wajib menyertakan tokenCode;
 *   pesan kegagalan (token salah/kedaluwarsa/kuota habis) berasal dari
 *   Postgres RAISE EXCEPTION dan dilempar apa adanya ke pemanggil.
 * - Berhasil → mengembalikan submission_id yang wajib dibawa ke halaman
 *   pengerjaan (baris submission dibuat berstatus IN_PROGRESS).
 */
export async function startFormSubmission(formId: string, tokenCode?: string): Promise<string> {
    const params =
        tokenCode !== undefined
            ? { p_form_id: formId, p_token_code: tokenCode }
            : { p_form_id: formId }

    const { data, error } = await supabase.rpc("start_form_submission", params)
    if (error) throw new Error(error.message)
    return data as string
}
