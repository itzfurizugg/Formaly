# Formaly

Aplikasi pembuat formulir yang dikembangkan sebagai tugas akhir kelompok. Mendukung pembuatan form/kuis umum maupun ujian, dengan editor soal berbasis rich text yang juga mendukung notasi matematika (formula/KaTeX).

## Fitur

- Pembuatan form/soal secara umum, tidak terikat ke kelas tertentu — bisa dipakai untuk survei biasa maupun ujian
- Editor soal WYSIWYG dengan dukungan:
  - Formatting teks standar (bold, italic, underline, strikethrough, list, code, link, gambar)
  - Formula matematika (KaTeX) via tombol `fx`
- Manajemen soal: tipe soal, skor, urutan, pilihan jawaban, gambar pendukung
- Role-based access: **User**, **Creator**, **Admin**

## Tech Stack

| Layer | Teknologi |
|---|---|
| Mobile | Flutter |
| Web | React (TypeScript) |
| Backend & Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Rich Text Editor (Web) | Quill (`react-quill-new`) |
| Formula Rendering | KaTeX |

<!-- > Catatan migrasi: rich text editor sebelumnya menggunakan Tiptap, kemudian dimigrasikan ke Quill (`react-quill-new`). Auth juga telah dimigrasikan dari sistem custom (tabel `users` + `password_hash` sendiri) ke Supabase Auth. -->

## Role & Hak Akses

- **User** — mengisi/mengerjakan form
- **Creator** — membuat dan mengelola form/soal
- **Admin** — mengelola sistem secara keseluruhan

## Struktur Proyek

Repo ini (`formaly-web`) merupakan bagian web (React TypeScript) dari Formaly. Aplikasi mobile (Flutter) berada di branch terpisah.

```
formaly-web/
└── src/
    ├── assets/
    ├── components/
    │   ├── charts/
    │   ├── creator/
    │   │   ├── formList.tsx
    │   │   ├── navbar.tsx
    │   │   └── QuestionImportModal.tsx
    │   ├── card.tsx
    │   ├── filter.tsx
    │   ├── form.tsx
    │   ├── historyCard.tsx
    │   ├── loading.tsx
    │   ├── navbar.tsx
    │   ├── pageindicator.tsx
    │   ├── richtext.tsx
    │   └── search.tsx
    ├── lib/
    │   ├── parsers/
    │   ├── alerts.ts
    │   ├── auth-context.ts
    │   ├── auth.ts
    │   ├── colorbase.tsx
    │   ├── exportForm.ts
    │   ├── redirect.ts
    │   ├── richtext.ts
    │   └── supabase.ts
    ├── pages/
    │   ├── admin/
    │   │   └── forms.tsx
    │   ├── auth/
    │   │   ├── forgotPassword.tsx
    │   │   ├── login.tsx
    │   │   ├── otp.tsx
    │   │   ├── register.tsx
    │   │   └── resetPassword.tsx
    │   ├── creator/
    │   │   ├── dashboard.tsx
    │   │   ├── formEdit.tsx
    │   │   ├── formNew.tsx
    │   │   ├── guard.tsx
    │   │   ├── layout.tsx
    │   │   ├── questions.tsx
    │   │   ├── shared.tsx
    │   │   ├── submissionDetail.tsx
    │   │   ├── submissions.tsx
    │   │   └── tokens.tsx
    │   └── form/
    │       ├── description.tsx
    │       ├── form.tsx
    │       ├── formlist.tsx
    │       ├── resolver.tsx
    │       ├── result.tsx
    │       ├── available.tsx
    │       ├── history.tsx
    │       ├── home.tsx
    │       └── profile.tsx
    ├── App.css
    └── App.tsx
```

## Instalasi & Setup

### Prasyarat

- Flutter SDK
- Node.js & npm/yarn
- Akun & project Supabase

### Web (`formaly-web`)

```bash
npm install
npm run dev
```

### Mobile (Flutter, repo terpisah)

```bash
flutter pub get
flutter run
```

### Environment Variables

Buat file `.env` di root project dengan isi:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Kontributor

| Nama | Peran |
|---|---|
| Rizki Syahrul Ramadhan | Project Manager |
| Aurellia Tri Azhara | Database Engineer |
| Muhammad Dzaki Rafif Helmiansyah | Front-end Web |
| Ladya Shafa Kamila | Web UI/UX Designer |
| Chintia Claudia | Mobile UI/UX Designer |
| Ariq Hafizh Al Bariqi | Mobile Dev |