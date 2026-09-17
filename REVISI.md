# Revisi Bug — Formaly (Creator Form Builder)

## Bug List

1. **Warna dim/overlay modal salah saat dark mode**
   - Saat dark mode aktif, backdrop/dim di belakang popup modal seharusnya tetap berwarna hitam, bukan berubah jadi putih.
   - Perbaiki agar dim/overlay modal konsisten berwarna hitam baik di light mode maupun dark mode.

2. **Alert konfirmasi saat urutan soal berubah**
   - Saat urutan soal diubah (drag and drop), tampilkan alert/notifikasi untuk menyimpan urutan soal yang baru.
   - Posisi alert ada di bagian bawah layar.

3. **Bug warna `formTabs` di dark mode**
   - Warna pada komponen `formTabs` masih bermasalah saat dark mode aktif.
   - Perbaiki agar warna `formTabs` sesuai dan konsisten saat dark mode aktif.

## Constraints
- Jangan menambahkan fitur atau elemen lain di luar yang disebutkan di atas.
- Jangan menghapus fitur/elemen/logika lain yang tidak terkait dengan perbaikan ini.
- Jangan mengubah struktur, urutan konten, atau styling yang tidak berkaitan dengan poin-poin di atas.
- Pastikan hasil akhir tetap valid, tidak merusak fungsionalitas lain, dan bisa langsung dipakai (runnable).