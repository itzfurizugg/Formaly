import { createClient, type SupportedStorage } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings.",
  );
}

const STORAGE_KEY = "formaly-auth-token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getCookie(name: string): string | null {
  const prefix = `${name}=`
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

function removeCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`
}

const cookieStorage: SupportedStorage = {
  getItem: (key) => Promise.resolve(getCookie(key)),
  setItem: (key, value) => {
    setCookie(key, value)
    return Promise.resolve()
  },
  removeItem: (key) => {
    removeCookie(key)
    return Promise.resolve()
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: STORAGE_KEY,
    storage: cookieStorage,
    userStorage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const { error } = await supabase.rpc('delete_form', { p_form_id: formId });

if (error) {
  console.error('Gagal hapus form:', error.message);
} else {
  // sukses, misal refresh list form atau redirect
}