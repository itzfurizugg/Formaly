import { useEffect, useRef, useState, type ReactNode } from "react"
import { supabase } from "./supabase"
import type { User, EmailOtpType } from "@supabase/supabase-js"
import { AuthContext, type Profile } from "./auth-context"
import { pageClear } from "./pageCache"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // Dedupe fetch profil: getSession() dan event INITIAL_SESSION sama-sama
  // menembak query users saat load. Promise di-share per user id sehingga
  // request hanya dikirim sekali per sesi (updateProfile memaksa refresh).
  const profileReqRef = useRef<{ userId: string; promise: Promise<void> } | null>(null)

  function fetchProfile(u: User, force = false): Promise<void> {
    const existing = profileReqRef.current
    if (!force && existing && existing.userId === u.id) return existing.promise

    // Entry dibuat dulu supaya blok catch bisa mengidentifikasi request-nya.
    const entry: { userId: string; promise: Promise<void> } = { userId: u.id, promise: Promise.resolve() }
    entry.promise = (async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("name, email, role, created_at")
          .eq("id", u.id)
          .single()
        if (data) setProfile(data)
        else setProfile({ name: (u.user_metadata?.name as string) || "User", email: u.email || "" })
      } catch {
        // Gagal jaringan: reset agar event auth berikutnya bisa mencoba lagi.
        if (profileReqRef.current === entry) profileReqRef.current = null
      }
    })()
    profileReqRef.current = entry
    return entry.promise
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else {
        setProfile(null)
        profileReqRef.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function register(name: string, email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
  }

  async function resendOtp(email: string, type: "signup" | "email_change" = "signup") {
    const { error } = await supabase.auth.resend({
      type,
      email,
    })
    if (error) throw error
  }

  async function sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    })
    if (error) throw error
  }

  async function verifyOtp(email: string, token: string, type: EmailOtpType = "signup") {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    })
    if (error) throw error

    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      const name = (u.user_metadata?.name as string) || "User"
      // Jangan timpa role yang sudah ada (creator/admin) saat login via OTP.
      // Hanya insert role "user" bila baris users belum ada.
      const { data: existing } = await supabase.from("users").select("role").eq("id", u.id).maybeSingle()
      const role = existing?.role ?? "user"
      await supabase.from("users").upsert({ id: u.id, name, email: u.email, role })
      setUser(u)
      setProfile({ name, email: u.email || "" })
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function updateProfile(name: string, email: string) {
    if (!user) return
    const { data } = await supabase.auth.getSession()
    const current = data.session?.user ?? user

    let authUser = current
    if (name && name !== (profile?.name ?? "")) {
      const { data: authData, error } = await supabase.auth.updateUser({ data: { name } })
      if (error) throw error
      if (authData?.user) authUser = authData.user
    }
    if (email && email !== current.email) {
      const { data: authData, error } = await supabase.auth.updateUser({ email })
      if (error && !String(error.message).toLowerCase().includes("already registered")) {
        throw error
      }
      if (authData?.user) authUser = authData.user
    }

    const updatedName = name || profile?.name || authUser.user_metadata?.name || "User"
    const updatedEmail = email || profile?.email || authUser.email || ""

    // Simpan ke tabel users lewat RPC SECURITY DEFINER (bebas hambatan RLS,
    // pola yang sama dengan apply_as_creator/set_form_tags/delete_form).
    // Fungsi ini memverifikasi auth.uid() di sisi server dan hanya mengubah
    // baris milik user yang sedang login, lalu mengembalikan baris terbaru.
    const { data: updateData, error: updateErr } = await supabase.rpc("update_my_profile", {
      p_name: updatedName,
      p_email: updatedEmail,
    })
    if (updateErr) {
      throw new Error(String(updateErr.message || "Gagal menyimpan profil ke database."))
    }
    if (!updateData) {
      throw new Error("Perubahan tidak tersimpan. Pastikan migration update_my_profile sudah dijalankan di Supabase.")
    }

    setUser(authUser)
    const newProfile: Profile = {
      name: updateData.name || updatedName,
      email: updateData.email || updatedEmail,
      role: updateData.role ?? profile?.role ?? "user",
      created_at: updateData.created_at ?? profile?.created_at,
    }
    setProfile(newProfile)
    profileReqRef.current = null
  }

  async function logout() {
    await supabase.auth.signOut()
    pageClear()
  }

  // Memuat ulang data profil dari database (dipakai setelah upgrade role,
  // mis. apply_as_creator, supaya role baru langsung terlihat di UI).
  async function refreshProfile() {
    if (!user) return
    try {
      const { data } = await supabase
        .from("users")
        .select("name, email, role, created_at")
        .eq("id", user.id)
        .single()
      if (data) setProfile(data)
      profileReqRef.current = null
    } catch {
      // Gagal jaringan: biarkan profil lama tetap tampil.
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        resendOtp,
        sendOtp,
        verifyOtp,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

