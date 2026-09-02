# Revisi Formaly — Creator Verification & Template Download

> File ini berisi task revisi untuk project **Formaly** (React + TypeScript + Vite + Tailwind + DaisyUI + Supabase). Konteks project: sistem sudah punya self-serve creator registration lewat RPC `apply_as_creator` (SECURITY DEFINER). Revisi ini menambahkan lapisan verifikasi sebelum upgrade role ke creator, plus fitur download template soal.

---

## 1. Fitur: Upgrade Akun ke Creator dengan Verifikasi

### Tujuan
User yang ingin upgrade ke role `creator` harus lolos verifikasi terlebih dahulu, bukan langsung upgrade instan seperti alur `apply_as_creator` yang sekarang.

### Syarat Verifikasi
1. **Usia akun minimal 7 hari** — dihitung dari `created_at` user (cek di `auth.users` atau `public.users`, sesuaikan mana yang jadi source of truth).
2. **Verifikasi OTP dari email** — user harus menerima dan memasukkan kode OTP yang dikirim ke email terdaftar sebelum upgrade diproses.

### Alur yang Diharapkan
1. User membuka halaman/menu "Upgrade ke Creator".
2. Sistem cek usia akun:
   - Jika < 7 hari → tampilkan pesan bahwa akun belum memenuhi syarat, tampilkan juga sisa hari sebelum eligible.
   - Jika ≥ 7 hari → lanjut ke step OTP.
3. Sistem kirim OTP ke email user (pakai `supabase.auth.signInWithOtp` atau mekanisme OTP custom — pilih yang paling sesuai dengan setup Supabase Auth yang sudah ada).
4. User input OTP di UI (input field dengan resend timer).
5. Sistem verifikasi OTP (`supabase.auth.verifyOtp` atau endpoint verifikasi custom).
6. Jika OTP valid → jalankan proses upgrade role ke creator (kemungkinan modifikasi RPC `apply_as_creator` agar menerima parameter/flag "sudah terverifikasi", atau bikin RPC baru khusus untuk flow ini).
7. Jika OTP invalid/expired → tampilkan error, kasih opsi kirim ulang OTP.

### Yang Perlu Diperhatikan saat Implementasi
- Cek ulang RLS policy yang berkaitan dengan role elevation (mengingat sebelumnya ada isu RLS saat migrasi role ke ENUM `public.user_role`).
- Jangan biarkan upgrade role terjadi tanpa OTP tervalidasi — validasi harus di sisi backend (RPC/Edge Function), bukan cuma UI, biar tidak bisa dibypass dari client.
- UI mengikuti konvensi motion yang sudah dipakai di project (`motion/react`, easing `[0.22, 1, 0.36, 1]`, stagger pattern).
- Tampilkan state loading dan error yang jelas di tiap step (cek usia akun, kirim OTP, verifikasi OTP).

### Acceptance Criteria
- [ ] User dengan akun < 7 hari tidak bisa lanjut ke step OTP, dan melihat pesan yang jelas.
- [ ] User dengan akun ≥ 7 hari bisa request OTP ke emailnya.
- [ ] OTP yang salah/expired ditolak dengan pesan error yang jelas.
- [ ] OTP yang benar men-trigger upgrade role ke `creator` di database.
- [ ] Validasi usia akun & OTP dilakukan di backend, bukan hanya di client.

---

## 2. Fitur: Download Template Soal dalam Format .docx

### Tujuan
User (calon creator/creator) bisa download template soal berformat `.docx` yang sudah sesuai dengan format import yang didukung project.

### Konteks Format
Formaly sudah punya bulk question import yang support DOCX (via mammoth.js), dengan konvensi:
- Soal diberi nomor urut.
- Pilihan jawaban diberi label huruf a–e.
- Ada baris `Kunci Jawaban:` untuk menandai jawaban benar.

### Yang Perlu Dibuat
1. Generate/siapkan file `.docx` template yang **mengikuti persis** konvensi format import di atas (supaya kalau user isi template ini lalu upload lagi, langsung terbaca sistem tanpa error).
2. Sertakan beberapa contoh soal dummy di template supaya user paham formatnya (misal 2–3 soal contoh, lengkap dengan pilihan a–e dan baris `Kunci Jawaban:`).
3. Tombol/link "Download Template Soal (.docx)" di halaman yang relevan (kemungkinan di dekat fitur bulk import soal).
4. File template bisa berupa static asset yang di-generate sekali (disimpan di public folder / storage), atau digenerate on-demand — pilih pendekatan yang lebih sesuai dengan arsitektur project saat ini.

### Acceptance Criteria
- [ ] Template `.docx` bisa didownload lewat 1 klik.
- [ ] Isi template match dengan format parser bulk import yang sudah ada (nomor soal, opsi a–e, `Kunci Jawaban:`).
- [ ] Template berisi contoh soal supaya user tidak bingung cara isi.
- [ ] Kalau template ini langsung diupload ulang tanpa diubah, harus berhasil diimport tanpa error.

---

## Catatan Umum
- Kedua fitur ini independen satu sama lain, bisa dikerjakan/dites terpisah.
- Ikuti stack & konvensi project yang sudah ada (React, TS, Vite, Tailwind, DaisyUI, Supabase, motion/react).
- Kalau ada keputusan teknis yang ambigu (misal: RPC baru vs modifikasi RPC lama untuk upgrade role), silakan pilih pendekatan yang paling minim breaking change ke sistem role/RLS yang sudah berjalan.