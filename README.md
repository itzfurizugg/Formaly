# Formaly Go Storage Server

Backend penyimpanan media berbasis **Go (Golang)** yang ringan, aman, dan cepat. Dirancang khusus untuk mendampingi frontend yang di-deploy di Vercel (`formaly.my.id`) serta terintegrasi dengan database **Supabase**.

---

## 🚀 Fitur Utama
* **Penyimpanan Lokal Berbasis Disk**: Menyimpan file fisik langsung ke folder server `./uploads`.
* **Struktur Folder Tanggal**: File otomatis dipecah berdasarkan `Tahun/Bulan/Hari` untuk menjaga performa baca/tulis.
* **Keamanan Berlapis**: 
  * Validasi ekstensi ketat (Gambar: `.jpg`, `.jpeg`, `.png`, `.webp` | Video: `.mp4`, `.mkv`, `.mov`, `.avi` | Audio: `.mp3`).
  * Pengecekan *Magic Bytes* (512 byte pertama) untuk mencegah manipulasi ekstensi file berbahaya.
  * Pembatasan ukuran *request* maksimal **100MB** untuk mencegah serangan DoS.
  * Proteksi CORS dan header keamanan standar HTTP.
* **Cloudflare Named Tunnel**: Terhubung secara permanen melalui domain `storage.formaly.my.id` tanpa mengganggu domain utama di Vercel.

---

## 🛠️ Prasyarat & Kebutuhan Sistem
Pastikan di server/laptop kamu sudah terinstal:
1. **Go (Golang)** (Versi 1.18 atau yang lebih baru).
2. **Cloudflare CLI (`cloudflared`)**.

Pastikan struktur file di dalam folder project kamu sudah seperti ini:
```text
.
├── cloudflared-linux-amd64
├── config.yml
├── formaly-storage (hasil build)
├── go.mod
├── main.go
└── uploads/

```

---

## ⚙️ Langkah-Langkah Instalasi & Menjalankan

### Langkah 1: Compile Kode Go (Backend Storage)

Jika kamu melakukan perubahan pada `main.go`, build ulang file binari Go dengan perintah:

```bash
go build -o formaly-storage main.go
```

### Langkah 2: Konfigurasi Cloudflare Tunnel (`config.yml`)

Pastikan file `config.yml` di dalam folder project kamu sudah diatur dengan benar untuk menghubungkan domain ke port server Go (`:48484`):

```yaml
tunnel: id_tunnel
credentials-file: /home/rizuki/.cloudflared/id_tunnel.json

ingress:
  - hostname: storage.formaly.my.id
    service: http://localhost:48484
  - service: http_status:404

```

*(Catatan: Sesuaikan path `credentials-file` dengan lokasi file JSON autentikasi cloudflare di komputer/servermu).*

---

### Langkah 3: Menjalankan Server & Tunnel (Hingga Live)

Agar layanan backend dan tunnel berjalan bersamaan, jalankan menggunakan **2 tab terminal** terpisah (atau jalankan di background menggunakan `tmux` / `systemd`):

#### **Terminal 1: Jalankan Backend Go**

```bash
./formaly-storage
```

*Pastikan muncul log: `🚀 Server Go Storage Formaly berjalan di port :48484...*`

#### **Terminal 2: Jalankan Cloudflare Tunnel**

Jalankan perintah cloudflared untuk mengaktifkan domain publik menggunakan konfigurasi `config.yml`:

```bash
./cloudflared-linux-amd64 tunnel --config config.yml run id_tunnel
```

*Atau jika file konfigurasi berada di direktori default (`~/.cloudflared/config.yml`), kamu cukup mengetik:*

```bash
./cloudflared-linux-amd64 tunnel run id_tunnel
```

Jika berhasil, Cloudflare akan memberikan log koneksi aktif, dan penyimpanan kamu sekarang resmi bisa diakses secara publik melalui:

**`https://storage.formaly.my.id`**
---

## 📡 Dokumentasi API Endpoint

### 1. Cek Kesehatan Server

* **URL**: `GET https://storage.formaly.my.id/`
* **Respon (200 OK)**:
```json
{
  "message": "Server Go Storage Formaly Aktif!"
}
```

### 2. Upload File (Gambar / Video / Audio)

* **URL**: `POST https://storage.formaly.my.id/upload`
* **Content-Type**: `multipart/form-data`
* **Form-Data Key**: `file` (isi dengan file media pilihan, maks 100MB)
* **Respon (200 OK)**:
```json
{
  "message": "Upload berhasil",
  "url": "/media/2026/09/02/1788280826_f8a3.mp3"
}
```


*(Simpan teks URL di atas beserta domain lengkapnya ke dalam database Supabase).*

### 3. Mengambil / Menampilkan File Statis

* **URL**: `GET https://storage.formaly.my.id/media/{tahun}/{bulan}/{hari}/{nama_file}`

```

Dengan panduan ini, siapa pun (atau kamu sendiri di masa depan) bisa langsung mereplikasi, merakit, dan menjalankan server storage ini dengan mulus sampai benar-benar online di `storage.formaly.my.id`!

```