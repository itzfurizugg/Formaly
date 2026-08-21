import { createElement, useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Toaster, toast } from "sonner"

type AlertType = "success" | "error" | "info"

const toastClasses = {
    base: "!rounded-xl !border !border-second !bg-white !font-sans !text-darks !shadow-lg",
    success: "!border-done/30",
    error: "!border-wrong/30",
    info: "!border-second",
}

/** Toaster global Formaly. Render sekali di root aplikasi. */
export function AlertToaster() {
    return createElement(Toaster, {
        position: "top-center",
        toastOptions: {
            duration: 3500,
            classNames: {
                toast: toastClasses.base,
                title: "!font-sans !text-sm !text-darks",
                description: "!font-sans !text-sm !text-tinted",
                closeButton: "!rounded-xl !border-second !text-tinted hover:!text-darks",
            },
        },
    })
}

/** Menampilkan notifikasi singkat yang konsisten di seluruh aplikasi. */
export function showAlert(message: string, type: AlertType = "info") {
    return toast(message, {
        classNames: { toast: `${toastClasses.base} ${toastClasses[type]}` },
    })
}

export function alertSaveSuccess(message = "Perubahan berhasil disimpan.") {
    return showAlert(message, "success")
}

export function alertSaveError(errorMessage: string) {
    return showAlert(errorMessage || "Gagal menyimpan perubahan.", "error")
}

type ConfirmDeleteOptions = {
    title: string
    description: string
    onConfirm: () => Promise<void> | void
}

let activeDialog: { close: () => void } | null = null

function DeleteDialog({ options, onClose }: { options: ConfirmDeleteOptions; onClose: () => void }) {
    const [isDeleting, setIsDeleting] = useState(false)
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null
        document.getElementById("delete-dialog-cancel")?.focus()

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isDeleting) {
                onClose()
                return
            }
            if (event.key !== "Tab") return

            const focusable = document.getElementById("delete-dialog")?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
            if (!focusable?.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            previouslyFocused?.focus()
        }
    }, [isDeleting, onClose])

    const handleConfirm = async () => {
        setIsDeleting(true)
        try {
            await options.onConfirm()
            showAlert("Data berhasil dihapus.", "success")
            onClose()
        } catch (error) {
            showAlert(error instanceof Error ? error.message : "Gagal menghapus data.", "error")
            setIsDeleting(false)
        }
    }

    return createElement(
        "div",
        { className: "fixed inset-0 z-[100] flex items-center justify-center bg-darks/45 p-4" },
        createElement(
            "div",
            {
                id: "delete-dialog",
                role: "alertdialog",
                "aria-modal": true,
                "aria-labelledby": "delete-dialog-title",
                "aria-describedby": "delete-dialog-description",
                className: "w-full max-w-md rounded-xl border border-second bg-white p-6 font-sans shadow-xl",
            },
            createElement("h2", { id: "delete-dialog-title", className: "text-lg font-semibold text-darks" }, options.title),
            createElement("p", { id: "delete-dialog-description", className: "mt-2 text-sm leading-relaxed text-tinted" }, options.description),
            createElement(
                "div",
                { className: "mt-6 flex justify-end gap-3" },
                createElement(
                    "button",
                    {
                        id: "delete-dialog-cancel",
                        type: "button",
                        onClick: onClose,
                        disabled: isDeleting,
                        className: "btn rounded-xl border border-second bg-base text-darks hover:bg-second disabled:opacity-60",
                    },
                    "Batal"
                ),
                createElement(
                    "button",
                    {
                        type: "button",
                        onClick: handleConfirm,
                        disabled: isDeleting,
                        className: "btn rounded-xl border border-wrong bg-wrong text-base hover:bg-wrong/90 disabled:opacity-60",
                    },
                    isDeleting ? "Menghapus..." : "Hapus"
                )
            )
        )
    )
}

/** Membuka dialog konfirmasi penghapusan yang blocking dan dapat diakses keyboard. */
export function confirmDelete(options: ConfirmDeleteOptions) {
    activeDialog?.close()

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    let closed = false

    const close = () => {
        if (closed) return
        closed = true
        activeDialog = null
        root.unmount()
        container.remove()
    }

    activeDialog = { close }
    root.render(createElement(DeleteDialog, { options, onClose: close }))
}

type PromptTextOptions = {
    title: string
    description?: string
    placeholder?: string
    defaultValue?: string
    confirmLabel?: string
    cancelLabel?: string
}

function PromptDialog({ options, onClose }: { options: PromptTextOptions; onClose: (value: string | null) => void }) {
    const [value, setValue] = useState(options.defaultValue ?? "")

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null
        document.getElementById("prompt-dialog-input")?.focus()

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose(null)
                return
            }
            if (event.key === "Enter") {
                onClose(value)
            }
        }

        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            previouslyFocused?.focus()
        }
    }, [value, onClose])

    return createElement(
        "div",
        { className: "formaly-dialog fixed inset-0 z-[100] flex items-center justify-center bg-darks/45 p-4" },
        createElement(
            "div",
            {
                role: "alertdialog",
                "aria-modal": true,
                "aria-labelledby": "prompt-dialog-title",
                className: "w-full max-w-md rounded-xl border border-second bg-white p-6 font-sans shadow-xl",
            },
            createElement("h2", { id: "prompt-dialog-title", className: "text-lg font-semibold text-darks" }, options.title),
            options.description
                ? createElement("p", { className: "mt-2 text-sm leading-relaxed text-tinted" }, options.description)
                : null,
            createElement("input", {
                id: "prompt-dialog-input",
                type: "text",
                value,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
                placeholder: options.placeholder ?? "",
                className: "input mt-4 w-full rounded-xl border border-second bg-base text-darks focus:border-done focus:outline-none",
            }),
            createElement(
                "div",
                { className: "mt-6 flex justify-end gap-3" },
                createElement(
                    "button",
                    { type: "button", onClick: () => onClose(null), className: "btn rounded-xl border border-second bg-base text-darks hover:bg-second" },
                    options.cancelLabel ?? "Batal"
                ),
                createElement(
                    "button",
                    { type: "button", onClick: () => onClose(value), className: "btn rounded-xl border-none bg-darks text-base hover:opacity-90" },
                    options.confirmLabel ?? "OK"
                )
            )
        )
    )
}

/** Membuka dialog input teks yang blocking (pengganti window.prompt) dengan gaya Formaly. */
export function promptText(options: PromptTextOptions): Promise<string | null> {
    return new Promise((resolve) => {
        const container = document.createElement("div")
        document.body.appendChild(container)
        const root: Root = createRoot(container)

        const close = (value: string | null) => {
            root.unmount()
            container.remove()
            resolve(value)
        }

        root.render(createElement(PromptDialog, { options, onClose: close }))
    })
}
