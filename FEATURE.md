# Spesifikasi Fitur: Section Page & Mode Quiz/Form — Formaly

## 1. Latar Belakang

Saat ini, form di Formaly hanya mendukung **1 soal per halaman**. Fitur ini menambahkan kemampuan untuk mengelompokkan beberapa soal ke dalam satu halaman (section), dan memperkenalkan dua mode pembuatan form di `creator/form.tsx`:

- **Mode Quiz/Ujian** — 1 soal per halaman (perilaku form saat ini, tetap dipertahankan sebagai pilihan)
- **Mode Form Biasa** — 1 halaman bisa berisi lebih dari 1 soal (section-based)

## 2. Konsep Utama

### 2.1 Section
Section adalah unit pengelompokan soal dalam satu halaman. Sebuah form terdiri dari 1 atau lebih section, dan setiap section berisi 1 atau lebih soal (question).

```
Form
 └── Section 1 (Halaman 1)
      ├── Soal 1
      ├── Soal 2
      └── Soal 3
 └── Section 2 (Halaman 2)
      ├── Soal 4
      └── Soal 5
```

### 2.2 Mode Quiz/Ujian
- Setiap section otomatis dibatasi hanya boleh berisi **1 soal**.
- Navigasi antar soal = navigasi antar halaman (seperti perilaku sekarang).
- Cocok untuk ujian/kuis yang butuh 1 soal fokus per layar (mencegah scroll/lihat semua soal sekaligus).

### 2.3 Mode Form Biasa
- Section bisa berisi **banyak soal** sekaligus.
- Creator bebas mengatur soal mana masuk ke section mana (drag & drop atau tombol "pindah ke section lain").
- Cocok untuk survei, formulir pendaftaran, angket, dll.

### 2.4 Pemilihan Mode
- Mode dipilih saat form dibuat pertama kali (di awal alur create form), disimpan sebagai atribut pada form (mis. `form_mode: 'quiz' | 'standard'`).
- Mode **menentukan constraint**, bukan cuma tampilan:
  - Mode `quiz` → sistem otomatis membuat 1 section baru setiap kali soal baru ditambahkan (atau mencegah lebih dari 1 soal per section).
  - Mode `standard` → creator bebas menambah soal ke section manapun, dan bebas membuat/menghapus section.
- Pertanyaan terbuka: apakah mode form bisa diubah setelah dibuat (misal dari `standard` ke `quiz`)? Perlu keputusan produk — jika soal sudah > 1 per section, perlu strategi migrasi (auto-split jadi banyak section 1 soal, atau block perubahan mode).

## 3. Perubahan Skema Database (Supabase)

### 3.1 Tabel Baru: `sections`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid (PK) | |
| `form_id` | uuid (FK → forms.id) | |
| `title` | text (nullable) | Judul opsional untuk section, mis. "Bagian A: Data Diri" |
| `description` | text (nullable) | Deskripsi/instruksi opsional |
| `order_index` | integer | Urutan halaman/section dalam form |
| `created_at` | timestamptz | |

### 3.2 Perubahan Tabel `questions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `section_id` | uuid (FK → sections.id) | Kolom baru — soal kini merujuk ke section, bukan langsung ke form |
| `order_index` | integer | Urutan soal di dalam section |

> Catatan migrasi: form yang sudah ada (existing) perlu di-backfill — setiap soal existing dibungkus jadi 1 section per soal (default ke mode `quiz`) agar tidak breaking.

### 3.3 Perubahan Tabel `forms`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `form_mode` | enum (`quiz`, `standard`) | Default `quiz` untuk kompatibilitas dengan perilaku lama |

## 4. Perubahan UI — `creator/form.tsx`

### 4.1 Alur Pembuatan Form (baru)
1. Creator membuat form baru → pilih mode: **Quiz/Ujian** atau **Form Biasa** (mis. lewat modal/step awal, mirip pemilihan template).
2. UI form builder menyesuaikan berdasarkan mode:
   - **Mode Quiz**: tampilan tetap seperti sekarang — list halaman di sidebar, 1 soal per halaman, tombol "Tambah Soal" otomatis membuat halaman baru.
   - **Mode Form**: tampilan section-based — sidebar menampilkan list section (bukan list soal), dan di dalam tiap section ada list soal yang bisa di-reorder (drag & drop) serta ditambah/dipindah antar section.

### 4.2 Komponen Baru yang Dibutuhkan
- `SectionList` — sidebar navigasi antar section (pengganti/pelengkap navigasi halaman soal yang ada sekarang)
- `SectionCard` — wadah per section yang menampung beberapa `QuestionCard` di dalamnya, dengan header judul/deskripsi section
- `ModeSelector` — komponen pemilihan mode saat create form (quiz vs standard)
- Penyesuaian pada komponen soal (`QuestionCard`/editor soal) agar bisa dipindahkan antar section, kemungkinan pakai drag & drop (misal `@dnd-kit` atau library serupa yang sudah dipakai di project)

### 4.3 Preview / Tampilan saat Diisi Responden
- Mode Quiz: preview & runtime pengisian form tetap 1 soal per layar seperti sekarang.
- Mode Form: preview & runtime pengisian form menampilkan semua soal dalam 1 section sekaligus per halaman, dengan tombol "Lanjut ke Section berikutnya" / "Kembali".

## 5. Pertimbangan Teknis

- **Bulk import (DOCX/CSV/XLSX)**: perlu diputuskan apakah hasil import otomatis dikelompokkan ke 1 section (mode form) atau tetap 1 soal 1 section (mode quiz), tergantung mode form yang aktif saat import dilakukan.
- **Validasi progres pengisian**: di mode form, validasi wajib-isi soal perlu dilakukan per section (bukan per soal seperti sekarang) sebelum lanjut ke section berikutnya.
- **RLS & query**: query pengambilan soal untuk form perlu diubah dari `questions where form_id = ...` menjadi join lewat `sections`, pastikan RLS policy pada `sections` dan `questions` konsisten.
- **Reorder soal antar section**: perlu endpoint/RPC untuk update `section_id` + `order_index` sekaligus saat drag & drop lintas section.
- **Migrasi data lama**: siapkan script migrasi Supabase untuk generate 1 section per soal existing agar form lama tidak rusak.

## 6. Checklist Implementasi (Draft)

- [ ] Buat tabel `sections` + migrasi kolom `section_id`, `order_index` di `questions`
- [ ] Tambah kolom `form_mode` di tabel `forms`
- [ ] Script migrasi backfill data lama → 1 section per soal
- [ ] Komponen `ModeSelector` di alur create form
- [ ] Komponen `SectionList` & `SectionCard` di `creator/form.tsx`
- [ ] Logic constraint mode Quiz (1 soal per section, auto-create section per soal baru)
- [ ] Drag & drop reorder soal antar section (mode Form)
- [ ] Update runtime pengisian form (responden) untuk render per-section (mode Form) vs per-soal (mode Quiz)
- [ ] Update validasi wajib-isi per section
- [ ] Sesuaikan alur bulk import dengan mode form aktif
- [ ] Update RLS policy untuk tabel `sections`