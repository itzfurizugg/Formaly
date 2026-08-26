// Enhancer media (iframe Quill) menjadi player dengan GUI overlay custom.
//
// Router per jenis media:
// - YouTube                -> video player ber-GUI (play/pause, waktu, auto-hide).
// - Drive video            -> wrapper 16:9 + bar play/pause via postMessage.
// - Drive audio (#media=audio)   -> kartu pemutar ramping; UI audio native Google
//                                   sudah menampilkan kontrol secara persisten.
// - Drive foto  (#media=photo)   -> <img> responsif dari thumbnail Drive + lightbox
//                                   klik-zoom; bila thumbnail gagal dimuat (file
//                                   privat), fallback ke iframe /preview.
//
// Saat video diputar, GUI YouTube otomatis tersembunyi setelah 5 detik; klik
// pada video akan menampilkan kembali GUI-nya.

import { buildDrivePreviewUrl, extractDriveFileId, extractDriveMediaKind } from "./driveEmbed"

let apiPromise: Promise<unknown> | null = null

function loadYouTubeApi(): Promise<unknown> {
    const w = window as unknown as { YT?: { Player?: unknown } }
    if (w.YT?.Player) return Promise.resolve()
    if (apiPromise) return apiPromise
    apiPromise = new Promise((resolve) => {
        const prev = (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady
        ;(window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => {
            prev?.()
            resolve((window as unknown as { YT?: unknown }).YT)
        }
        const script = document.createElement("script")
        script.src = "https://www.youtube.com/iframe_api"
        document.head.appendChild(script)
    })
    return apiPromise
}

function extractYouTubeId(src: string): string | null {
    const embed = src.match(/(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|v|shorts)\/([A-Za-z0-9_-]{11})/)
    if (embed) return embed[1]
    const watch = src.match(/[?&]v=([A-Za-z0-9_-]{11})/)
    if (watch) return watch[1]
    const short = src.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
    if (short) return short[1]
    return null
}

function fmtTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
}

const PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="video-player-icon"><path d="M8 5v14l11-7z"/></svg>'
const PAUSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="video-player-icon"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'

interface Enhancer {
    destroy: () => void
}

interface GuiElements {
    gui: HTMLDivElement
    centerBtn: HTMLButtonElement | null
    playBtn: HTMLButtonElement
    timeEl: HTMLElement
    setIcon: (playing: boolean) => void
}

/** Bangun overlay GUI yang dipakai bersama player YouTube & Drive.
 * gui memakai pointer-events:none sehingga klik di luar tombol jatuh ke elemen
 * di bawahnya (wrapper untuk YouTube, player native untuk Drive); hanya
 * tombol GUI yang dapat diklik. */
function buildGui(withCenterButton = true): GuiElements {
    const gui = document.createElement("div")
    gui.className = "video-player-gui"
    gui.style.cssText =
        "position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;background:linear-gradient(rgba(0,0,0,.25),transparent 35%,transparent 60%,rgba(0,0,0,.45));transition:opacity .3s ease;z-index:2;pointer-events:none"

    let centerBtn: HTMLButtonElement | null = null
    if (withCenterButton) {
        centerBtn = document.createElement("button")
        centerBtn.type = "button"
        centerBtn.className = "video-player-btn-center"
        centerBtn.setAttribute("aria-label", "Putar/Jeda")
        centerBtn.innerHTML = PLAY_SVG
        // Tombol dipusatkan presisi di tengah video lewat inset:0 + margin:auto
        // (bukan transform, supaya tidak bentrok dengan efek scale saat hover).
        centerBtn.style.cssText = "position:absolute;inset:0;margin:auto;pointer-events:auto"
        gui.appendChild(centerBtn)
    }

    const bar = document.createElement("div")
    bar.className = "video-player-bar"
    bar.innerHTML = `<button type="button" class="video-player-btn" aria-label="Putar/Jeda">${PLAY_SVG}</button><span class="video-player-time">0:00</span>`
    const playBtn = bar.querySelector<HTMLButtonElement>(".video-player-btn")!
    playBtn.style.pointerEvents = "auto"
    const timeEl = bar.querySelector<HTMLElement>(".video-player-time")!

    const setIcon = (playing: boolean) => {
        if (centerBtn) centerBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG
        playBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG
    }

    gui.appendChild(bar)
    return { gui, centerBtn, playBtn, timeEl, setIcon }
}

function createPlayer(iframe: HTMLIFrameElement, videoId: string): Enhancer | null {
    const wrapper = document.createElement("div")
    wrapper.className = "video-player"
    wrapper.style.cssText =
        "position:relative;width:100%;aspect-ratio:16/9;background:#000;margin:0.5em 0;overflow:hidden;cursor:pointer"

    const stage = document.createElement("div")
    stage.className = "video-player-stage"
    stage.style.cssText = "position:absolute;inset:0;pointer-events:none"

    const { gui, timeEl, setIcon } = buildGui()

    wrapper.appendChild(stage)
    wrapper.appendChild(gui)
    iframe.replaceWith(wrapper)

    let player: unknown = null
    let destroyed = false
    let hideTimer: number | null = null
    let timeInterval: number | null = null

    const getPlayer = () =>
        player as {
            getPlayerState?: () => number
            playVideo?: () => void
            pauseVideo?: () => void
            getCurrentTime?: () => number
            getDuration?: () => number
            getIframe?: () => HTMLIFrameElement | null
            destroy?: () => void
        } | null

    // Konstruktor YT.Player MENGGANTI elemen `stage` dengan iframe baru, sehingga
    // styling stage (position:absolute;inset:0) hilang dan iframe dirender pada
    // ukuran default 640x360 lalu terpotong oleh overflow:hidden. Iframe hasil
    // replace harus di-styling ulang agar mengisi wrapper sepenuhnya.
    const fitPlayerFrame = () => {
        const frame = getPlayer()?.getIframe?.()
        if (!frame) return
        frame.removeAttribute("width")
        frame.removeAttribute("height")
        frame.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none"
    }

    const updateTime = () => {
        const p = getPlayer()
        if (!p || destroyed) return
        const cur = Math.floor(p.getCurrentTime?.() ?? 0)
        const dur = Math.floor(p.getDuration?.() ?? 0)
        timeEl.textContent = dur ? `${fmtTime(cur)} / ${fmtTime(dur)}` : fmtTime(cur)
    }

    const showGui = () => {
        if (destroyed) return
        gui.style.opacity = "1"
        if (hideTimer) {
            window.clearTimeout(hideTimer)
            hideTimer = null
        }
        if (getPlayer()?.getPlayerState?.() === 1) scheduleHide()
    }

    const scheduleHide = () => {
        if (hideTimer) window.clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => {
            hideTimer = null
            const p = getPlayer()
            if (destroyed || !p || p.getPlayerState?.() !== 1) return
            gui.style.opacity = "0"
        }, 5000)
    }

    const togglePlay = () => {
        const p = getPlayer()
        if (!p) return
        if (p.getPlayerState?.() === 1) p.pauseVideo?.()
        else p.playVideo?.()
    }

    const onClick = (e: Event) => {
        const target = e.target as HTMLElement
        if (target.closest(".video-player-btn-center") || target.closest(".video-player-btn")) {
            togglePlay()
            return
        }
        showGui()
    }

    wrapper.addEventListener("click", onClick)

    loadYouTubeApi().then(() => {
        if (destroyed) return
        const w = window as unknown as {
            YT: {
                Player: new (
                    el: HTMLElement,
                    opts: {
                        videoId: string
                        playerVars: Record<string, unknown>
                        events: { onStateChange: (e: { data: number }) => void; onReady: () => void }
                    }
                ) => unknown
                PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
            }
        }
        const YT = w.YT

        player = new YT.Player(stage, {
            videoId,
            playerVars: {
                controls: 0,
                disablekb: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                iv_load_policy: 3,
            },
            events: {
                onReady: () => {
                    fitPlayerFrame()
                    updateTime()
                },
                onStateChange: (e) => {
                    const state = e.data
                    if (state === YT.PlayerState.PLAYING) {
                        setIcon(true)
                        scheduleHide()
                        timeInterval = window.setInterval(updateTime, 500)
                    } else {
                        setIcon(false)
                        showGui()
                        if (timeInterval) {
                            window.clearInterval(timeInterval)
                            timeInterval = null
                        }
                        updateTime()
                    }
                },
            },
        })

        // Segera setelah konstruksi (sebelum onReady) supaya tidak ada flash
        // iframe berukuran default.
        fitPlayerFrame()
    })

    return {
        destroy: () => {
            destroyed = true
            wrapper.removeEventListener("click", onClick)
            if (hideTimer) window.clearTimeout(hideTimer)
            if (timeInterval) window.clearInterval(timeInterval)
            const p = getPlayer()
            if (p && typeof p.destroy === "function") {
                try {
                    p.destroy()
                } catch {
                    // player belum siap; abaikan
                }
            }
            wrapper.replaceWith(iframe)
        },
    }
}

/** Bungkus iframe Google Drive video dalam wrapper 16:9. Ditambah GUI slim
 * dengan tombol play/pause yang mengirim perintah postMessage bergaya IFrame
 * API ke player Drive. Klik di luar tombol GUI diteruskan ke player native
 * Google sehingga kontrol bawaannya tetap berfungsi sebagai fallback. */
function createDriveFrame(iframe: HTMLIFrameElement, fileId: string): Enhancer {
    const originalSrc = iframe.getAttribute("src")
    const prevCssText = iframe.style.cssText

    const wrapper = document.createElement("div")
    wrapper.className = "video-player"
    wrapper.style.cssText =
        "position:relative;width:100%;aspect-ratio:16/9;background:#000;margin:0.5em 0;overflow:hidden;cursor:pointer"

    iframe.setAttribute("src", buildDrivePreviewUrl(fileId, "video"))
    iframe.setAttribute("allow", "autoplay; fullscreen")
    iframe.setAttribute("allowfullscreen", "")
    // Ukuran & posisi mengisi wrapper; pointer-events tetap aktif supaya
    // klik/kontrol native Google bisa jalan (beda dengan iframe YouTube).
    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0"

    // Tanpa tombol tengah: overlay play besar milik Drive ada persis di titik
    // yang sama, jadi cukup tombol slim di bar bawah.
    const { gui, playBtn, setIcon } = buildGui(false)

    wrapper.appendChild(iframe)
    wrapper.appendChild(gui)
    iframe.replaceWith(wrapper)

    // API tidak resmi namun sudah lama stabil: player /preview Drive memakai
    // infrastruktur yang sama dengan YouTube IFrame API sehingga merespons
    // perintah {"event":"command","func":...} lewat postMessage.
    const postCommand = (func: string) => {
        try {
            iframe.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func, args: [] }),
                "*"
            )
        } catch {
            // diabaikan; kontrol native Google tetap bisa dipakai
        }
    }

    let playing = false
    const togglePlay = () => {
        playing = !playing
        postCommand(playing ? "playVideo" : "pauseVideo")
        setIcon(playing)
    }

    const onBarClick = (e: Event) => {
        e.stopPropagation()
        togglePlay()
    }
    playBtn.addEventListener("click", onBarClick)

    return {
        destroy: () => {
            playBtn.removeEventListener("click", onBarClick)
            wrapper.replaceWith(iframe)
            if (originalSrc === null) iframe.removeAttribute("src")
            else iframe.setAttribute("src", originalSrc)
            iframe.style.cssText = prevCssText
        },
    }
}

/** Kartu pemutar audio Drive yang ramping: cukup tinggi ~4rem karena UI audio
 * native Google (/preview) sudah menampilkan kontrol play/seek secara
 * persisten — tanpa kotak hitam 16:9 yang boros ruang. */
function createDriveAudio(iframe: HTMLIFrameElement, fileId: string): Enhancer {
    const originalSrc = iframe.getAttribute("src")
    const prevCssText = iframe.style.cssText

    const wrapper = document.createElement("div")
    wrapper.className = "media-audio"
    wrapper.style.cssText =
        "position:relative;width:100%;height:4rem;margin:0.5em 0;background:#111418;border-radius:0.75rem;overflow:hidden"

    iframe.setAttribute("src", buildDrivePreviewUrl(fileId, "audio"))
    iframe.setAttribute("allow", "autoplay")
    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0"

    iframe.replaceWith(wrapper)
    wrapper.appendChild(iframe)

    return {
        destroy: () => {
            wrapper.replaceWith(iframe)
            if (originalSrc === null) iframe.removeAttribute("src")
            else iframe.setAttribute("src", originalSrc)
            iframe.style.cssText = prevCssText
        },
    }
}

/* ---- Foto: <img> thumbnail Drive + lightbox klik-zoom ---- */

const THUMBNAIL_BASE = "https://drive.google.com/thumbnail"

function driveThumbnailUrl(fileId: string, width: number): string {
    return `${THUMBNAIL_BASE}?id=${fileId}&sz=w${width}`
}

let lightboxEl: HTMLElement | null = null

function closePhotoLightbox() {
    lightboxEl?.remove()
    lightboxEl = null
    document.body.style.overflow = ""
}

/** Lightbox sederhana satu-instance: klik/Esc menutup, scroll body dikunci. */
function openPhotoLightbox(src: string) {
    closePhotoLightbox()

    const overlay = document.createElement("div")
    overlay.className = "media-lightbox"
    overlay.setAttribute("role", "dialog")
    overlay.setAttribute("aria-label", "Pratinjau gambar")

    const img = document.createElement("img")
    img.src = src
    img.alt = ""
    overlay.appendChild(img)

    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closePhotoLightbox()
    }
    overlay.addEventListener("click", closePhotoLightbox)
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"

    document.body.appendChild(overlay)
    lightboxEl = overlay
}

/** Tampilkan lampiran Drive bertanda #media=photo sebagai gambar sungguhan
 * (<img>, bukan iframe). Klik membuka lightbox versi lebih besar. Bila
 * thumbnail gagal dimuat (file privat/bukan gambar), fallback ke iframe
 * /preview agar UI "request access"/viewer Google tetap muncul. */
function createDrivePhoto(iframe: HTMLIFrameElement, fileId: string): Enhancer {
    const originalSrc = iframe.getAttribute("src")
    const prevCssText = iframe.style.cssText
    let cancelled = false

    const fig = document.createElement("figure")
    fig.className = "media-photo"

    const img = document.createElement("img")
    img.alt = "Lampiran gambar"
    img.loading = "lazy"
    img.src = driveThumbnailUrl(fileId, 1600)

    // Fallback: tukar isi figure menjadi iframe /preview berukuran 16:9.
    const usePreviewFallback = () => {
        if (cancelled) return
        img.remove()
        fig.classList.add("media-photo-fallback")
        fig.style.cursor = ""
        iframe.setAttribute("src", buildDrivePreviewUrl(fileId, "photo"))
        iframe.setAttribute("allow", "autoplay; fullscreen")
        iframe.setAttribute("allowfullscreen", "")
        iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0"
        fig.appendChild(iframe)
    }

    img.addEventListener("error", usePreviewFallback)

    const onFigClick = () => {
        if (!img.isConnected) return
        openPhotoLightbox(driveThumbnailUrl(fileId, 2200))
    }
    fig.addEventListener("click", onFigClick)

    iframe.replaceWith(fig)
    fig.appendChild(img)

    return {
        destroy: () => {
            cancelled = true
            img.removeEventListener("error", usePreviewFallback)
            fig.removeEventListener("click", onFigClick)
            // Jika fallback aktif, iframe ada di dalam fig dan otomatis ikut
            // terlepas saat fig ditukar kembali.
            fig.replaceWith(iframe)
            if (originalSrc === null) iframe.removeAttribute("src")
            else iframe.setAttribute("src", originalSrc)
            iframe.style.cssText = prevCssText
        },
    }
}

/** Tingkatkan semua iframe media di dalam root:
 * YouTube -> video GUI, Drive -> dipilih sesuai penanda jenis media
 * (#media=audio / #media=photo; tanpa penanda = video). Provider lain tidak
 * disentuh. */
export function enhanceMediaIframes(root: HTMLElement): Enhancer {
    const destroyFns: (() => void)[] = []
    root.querySelectorAll<HTMLIFrameElement>("iframe.ql-video").forEach((iframe) => {
        const src = iframe.getAttribute("src") || ""

        const ytId = extractYouTubeId(src)
        if (ytId) {
            const enhancer = createPlayer(iframe, ytId)
            if (enhancer) destroyFns.push(enhancer.destroy)
            return
        }

        const driveId = extractDriveFileId(src)
        if (!driveId) return

        switch (extractDriveMediaKind(src)) {
            case "audio":
                destroyFns.push(createDriveAudio(iframe, driveId).destroy)
                break
            case "photo":
                destroyFns.push(createDrivePhoto(iframe, driveId).destroy)
                break
            default:
                destroyFns.push(createDriveFrame(iframe, driveId).destroy)
        }
    })
    return { destroy: () => destroyFns.forEach((fn) => fn()) }
}
