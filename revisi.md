# Task: Media Upload untuk Soal & Header (Formaly)

## Context

Formaly adalah aplikasi form/exam management (React + TypeScript + Vite + Tailwind + DaisyUI v4 {
  "task": "Media Upload untuk Soal & Header (Formaly)",
  "context": {
    "project": "Formaly - form/exam management app",
    "stack": ["React", "TypeScript", "Vite", "Tailwind", "DaisyUI v4", "Supabase"],
    "objective": "Tambahkan fitur upload media (gambar/video/audio) untuk soal dan header form. File diupload ke storage server custom milik project (bukan Supabase Storage), URL hasil upload disimpan dan ditampilkan di form.",
    "storage_api": {
      "base_url": "https://storage.formaly.my.id",
      "endpoints": {
        "upload": {
          "method": "POST",
          "path": "/upload",
          "content_type": "multipart/form-data",
          "field_name": "file",
          "auth_header": "Authorization: Bearer <API_KEY>",
          "auth_note": "Server saat ini belum memvalidasi header ini, tapi tetap kirim dari client agar siap saat validasi ditambahkan",
          "success_response": {
            "status": 200,
            "body": { "message": "Upload berhasil", "url": "/media/2026/09/03/1234abcd.png" },
            "note": "url berupa path relatif, bukan URL lengkap"
          },
          "error_response": {
            "status": "4xx/5xx",
            "body": { "error": "pesan error" }
          },
          "server_validation": {
            "allowed_extensions": [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mkv", ".mov", ".avi", ".mp3"],
            "max_size_mb": 100
          }
        },
        "delete": {
          "method": "DELETE",
          "path": "/delete?path=/media/2026/09/03/1234abcd.png",
          "success_response": { "body": { "message": "File berhasil dihapus dari server" } },
          "error_response": { "body": { "error": "pesan error" } }
        }
      }
    },
    "design_conventions": {
      "aesthetic": "minimalis hitam-putih",
      "border_radius": "rounded-none",
      "hover_effect": "invert (background/text swap saat hover)",
      "ui_library": "DaisyUI v4 (bukan v5, pastikan class kompatibel)",
      "animation_library": "motion/react (Framer Motion)",
      "easing": "[0.22, 1, 0.36, 1]"
    }
  },
  "instructions": [
    {
      "step": 1,
      "action": "create_file",
      "path": "src/lib/mediaStorage.ts",
      "details": [
        "uploadMedia(file: File): Promise<string> — validasi ekstensi & ukuran di client (mirror batasan server) sebelum request, POST ke /upload, kirim header Authorization: Bearer <import.meta.env.VITE_STORAGE_API_KEY> bila env var tersedia, gabungkan base URL + path relatif dari response jadi URL lengkap yang dikembalikan ke caller. Lempar Error dengan pesan jelas (Bahasa Indonesia) bila gagal.",
        "deleteMedia(fileUrlOrPath: string): Promise<boolean> — terima URL lengkap atau path relatif, ekstrak path, DELETE ke /delete?path=..., return boolean sukses/gagal (jangan throw, return false on failure).",
        "getMediaType(filenameOrUrl: string): 'image' | 'video' | 'audio' | null — helper berdasar ekstensi, dipakai menentukan elemen preview yang tepat.",
        "Base URL storage ambil dari import.meta.env.VITE_STORAGE_BASE_URL, fallback ke https://storage.formaly.my.id bila env var kosong."
      ]
    },
    {
      "step": 2,
      "action": "create_file",
      "path": "src/components/MediaUpload.tsx",
      "type": "reusable component",
      "details": [
        "Props: value?: string (URL media saat ini), onChange: (url: string | null) => void, optional label?: string.",
        "State kosong: tampilkan dropzone/tombol 'klik untuk upload' dengan teks bantuan format & batas ukuran yang didukung.",
        "Saat upload: tampilkan loading state, disable interaksi.",
        "Saat ada value: tampilkan preview sesuai tipe media (<img> untuk image, <video controls> untuk video, <audio controls> untuk audio) + tombol hapus yang memanggil deleteMedia lalu onChange(null).",
        "Tampilkan pesan error yang readable bila upload gagal (tangkap error dari uploadMedia).",
        "Ikuti konvensi desain: rounded-none, hover invert, motion/react dengan easing yang sama."
      ]
    },
    {
      "step": 3,
      "action": "create_migration",
      "target": "Supabase SQL migration",
      "details": [
        "PENTING: Sebelum menulis migration, cek dulu schema tabel soal dan tabel form/header yang sudah ada di project (nama tabel & kolom aktualnya) — jangan asumsikan nama tabel questions/forms kalau ternyata beda di codebase.",
        "Tambahkan kolom media_url text (nullable, default NULL) ke tabel soal dan ke tabel form/header.",
        "Jangan ubah/hapus kolom atau constraint lain yang sudah ada.",
        "Format nama file migration mengikuti konvensi migration yang sudah ada di project."
      ]
    },
    {
      "step": 4,
      "action": "integrate",
      "details": [
        "Cari komponen form builder soal dan form header yang sudah ada di project.",
        "Pasang <MediaUpload /> di posisi yang masuk akal (misal di bawah field teks pertanyaan / di bagian header form), hubungkan value/onChange ke state soal atau header yang sesuai, pastikan media_url ikut tersimpan saat form di-submit ke Supabase.",
        "Jangan ubah field, layout, atau logika lain yang sudah ada di form tersebut di luar penambahan media upload ini."
      ]
    },
    {
      "step": 5,
      "action": "update_env_example",
      "details": [
        "Tambahkan ke .env.example (atau file env contoh yang sudah ada) dua variabel baru: VITE_STORAGE_BASE_URL=https://storage.formaly.my.id dan VITE_STORAGE_API_KEY="
      ]
    }
  ],
  "constraints": [
    "Kirim kode lengkap per file (bukan potongan/placeholder yang perlu disambung manual).",
    "Jangan menambah fitur di luar yang diminta (misal: galeri media, bulk upload, ubah fitur import soal yang sudah ada).",
    "Kalau nama tabel/kolom di schema aktual project berbeda dari asumsi di atas, sesuaikan ke nama yang benar dan sebutkan penyesuaian itu secara singkat.",
    "Kalau menemukan masalah lain di luar scope task ini, catat terpisah setelah selesai — jangan langsung diubah tanpa diminta."
  ]
}+ Supabase). Tambahkan fitur upload media (gambar/video/audio) untuk soal dan header form. File yang diupload dikirim ke storage server custom milik project ini (bukan Supabase Storage), lalu URL hasil upload disimpan dan ditampilkan di form.

### Storage API (server Go, sudah berjalan)

- Base URL: `https://storage.formaly.my.id`
- `POST /upload` — multipart/form-data, field file bernama `file`
  - Auth: header `Authorization: Bearer <API_KEY>` (catatan: server saat ini **belum** memvalidasi header ini, tapi kirim tetap dari client agar siap saat validasi ditambahkan)
  - Response sukses (200): `{ "message": "Upload berhasil", "url": "/media/2026/09/03/1234abcd.png" }` — `url` berupa **path relatif**, bukan URL lengkap
  - Response gagal (4xx/5xx): `{ "error": "pesan error" }`
  - Validasi server: ekstensi diizinkan `.jpg .jpeg .png .webp .mp4 .mkv .mov .avi .mp3`, maksimal ukuran 100MB
- `DELETE /delete?path=/media/2026/09/03/1234abcd.png` — hapus file
  - Response sukses: `{ "message": "File berhasil dihapus dari server" }`
  - Response gagal: `{ "error": "pesan error" }`

### Konvensi desain project

- Estetika minimalis hitam-putih: gunakan `rounded-none`, efek hover invert (background/text swap saat hover)
- DaisyUI **v4** (bukan v5) — pastikan class yang dipakai kompatibel dengan v4
- Animasi pakai `motion/react` (Framer Motion) dengan easing konsisten `[0.22, 1, 0.36, 1]`

## Instructions

1. **Buat `src/lib/mediaStorage.ts`**
   - `uploadMedia(file: File): Promise<string>` — validasi ekstensi & ukuran di client (mirror batasan server di atas) sebelum request, POST ke `/upload`, kirim header `Authorization: Bearer <import.meta.env.VITE_STORAGE_API_KEY>` bila env var tersedia, lalu gabungkan base URL + path relatif dari response jadi URL lengkap yang dikembalikan ke caller. Lempar `Error` dengan pesan yang jelas (dalam Bahasa Indonesia) bila gagal.
   - `deleteMedia(fileUrlOrPath: string): Promise<boolean>` — terima URL lengkap atau path relatif, ekstrak path, DELETE ke `/delete?path=...`, return boolean sukses/gagal (jangan throw, cukup return false on failure).
   - `getMediaType(filenameOrUrl: string): 'image' | 'video' | 'audio' | null` — helper berdasar ekstensi, dipakai untuk menentukan elemen preview yang tepat.
   - Base URL storage ambil dari `import.meta.env.VITE_STORAGE_BASE_URL`, fallback ke `https://storage.formaly.my.id` bila env var kosong.

2. **Buat `src/components/MediaUpload.tsx`** (reusable component)
   - Props: `value?: string` (URL media saat ini), `onChange: (url: string | null) => void`, optional `label?: string`.
   - State kosong: tampilkan dropzone/tombol "klik untuk upload" dengan teks bantuan format & batas ukuran yang didukung.
   - Saat upload: tampilkan loading state, disable interaksi.
   - Saat ada `value`: tampilkan preview sesuai tipe media (`<img>` untuk image, `<video controls>` untuk video, `<audio controls>` untuk audio) + tombol hapus yang memanggil `deleteMedia` lalu `onChange(null)`.
   - Tampilkan pesan error yang readable bila upload gagal (tangkap error dari `uploadMedia`).
   - Ikuti konvensi desain di atas (rounded-none, hover invert, motion/react dengan easing yang sama).

3. **Buat migration SQL Supabase baru** (folder migration project ini, format nama file mengikuti konvensi migration yang sudah ada di project)
   - **Sebelum menulis migration ini: cek dulu schema tabel soal dan tabel form/header yang sudah ada di project** (nama tabel & kolom aktualnya) — jangan asumsikan nama tabel `questions`/`forms` kalau ternyata beda di codebase.
   - Tambahkan kolom `media_url text` (nullable, default `NULL`) ke tabel soal dan ke tabel form/header.
   - Jangan ubah/hapus kolom atau constraint lain yang sudah ada.

4. **Integrasi ke form yang sudah ada**
   - Cari komponen form builder soal dan form header yang sudah ada di project.
   - Pasang `<MediaUpload />` di posisi yang masuk akal (misal di bawah field teks pertanyaan / di bagian header form), hubungkan `value`/`onChange` ke state soal atau header yang sesuai, pastikan `media_url` ikut tersimpan saat form di-submit ke Supabase.
   - **Jangan ubah field, layout, atau logika lain yang sudah ada di form tersebut** di luar penambahan media upload ini.

5. Tambahkan ke `.env.example` (atau file env contoh yang sudah ada di project) dua variabel baru:
   ```
   VITE_STORAGE_BASE_URL=https://storage.formaly.my.id
   VITE_STORAGE_API_KEY=
   ```

## Constraints

- Kirim kode lengkap per file (bukan potongan/placeholder yang perlu disambung manual).
- Jangan menambah fitur di luar yang diminta (misal: jangan bikin galeri media, jangan bikin bulk upload, jangan ubah fitur import soal yang sudah ada).
- Kalau nama tabel/kolom di schema aktual project berbeda dari asumsi di atas, sesuaikan ke nama yang benar dan sebutkan penyesuaian itu secara singkat.
- Kalau menemukan masalah lain di luar scope task ini, catat terpisah setelah selesai — jangan langsung diubah tanpa diminta.