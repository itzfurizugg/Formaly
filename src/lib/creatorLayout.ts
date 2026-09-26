import { easeOutExpo } from "./motion"

// Lebar sidebar desktop = ruang kompensasi konten, jadi keduanya wajib ambil
// nilai yang sama. Dipakai CreatorSidebar (lebar) dan CreatorLayout (padding).
export const CREATOR_SIDEBAR_WIDTH = "19.5vw"

// Durasi + easing slide sidebar, dipakai bersama oleh sidebar dan padding konten
// supaya keduanya bergerak sinkron (tidak meleset 50ms seperti sebelumnya).
export const CREATOR_SIDEBAR_MOTION = {
    duration: 0.45,
    ease: easeOutExpo,
} as const
