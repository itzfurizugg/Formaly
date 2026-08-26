// Enhancer video YouTube (iframe Quill) menjadi player dengan GUI overlay
// custom. Saat video diputar, GUI otomatis tersembunyi setelah 5 detik; klik
// pada video akan menampilkan kembali GUI-nya.
// Video Google Drive tidak memiliki API kontrol resmi seperti YouTube, jadi
// cukup dinormalisasi ke URL /preview dan dibungkus wrapper 16:9 responsif
// dengan player native Google (kontrol bawaannya).

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

/** Ambil ID file dari berbagai bentuk link Google Drive
 * (/file/d/ID, open?id=ID, uc?id=ID, atau sudah /preview). */
function extractDriveId(src: string): string | null {
    const file = src.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/)
    if (file) return file[1]
    const param = src.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
    if (param) return param[1]
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

function createPlayer(iframe: HTMLIFrameElement, videoId: string): Enhancer | null {
    const wrapper = document.createElement("div")
    wrapper.className = "video-player"
    wrapper.style.cssText =
        "position:relative;width:100%;aspect-ratio:16/9;background:#000;margin:0.5em 0;overflow:hidden;cursor:pointer"

    const stage = document.createElement("div")
    stage.className = "video-player-stage"
    stage.style.cssText = "position:absolute;inset:0;pointer-events:none"

    const gui = document.createElement("div")
    gui.className = "video-player-gui"
    gui.style.cssText =
        "position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;background:linear-gradient(rgba(0,0,0,.25),transparent 35%,transparent 60%,rgba(0,0,0,.45));transition:opacity .3s ease;z-index:2"

    const centerBtn = document.createElement("button")
    centerBtn.type = "button"
    centerBtn.className = "video-player-btn-center"
    centerBtn.setAttribute("aria-label", "Putar/Jeda")
    centerBtn.innerHTML = PLAY_SVG
    // Tombol dipusatkan presisi di tengah video lewat inset:0 + margin:auto
    // (bukan transform, supaya tidak bentrok dengan efek scale saat hover).
    centerBtn.style.cssText = "position:absolute;inset:0;margin:auto"

    const bar = document.createElement("div")
    bar.className = "video-player-bar"
    bar.innerHTML = `<button type="button" class="video-player-btn" aria-label="Putar/Jeda">${PLAY_SVG}</button><span class="video-player-time">0:00</span>`

    gui.appendChild(centerBtn)
    gui.appendChild(bar)
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

    const setIcon = (playing: boolean) => {
        centerBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG
        const btn = bar.querySelector<HTMLElement>(".video-player-btn")
        if (btn) btn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG
    }

    const updateTime = () => {
        const p = getPlayer()
        if (!p || destroyed) return
        const cur = Math.floor(p.getCurrentTime?.() ?? 0)
        const dur = Math.floor(p.getDuration?.() ?? 0)
        const el = bar.querySelector<HTMLElement>(".video-player-time")
        if (el) el.textContent = dur ? `${fmtTime(cur)} / ${fmtTime(dur)}` : fmtTime(cur)
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

/** Bungkus iframe Google Drive dalam wrapper 16:9 dan normalisasi src ke
 * /preview (URL /view ditolak saat di-embed). Player native Drive yang
 * menangani pemutaran — GUI custom hanya untuk YouTube. */
function createDriveFrame(iframe: HTMLIFrameElement, fileId: string): Enhancer {
    const originalSrc = iframe.getAttribute("src")
    const prevCssText = iframe.style.cssText

    const wrapper = document.createElement("div")
    wrapper.className = "video-player"
    wrapper.style.cssText =
        "position:relative;width:100%;aspect-ratio:16/9;background:#000;margin:0.5em 0;overflow:hidden"

    iframe.setAttribute("src", `https://drive.google.com/file/d/${fileId}/preview`)
    iframe.setAttribute("allow", "autoplay; fullscreen")
    iframe.setAttribute("allowfullscreen", "")
    // Ukuran & posisi mengisi wrapper; pointer-events tetap aktif supaya
    // kontrol bawaan Google bisa diklik (beda dengan iframe YouTube).
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

/** Tingkatkan semua iframe video YouTube di dalam root menjadi player ber-GUI.
 * Iframe Google Drive ikut dibungkus agar tampil penuh 16:9 dengan /preview. */
export function enhanceVideoIframes(root: HTMLElement): Enhancer {
    const destroyFns: (() => void)[] = []
    root.querySelectorAll<HTMLIFrameElement>("iframe.ql-video").forEach((iframe) => {
        const src = iframe.getAttribute("src") || ""
        const ytId = extractYouTubeId(src)
        if (ytId) {
            const enhancer = createPlayer(iframe, ytId)
            if (enhancer) destroyFns.push(enhancer.destroy)
            return
        }
        const driveId = extractDriveId(src)
        if (driveId) destroyFns.push(createDriveFrame(iframe, driveId).destroy)
    })
    return { destroy: () => destroyFns.forEach((fn) => fn()) }
}
