# Animasi — Panduan Umum (Formaly)

Panduan prinsip animasi yang berlaku untuk **animasi apa pun** di project ini — bukan katalog animasi yang sudah ada, tapi aturan yang dipakai setiap kali menambahkan animasi baru, di komponen/halaman apa pun, untuk tujuan apa pun (reveal saat load, transisi antar state, hover, modal, dsb).

## Prinsip inti

1. **Fade + translate sebagai default masuk** — elemen yang muncul dimulai dari `opacity: 0` dan sedikit offset posisi (`y: 12–16`, atau `x` kalau arah masuknya horizontal), lalu ke posisi/opacity akhir. Ini default netral yang cocok untuk hampir semua kasus reveal.
2. **Satu easing, dipakai di mana pun** — `easeOutExpo` (`[0.22, 1, 0.36, 1]`), didefinisikan sekali di `lib/motion.ts`, diimpor di mana pun dibutuhkan. Jangan hardcode array bezier baru di komponen — kalau merasa butuh easing lain, itu tanda untuk didiskusikan dulu, bukan ditulis diam-diam di satu file.
3. **Stagger untuk grup, bukan serentak** — kalau lebih dari satu elemen animasi berjalan bersamaan (list, beberapa blok teks, beberapa card), beri jeda kecil antar elemen supaya terasa berurutan, bukan semua "meledak" di waktu yang sama.
4. **Prioritaskan `transform`/`opacity`** — properti ini dijalankan compositor, tidak memicu reflow. Kalau animasi terpaksa menyentuh properti layout (`width`, `padding`, `height`, dst) karena efeknya memang butuh itu (misal elemen lain perlu ikut menyesuaikan ruang), batasi ke elemen sesedikit mungkin, durasi singkat, dan jangan berulang tanpa perlu.
5. **Animasi berjalan sesuai konteks munculnya, bukan lebih sering dari itu** — reveal-on-mount harus benar-benar hanya jalan saat elemen itu pertama kali relevan untuk dilihat, bukan terpicu ulang oleh hal lain yang tidak terkait (remount komponen, re-render yang tidak berhubungan, dsb). Kalau ada risiko itu, pastikan ada penanda (flag/state) yang mencegah animasi re-trigger secara tidak sengaja.
6. **Hormati reduced motion** — untuk animasi yang bukan sekadar micro-interaction kecil, cek preferensi `prefers-reduced-motion` user; kalau aktif, animasi jadi instan (durasi `0`) alih-alih dipaksa jalan penuh.

## Skala durasi (pilih sesuai ukuran/pentingnya elemen)

| Skala elemen | Durasi | Kapan dipakai |
|---|---|---|
| Kecil (item list, ikon, badge) | `0.2s–0.35s` | Reveal per-item dalam grup, micro-interaction |
| Sedang (card, section block) | `0.35s–0.45s` | Reveal blok konten, transisi antar state |
| Besar (hero, layout shift, sidebar+konten) | `0.45s` | Elemen dominan di layar, atau animasi yang melibatkan lebih dari satu elemen tersinkron |

Easing tetap sama (`easeOutExpo`) di semua skala kecuali ada alasan spesifik untuk beda (misal overlay/backdrop yang biasanya cukup `easeOut` bawaan karena cuma fade sederhana, bukan reveal berarah).

## Pola stagger — pilih sesuai kebutuhan

**Delay manual per-index** (kontrol lebih spesifik, cocok kalau butuh cap/logika delay khusus):

```tsx
transition={{ duration: 0.35, ease: easeOutExpo, delay: Math.min(index * 0.06, 0.4) }}
```

- `step` (`0.06–0.08`) disesuaikan densitas elemen — makin rapat elemennya, makin kecil step-nya.
- Selalu di-**cap** (`Math.min(..., batas)`) supaya list panjang tidak membuat elemen terakhir baru muncul lama setelah yang pertama.

**Container variants + `staggerChildren`** (lebih bersih kalau semua child identik):

```tsx
const groupReveal: Variants = {
    hidden: {},
    show: { transition: { delayChildren: 0.1, staggerChildren: 0.05 } },
}
const childReveal: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutExpo } },
}
```

Gunakan yang mana pun lebih pas dengan struktur data — keduanya menghasilkan efek visual yang setara.

## Animasi yang melibatkan lebih dari satu elemen tersinkron

Kalau satu animasi butuh dua (atau lebih) elemen bergerak "sebagai satu kesatuan" (contoh: elemen yang slide masuk sambil elemen lain menyesuaikan ruang untuknya):

- Elemen yang murni bergerak posisi → pakai `transform`.
- Elemen yang perlu ikut menyesuaikan (ruang, ukuran) → boleh animasikan properti layout, tapi **durasi & easing harus identik** dengan elemen pemicunya, supaya terasa satu gerakan, bukan dua animasi terpisah yang kebetulan bersamaan.
- Urutan detail sekunder (misal isi/label di dalam elemen yang bergerak) idealnya muncul **setelah** gerakan utama mendarat (pakai `delayChildren`), bukan bersamaan — supaya ada urutan visual yang natural: elemen besar dulu, detail kecil menyusul.

## Mencegah animasi re-trigger yang tidak diinginkan

Kalau sebuah komponen bisa di-remount berulang kali (misal karena parent membungkus route dengan key yang berubah, atau kondisi render yang sering reset), tapi animasinya secara pengalaman pengguna harus tetap terasa "sekali saja":

```tsx
let hasRevealed = false // scope modul, bertahan lintas remount komponen
// di dalam komponen:
useEffect(() => { hasRevealed = true }, [])
```

```tsx
initial={hasRevealed ? false : { ...startState }}
```

Pakai flag semacam ini kapan pun ada risiko animasi reveal terpicu ulang padahal seharusnya cuma sekali per sesi pemakaian.

## Checklist sebelum menambahkan animasi baru

1. Ini reveal elemen tunggal, grup/list, atau animasi tersinkron antar elemen? → pilih pola yang sesuai di atas.
2. Durasinya sudah sesuai skala elemen (kecil/sedang/besar)?
3. Easing-nya `easeOutExpo` dari `lib/motion.ts` — bukan bezier baru yang di-hardcode?
4. Kalau ada stagger, delay-nya di-cap supaya tidak jadi lambat di elemen terakhir?
5. Kalau animasi memicu layout (bukan cuma transform/opacity), sudah dibatasi ke elemen sesedikit mungkin dan tidak berjalan berulang tanpa perlu?
6. Kalau komponennya berpotensi remount berulang, sudah ada penanda supaya reveal tidak terpicu ulang?
7. Reduced motion sudah dihormati untuk animasi yang bukan micro-interaction kecil?