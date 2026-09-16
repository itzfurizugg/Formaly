import { supabase } from "./supabase"

export const LAYOUT_QUIZ = "single_question_per_page" as const
export const LAYOUT_STANDARD = "multiple_questions_per_page" as const

export type FormLayoutMode = typeof LAYOUT_QUIZ | typeof LAYOUT_STANDARD

export function isQuizMode(mode: string | null | undefined): boolean {
    return mode !== LAYOUT_STANDARD
}

export function isStandardMode(mode: string | null | undefined): boolean {
    return mode === LAYOUT_STANDARD
}

export interface FormPage {
    id: string
    form_id: string
    title: string
    position: number
    created_at: string
    updated_at: string
}

export interface FormPageWithQuestions extends FormPage {
    questions: Question[]
}

/** Minimal question shape needed inside a page. */
export interface Question {
    id: string
    form_id: string
    question_text: string
    question_type: string
    score_value: number
    order_index: number
    image_question: string | null
    media_url: string | null
    is_required: boolean
    page_id: string | null
    question_options: {
        id: string
        option_text: string
        is_correct: boolean
        order_index: number
        media_url?: string | null
    }[]
}

const QUESTION_SELECT = `
    id, form_id, question_text, question_type, score_value, order_index,
    image_question, media_url, is_required, page_id,
    question_options ( id, option_text, is_correct, order_index )
`

/** Fetch all pages for a form with their questions nested, ordered. */
export async function fetchPagesWithQuestions(formId: string): Promise<FormPageWithQuestions[]> {
    const { data: pages, error: pageErr } = await supabase
        .from("form_pages")
        .select("*")
        .eq("form_id", formId)
        .order("position", { ascending: true })

    if (pageErr || !pages) return []

    const { data: questions } = await supabase
        .from("questions")
        .select(QUESTION_SELECT)
        .eq("form_id", formId)
        .order("order_index", { ascending: true })

    const qs = (questions ?? []) as unknown as Question[]
    const byPage = new Map<string, Question[]>()
    for (const q of qs) {
        if (q.page_id) {
            if (!byPage.has(q.page_id)) byPage.set(q.page_id, [])
            byPage.get(q.page_id)!.push(q)
        }
    }

    return (pages as FormPage[]).map((p) => ({
        ...p,
        questions: byPage.get(p.id) ?? [],
    }))
}

/** Fetch form layout_mode. Returns null on error. */
export async function fetchFormLayout(formId: string): Promise<string | null> {
    const { data } = await supabase
        .from("forms")
        .select("layout_mode")
        .eq("id", formId)
        .single()
    return (data as { layout_mode?: string } | null)?.layout_mode ?? null
}

/** Create a new page (section). Returns the new page id. */
export async function createPage(formId: string, title: string, position: number): Promise<string | null> {
    const { data, error } = await supabase
        .from("form_pages")
        .insert({ form_id: formId, title, position })
        .select("id")
        .single()
    if (error || !data) return null
    return data.id
}

/** Rename a page. */
export async function renamePage(pageId: string, title: string): Promise<boolean> {
    const { error } = await supabase
        .from("form_pages")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", pageId)
    return !error
}

/** Delete a page. Returns false on error. */
export async function deletePage(pageId: string): Promise<boolean> {
    const { error } = await supabase
        .from("form_pages")
        .delete()
        .eq("id", pageId)
    return !error
}

/** Move a question to a different page and set its order_index. */
export async function moveQuestionToPage(
    questionId: string,
    targetPageId: string,
    orderIndex: number,
): Promise<boolean> {
    const { error } = await supabase
        .from("questions")
        .update({ page_id: targetPageId, order_index: orderIndex })
        .eq("id", questionId)
    return !error
}

/** Reorder questions within a page by setting sequential order_index values. */
export async function reorderQuestions(questionIds: string[]): Promise<boolean> {
    let failed = false
    for (let i = 0; i < questionIds.length; i++) {
        const { error } = await supabase
            .from("questions")
            .update({ order_index: i })
            .eq("id", questionIds[i])
        if (error) failed = true
    }
    return !failed
}

/**
 * When switching from standard → quiz: split each question into its own page.
 * Creates a page per question (title "Halaman N") and sets page_id.
 */
export async function migrateToQuiz(formId: string): Promise<void> {
    const pages = await fetchPagesWithQuestions(formId)
    let position = 0
    for (const page of pages) {
        for (const q of page.questions) {
            const newPageId = await createPage(formId, `Halaman ${position + 1}`, position)
            if (newPageId) {
                await supabase
                    .from("questions")
                    .update({ page_id: newPageId, order_index: 0 })
                    .eq("id", q.id)
            }
            position++
        }
    }
    // Delete old pages that are now empty
    for (const page of pages) {
        await deletePage(page.id)
    }
}

/**
 * When switching from quiz → standard: merge all questions into one page.
 * Creates a single page "Bagian 1" with all questions ordered sequentially.
 */
export async function migrateToStandard(formId: string): Promise<void> {
    const pages = await fetchPagesWithQuestions(formId)
    // Collect all questions in page order, then question order
    const allQuestions: { id: string }[] = []
    for (const page of pages) {
        for (const q of page.questions) {
            allQuestions.push({ id: q.id })
        }
    }
    // Create single page
    const newPageId = await createPage(formId, "Bagian 1", 0)
    if (!newPageId) return
    // Assign all questions
    for (let i = 0; i < allQuestions.length; i++) {
        await supabase
            .from("questions")
            .update({ page_id: newPageId, order_index: i })
            .eq("id", allQuestions[i].id)
    }
    // Delete old pages
    for (const page of pages) {
        if (page.id !== newPageId) {
            await deletePage(page.id)
        }
    }
}

/** Default section title based on position. */
export function defaultPageTitle(position: number, mode: string | null | undefined): string {
    if (isQuizMode(mode)) return `Halaman ${position + 1}`
    return `Bagian ${position + 1}`
}
