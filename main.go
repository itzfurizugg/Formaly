package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ResponseJSON untuk format balikan API yang konsisten
type ResponseJSON struct {
	Message string `json:"message"`
	URL     string `json:"url,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Middleware Keamanan (CORS & Security Headers)
func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Header Keamanan Standar
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")

		// Konfigurasi CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// allowedOrigins adalah daftar origin web yang boleh POST ke storage service ini.
// Bisa dioverride lewat env var ALLOWED_ORIGINS (dipisah koma), kalau tidak ada
// akan fallback ke default di bawah.
func allowedOrigins() []string {
	if v := os.Getenv("ALLOWED_ORIGINS"); v != "" {
		parts := strings.Split(v, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		return parts
	}
	return []string{
		"https://formaly.my.id",
		"https://creator.formaly.my.id",
		"http://localhost:5173",
	}
}

// isOriginAllowed mengecek apakah origin/referer request ada di whitelist.
func isOriginAllowed(raw string, allowed []string) bool {
	if raw == "" {
		return false
	}

	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	origin := u.Scheme + "://" + u.Host

	for _, o := range allowed {
		if origin == o {
			return true
		}
	}
	return false
}

// OnlyFromWebMiddleware menolak request POST yang tidak membawa header Origin
// atau Referer dari domain yang di-whitelist.
//
// Catatan: header Origin/Referer bisa dipalsukan oleh non-browser client
// (curl, Postman, dsb) kalau pengirimnya sengaja niat. Middleware ini efektif
// menahan request iseng/otomatis yang polos, tapi bukan pengganti autentikasi
// asli.
func OnlyFromWebMiddleware(next http.Handler) http.Handler {
	allowed := allowedOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			next.ServeHTTP(w, r)
			return
		}

		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = r.Header.Get("Referer")
		}

		if !isOriginAllowed(origin, allowed) {
			log.Printf("blocked POST from disallowed origin: %q (path=%s)", origin, r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Forbidden: request must come from the web app"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Fungsi helper untuk generate string acak pendek (agar nama file singkat & rapi)
func generateShortRandomString(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func main() {
	uploadDir := "./uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			fmt.Printf("Gagal membuat folder upload: %v\n", err)
			return
		}
	}

	mux := http.NewServeMux()

	// Endpoint Cek Kesehatan Server
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ResponseJSON{Message: "Server Go Storage Formaly Aktif!"})
	})

	// Serve file statis dengan performa tinggi
	fs := http.FileServer(http.Dir(uploadDir))
	mux.Handle("/media/", http.StripPrefix("/media/", fs))

	// Endpoint Upload yang Aman, Cepat, dan Nama File Pendek
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Method not allowed"})
			return
		}

		// KEAMANAN: Batasi ukuran maksimum request body (Maks 100MB) untuk cegah DoS
		r.Body = http.MaxBytesReader(w, r.Body, 100<<20)

		if err := r.ParseMultipartForm(100 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Ukuran file melebihi batas maksimal 100MB"})
			return
		}

		file, handler, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal membaca file dari form-data"})
			return
		}
		defer file.Close()

		// KEAMANAN: Validasi ekstensi ketat
		ext := strings.ToLower(filepath.Ext(handler.Filename))
		allowedExts := map[string]bool{
			".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
			".mp4": true, ".mkv": true, ".mov": true, ".avi": true, ".mp3": true,
		}
		if !allowedExts[ext] {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Format file ditolak. Hanya diizinkan Gambar, Video, dan Audio"})
			return
		}

		// KEAMANAN: Cek magic bytes (512 byte pertama) untuk memastikan isi file asli
		headerBytes := make([]byte, 512)
		_, err = file.Read(headerBytes)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal memvalidasi konten file"})
			return
		}
		file.Seek(0, 0)

		detectedContentType := http.DetectContentType(headerBytes)
		// DIPERBARUI: Menambahkan validasi untuk format audio/
		if !strings.HasPrefix(detectedContentType, "image/") &&
			!strings.HasPrefix(detectedContentType, "video/") &&
			!strings.HasPrefix(detectedContentType, "audio/") {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Konten file tidak valid atau berbahaya"})
			return
		}

		// STRATEGI KECEPATAN: Pecah folder berdasarkan Tanggal (Tahun/Bulan/Hari)
		now := time.Now()
		dateFolder := filepath.Join(
			uploadDir,
			fmt.Sprintf("%d", now.Year()),
			fmt.Sprintf("%02d", now.Month()),
			fmt.Sprintf("%02d", now.Day()),
		)

		if _, err := os.Stat(dateFolder); os.IsNotExist(err) {
			if err := os.MkdirAll(dateFolder, 0755); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal mengalokasikan direktori server"})
				return
			}
		}

		// --- NAMA ASLI DIABAIKAN: Buat nama file singkat, rapi, dan aman ---
		shortRandom := generateShortRandomString(4)
		uniqueFilename := fmt.Sprintf("%d_%s%s", now.Unix(), shortRandom, ext)
		dstPath := filepath.Join(dateFolder, uniqueFilename)

		dst, err := os.Create(dstPath)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal menyimpan file ke disk server"})
			return
		}
		defer dst.Close()

		// KECEPATAN: Salin stream file dengan efisiensi tinggi
		if _, err := io.Copy(dst, file); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal menulis stream file"})
			return
		}

		// URL publik ringkas untuk disimpan ke Supabase Database
		fileURL := fmt.Sprintf("/media/%d/%02d/%02d/%s", now.Year(), now.Month(), now.Day(), uniqueFilename)

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ResponseJSON{
			Message: "Upload berhasil",
			URL:     fileURL,
		})
	})

	// Di dalam func main(), daftarkan endpoint delete:
	mux.HandleFunc("/delete", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Method not allowed"})
			return
		}

		// Ambil path file dari query parameter, misal: /delete?path=/media/2026/09/03/xxxx.png
		filePathParam := r.URL.Query().Get("path")
		if filePathParam == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Path file tidak boleh kosong"})
			return
		}

		// Ubah URL /media/... menjadi path lokal ./uploads/...
		// Contoh: /media/2026/09/03/file.jpg menjadi ./uploads/2026/09/03/file.jpg
		localPath := "." + strings.Replace(filePathParam, "/media", "/uploads", 1)

		// Hapus file dari disk server
		if err := os.Remove(localPath); err != nil {
			if os.IsNotExist(err) {
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(ResponseJSON{Error: "File fisik tidak ditemukan di server"})
				return
			}
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ResponseJSON{Error: "Gagal menghapus file dari server"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(ResponseJSON{Message: "File berhasil dihapus dari server"})
	})

	// Menggunakan Port Unik Pilihanmu (:48484)
	port := ":48484"
	fmt.Printf("🚀 Server Go Storage Formaly berjalan di port %s...\n", port)
	if err := http.ListenAndServe(port, secureHeaders(OnlyFromWebMiddleware(mux))); err != nil {
		fmt.Printf("Server error: %v\n", err)
	}
}