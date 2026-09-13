// Pembersihan file media di storage server ketika data dihapus dari aplikasi.
// URL media harus dikumpulkan SEBELUM baris database dihapus (supaya masih bisa
// di-query), lalu file yang di-host di storage dihapus setelah commit sukses.

import { supabase } from "./supabase"
import { deleteStoredMedia } from "./mediaStorage"

/**
 * Kumpulkan semua URL media milik sebuah form yang disimpan di storage server
 * (banner + media soal + gambar soal + media opsi). Panggil sebelum form
 * dihapus dari database.
 */
export async function collectFormMediaUrls(formId: string): Promise<(string | null | undefined)[]> {
    const urls: (string | null | undefined)[] = []

    // Banner header.
    const { data: form } = await supabase
        .from("forms")
        .select("media_url")
        .eq("id", formId)
        .maybeSingle()
    if (form) urls.push((form as { media_url?: string | null }).media_url)

    // Media & gambar setiap soal.
    const { data: qs } = await supabase
        .from("questions")
        .select("id, media_url, image_question")
        .eq("form_id", formId)
    const questions = (qs as { id: string; media_url?: string | null; image_question?: string | null }[] | null) ?? []
    for (const q of questions) urls.push(q.media_url, q.image_question)

    // Media opsi pilihan jawaban (kolom menyusul lewat migration — dilewati
    // dengan tenang kalau belum ada di database supaya tidak menggagalkan hapus).
    const ids = questions.map((q) => q.id)
    if (ids.length > 0) {
        const { data: opts, error } = await supabase
            .from("question_options")
            .select("media_url")
            .in("question_id", ids)
        if (!error && opts) {
            for (const o of opts as { media_url?: string | null }[]) urls.push(o.media_url)
        }
    }

    return urls
}

/**
 * Kumpulkan semua URL media milik sebuah soal. Panggil sebelum soal dihapus.
 */
export async function collectQuestionMediaUrls(questionId: string): Promise<(string | null | undefined)[]> {
    const urls: (string | null | undefined)[] = []

    const { data: q } = await supabase
        .from("questions")
        .select("media_url, image_question")
        .eq("id", questionId)
        .maybeSingle()
    if (q) {
        urls.push((q as { media_url?: string | null }).media_url)
        urls.push((q as { image_question?: string | null }).image_question)
    }

    const { data: opts, error } = await supabase
        .from("question_options")
        .select("media_url")
        .eq("question_id", questionId)
    if (!error && opts) {
        for (const o of opts as { media_url?: string | null }[]) urls.push(o.media_url)
    }

    return urls
}

/** Hapus media form dari storage — pakai setelah RPC delete_form sukses. */
export async function deleteFormMediaFromStorage(formId: string): Promise<void> {
    const urls = await collectFormMediaUrls(formId)
    await deleteStoredMedia(urls)
}

/** Hapus media soal dari storage — pakai setelah RPC delete_question sukses. */
export async function deleteQuestionMediaFromStorage(questionId: string): Promise<void> {
    const urls = await collectQuestionMediaUrls(questionId)
    await deleteStoredMedia(urls)
}