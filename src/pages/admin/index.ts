// Entry tunggal area /admin. Dua halaman diimpor eager di sini sehingga
// Vite menyatukannya jadi SATU chunk (pola creator/index). Navigasi
// /admin <-> /admin/userManagement tidak download chunk kedua + tidak
// lempar Suspense fallback (halaman kosong) di tengah.
export { default as AdminHome } from "./home"
export { default as AdminUserManagement } from "./users"
