import { createPortal } from "react-dom"
import type { ReactNode } from "react"

// Render modal lewat portal ke document.body supaya lepas dari stacking context
// halaman (animate-page-enter). Dengan begitu backdrop bisa menutupi navbar
// (z-50) sehingga navbar ikut dimmed saat modal terbuka.
function ModalPortal({ children }: { children: ReactNode }) {
    return createPortal(
        <div className="fixed inset-0 z-[80]">{children}</div>,
        document.body
    )
}

export default ModalPortal
