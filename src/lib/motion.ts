import type { Variants } from "motion/react"

// Kurva easing konsisten dengan Navbar/CreatorSidebar/Home (Framer Motion).
export const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Entri halaman/konten: fade + slide atas (pola Home.tsx).
export const fadeSlide: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOutExpo } },
}

// Container list dengan stagger ringan antar item.
export const listContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}

// Item list individual (dipakai bersama listContainer).
export const listItem: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutExpo } },
}

// Backdrop modal: fade.
export const modalBackdrop: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
}

// Panel modal: scale + fade (buka/tutup).
export const modalPanel: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOutExpo } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } },
}

// Alert/error pop-in singkat.
export const alertPop: Variants = {
    hidden: { opacity: 0, y: -6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
}

// Panel/editor yang muncul di dalam halaman (bukan modal).
export const panelSlide: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutExpo } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
}
