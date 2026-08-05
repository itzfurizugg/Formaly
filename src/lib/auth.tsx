import { useEffect, useState, type ReactNode } from "react"
import { supabase } from "./supabase"
import type { User, EmailOtpType } from "@supabase/supabase-js"
import { AuthContext, type Profile } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(u: User) {
    const { data } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", u.id)
      .single()
    if (data) setProfile(data)
    else setProfile({ name: (u.user_metadata?.name as string) || "User", email: u.email || "" })
  }

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
      await supabase.from("users").upsert({ id: u.id, name, email: u.email, role: "user" })
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

    if (email && email !== current.email) {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
    }
    if (name && name !== (profile?.name ?? "")) {
      const { error } = await supabase.auth.updateUser({ data: { name } })
      if (error) throw error
    }
    const { error } = await supabase
      .from("users")
      .update({ name, email })
      .eq("id", current.id)
    if (error) throw error

    const { data: fresh } = await supabase.auth.getSession()
    if (fresh.session?.user) await fetchProfile(fresh.session.user)
  }

  async function logout() {
    await supabase.auth.signOut()
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

