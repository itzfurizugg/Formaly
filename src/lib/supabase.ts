import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings.",
  );
}

// Session disimpan di localStorage (default supabase-js), bukan cookie.
// Cookie sebelumnya bikin user tiba-tiba logout karena:
// 1. Ekstensi/setting browser ("clear cookies on exit", Cookie AutoDelete, dll)
//    menghapus cookie saat tab ditutup/browser keluar — sementara localStorage
//    tetap aman. Session hilang -> aplikasi membaca "belum login".
// 2. Batas ukuran per-cookie ±4KB: JWT access_token + refresh_token yang
//    di-URL-encode bisa melampaui batas itu dan browser MENOLAK cookie secara
//    diam-diam (tanpa error) saat token di-refresh, sehingga sesi "menguap".
// localStorage tidak punya kedua masalah tersebut dan tetap persisten lintas
// tab + sinkron otomatis antar tab oleh supabase-js.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "formaly-auth-token",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
