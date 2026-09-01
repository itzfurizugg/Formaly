# REVISI YANG HARUS DIKERJAKAN

## PERATURAN
- Jangan mengubah kode yang tidak diminta.
- Jangan merubah/menambah/menghapus kode yang sudah ada di luar scope perbaikan.
- Kerjakan persis sesuai yang diperintahkan di bawah ini.

---

## 1. Profile — Update Data Tidak Tersimpan
**File:** `profile.tsx`

Saat user/creator mengubah nama, email, atau password di halaman profile, perubahan tidak tersimpan — data tetap sama meskipun sudah ditekan simpan.

- [ ] Perbaiki proses update agar nama, email, dan password benar-benar tersimpan ke database.

---

## 2. Form Settings — Izinkan Form Dikerjakan Berkali-kali
**File:** `formSettings.tsx`

- [ ] Tambahkan toggle setting: "Form bisa dikerjakan lebih dari 1 kali untuk 1 akun".
- [ ] Saat toggle aktif, 1 akun responden bisa mengisi form yang sama lebih dari sekali.

---

## 3. Konfirmasi Sebelum Submit Form

- [ ] Saat responden menekan tombol kirim form, tampilkan popup konfirmasi:
  > "Apakah anda yakin ingin mengirim jawaban anda?"

---

## 4. Export Data Responden ke .xlsx
**Catatan penting:** yang di-export adalah **data responden**, bukan soal/pertanyaan form.

- [ ] Creator bisa export data responden dalam format `.xlsx`.
- [ ] Kolom yang di-export contohnya: nama, nilai, email, waktu pengiriman (sesuaikan dengan data responden yang tersedia).

---

## 5. Filter Responden Berdasarkan Jawaban
**Halaman:** terpisah (halaman baru)

- [ ] Buat halaman terpisah untuk memfilter responden berdasarkan jawaban yang mereka berikan.

---

## 6. Preview Warna Header dari Form Settings

- [ ] Saat warna header diubah dari `formSettings.tsx`, header langsung berubah warna secara real-time (live preview), tidak perlu menunggu di-save. *(Konfirmasi: apakah live preview tetap diperlukan, atau cukup berubah setelah save saja?)*

---

## 7. Token Baru — Ubah ke Popup Modal

- [ ] Ubah tampilan "token baru" dari bentuk sekarang menjadi popup modal.

---

## 8. Loading State di Halaman Submissions
**File:** `src/pages/creator/submissions.tsx`
**Komponen:** `src/components/loading.tsx`

- [ ] Saat data sedang di-fetch, tampilkan komponen `loading.tsx` yang sudah ada.

---

## 9. Pindahkan Tombol Filter Responden
**Dari:** `tabs.tsx`
**Ke:** `submissions.tsx`

- [ ] Tombol untuk membuka fitur filter responden (lihat poin 5) dipindahkan sumbernya dari `tabs.tsx` ke `submissions.tsx`.

---

## 10. Export Jawaban dari 1 Akun Responden

- [ ] Creator bisa export jawaban milik satu akun responden tertentu saja (bukan seluruh responden).