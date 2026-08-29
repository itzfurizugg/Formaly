# Analisa: Kenapa Muncul Lebih dari Satu Loading Indicator Saat First Load / Refresh

> Analisa murni — tidak ada perubahan kode. Tujuan: memahami urutan render loading indicator dari root sampai dashboard sebelum memutuskan langkah perbaikan.

## 1. Daftar Loading Indicator yang Ketemu

| # | Komponen | File | Trigger | Jenis |
|---|----------|------|---------|-------|
| A | `AppSplash` (memakai `LinearProgress`) | `src/components/AppSplash.tsx`, dirender di `src/App.tsx:86` | `authLoading === true` dari `useAuth()` (window `getSession()`) | **Gating penuh**: `if (authLoading) return <AppSplash />` → Routes & semua halaman belum di-mount |
| B | `LoadingPage` | `src/App.tsx:118` (`<Suspense fallback={...}>`) | Setiap lazy chunk yang suspend. SEMUA halaman di `App.tsx` diimpor dengan `lazy()` | Gating render konten, tetapi **hanya area konten**; Navbar/CreatorSidebar/Dock di luar Suspense tetap mounted |
| C | `LoadingPage label="Memeriksa akses..."` | `src/pages/creator/guard.tsx:52` | `allowed === false` saat query role berjalan (role belum di-cache) | Gating inline (mengganti children) |
| D | `LinearProgress` | `src/pages/creator/dashboard.tsx:174` | `loading === true` lokal (no cache) saat fetch stats | Gating inline (mengganti isi halaman) |
| E | `Loading` (spinner 8-blade, show-delay 250ms / min 1s / fade) | `src/components/loading.tsx` | dipakai di `formEdit.tsx:356` & `formSettings.tsx:201` saja | Overlay `fixed inset-0 z-50` |

Untuk rute `/creator`: yang aktif adalah **A, B, C, D** (5–6 momen, lihat bagian 2). `E` tidak ada di jalur dashboard.

## 2. Urutan Render Aktual Saat First Load / Refresh di `/creator`

**Poin kunci: `pageCache` adalah `Map` in-memory (`src/lib/pageCache.ts:4`) → hilang saat refresh.** Jadi refresh = semua cache kosong = semua loading state ikut terpicu.

1. **A — AppSplash** `authLoading=true` (satu-satunya yang dirender; sidebar/nav belum keluar).
2. **B — Suspense `LoadingPage`** `getSession()` selesai → `authLoading=false` → AppShell render penuh. Rute `/creator` cocok dgn `CreatorLayout` yang **`lazy()`** → suspend → fallback. Keluarannya: sidebar (langsung render, bukan lazy) **+** bar loading di area konten.
3. **B lagi — Suspense `LoadingPage`** chunk `CreatorLayout` selesai → `<Outlet/>` merender `CreatorGuard` yang **`lazy()`** → suspend lagi.
4. **C — guard `LoadingPage "Memeriksa akses..."`** chunk guard selesai → mount: `cachedRole` kosong (refresh) → `allowed=false` → render LoadingPage sambil query role. Bersamaan `preload()` mulai unduh chunk dashboard.
5. **B lagi (bergantung balapan)** — saat `allowed=true`, anaknya `CreatorDashboard` **`lazy()`**; kalau chunk-nya belum selesai diunduh, Suspense fallback muncul lagi sebelum dashboard mount.
6. **D — dashboard `LinearProgress`** dashboard mount → `cached` kosong → `loading=true` → bar "Memuat..." muncul sambil fetch stats/submission.
7. Bar hilang, konten tampil.

**Total di refresh: 5–6 bar berurutan.** Untuk `/` (home): hanya A → B → home mount = 2 bar.

## 3. Titik Penyebab Ganda — Root Cause

**RC-1 — Berlapisnya `lazy()` pada satu rute → banyak suspend walaupun satu halaman.** `/creator` melewati 3 chunk terpisah berurutan: `CreatorLayout` → `CreatorGuard` → `CreatorDashboard`. Satu boundary `Suspense` di `App.tsx:118` menampilkan `LoadingPage` **setiap kali** menyusul suspend (momen 2, 3, 5). Inilah biang "loading muncul, hilang, muncul lagi".

**RC-2 — Gate AppSplash terlalu dangkal.** AppSplash menunggu **hanya** auth (`getSession()`), yang merupakan fase paling cepat. Pekerjaan yang berat (unduh chunk, query role, fetch data) semuanya terjadi **setelah** gate dibuka → muncul bar baru. Sehingga splash "benar gating Router" (sudah sesuai desain), tapi tidak menutup fase yang justru lambat.

**RC-3 — Guard punya loading sendiri yang redundan dengan Suspense.** Guard sendiri `lazy()` (suspense sebelum mount) lalu menambah `LoadingPage` lagi. Dan karena role di-cache di memory saja, **setiap refresh guard pasti me-render LoadingPage** meski auth sudah selesai.

**RC-4 — Cache dashboard in-memory → bar muncul lagi di refresh.** `DashboardCache` & role tersimpan di `Map` RAM. Belok/kembali antar halaman → tidak tampil bar (bagus). Refresh/first access → cache kosong → `loading=true` → `LinearProgress` di dashboard ikut barisan.

**RC-5 — Minim: era lama `Loading` (spinner overlay) masih hidup** di `formEdit`/`formSettings`; sistem loading jadi campur 3 visual (LinearProgress/AppSplash, LoadingPage, Loading spinner) dengan trigger berbeda → tidak ada satu "gate" yang konsisten.

Catatan: Navbar/Sidebar/Dock berada **di luar** `<Suspense>`, jadi selama bar B tampil, UI chrome sudah terekspos → ini "flash UI lalu loading" yang dimaksud di task. Ini bukan tumpukan simultan; semuanya **berurutan** (A→B→B→C→B→D). Satu-satunya yang "numpuk" adalah chrome UI + bar loading, bukan dua loading.

## 4. Opsi Perbaikan per Root Cause (belum diterapkan)

**RC-1 (multi-suspense):**
- (a) Preload seluruh tree creator sekaligus: begitu lewat gate auth, panggil `import()` CreatorLayout + semua halaman creator paralel (pola `loadCreatorDashboard` diperluas). *Trade-off:* bandwidth ~ semua chunk diunduh di awal; menghilangkan fallback B di tengah.
- (b) Jas roda satu: jadikan CreatorLayout sebagai satu-satunya `lazy()` root, dan import page-page creator secara **eager** di dalamnya → cukup satu suspend, satu fallback. *Trade-off:* bundle creator lebih besar, load lebih lambat pertama kali.

**RC-2 (gate dangkal):**
- (a) Naikkan gate ke "app ready" bukan "auth ready": splash bertahan sampai auth **dan** chunk halaman awal ter-prefetch selesai (bisa satu flag `appLoading` global yang resolve setelah preload). *Trade-off:* splash lebih lama, tapi benar-benar satu bar + nol flash — paling sesuai maksud semula.
- (b) Pertahankan gate auth-only, tapi samakan visual `LoadingPage` dengan `AppSplash` agar terasa satu indikator kontinu. *Trade-off:* masih 2 komponen/transisi, hanya konsisten secara visual.

**RC-3 (guard):**
- (a) Persist role ke `localStorage` (dibersihkan saat logout via `pageClear`/`logout`) → refresh `allowed=true` langsung, guard tidak perlu LoadingPage. *Trade-off:* role bisa basi antar refresh (bisa di-re-fetch diam-diam).
- (b) Jadi render skeleton halaman asli (bukan `LoadingPage` generik) saat cek role, supaya tidak terasa "loading baru". *Trade-off:* tiap halaman perlu skeleton sendiri.
- (c) Pindahkan cek role ke dalam fetch data dashboard (satu query, satu loading bar). *Trade-off:* struktur guard berubah, kecil.

**RC-4 (cache dashboard):**
- (a) Persist `pageCache` ke `sessionStorage` (bukan `Map` murni) → refresh tetap `loading=false`, `LinearProgress` dashboard tidak muncul. *Trade-off:* bisa menampilkan data sesaat basi; masih di-refresh diam-diam di background (sudah menjadi prinsip file ini).
- (b) Terima saja: bar dashboard hanya muncul saat cold refresh.

**Rekomendasi kombinasi paling efektif:** RC-1(b) atau (a) + RC-2(a) + RC-3(a) + RC-4(a) → hasilnya **satu** indikator berurutan (splash menunggu auth+chunk, lalu halaman langsung siap; dashboard tanpa bar karena cache persist).

---

## Catatan Tambahan (di luar scope)

**Leher sidebar tidak sinkron dengan padding konten:** `sidebar.tsx` sekarang memakai `w-[16.666vw]` (= **1/6** layar) sedangkan `layout.tsx` memakai padding `"20vw"` (= **1/5**) dan komentarnya bertuliskan 1/5. Kalau tetap mau 1/5, sidebar harus `w-[20vw]`, bukan `16.666vw`.