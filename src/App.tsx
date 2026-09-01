import { Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { lazy, Suspense, useEffect, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { easeOutExpo } from "./lib/motion"
import { AuthProvider } from "./lib/auth"
import { useAuth } from "./lib/auth-context"
import { supabase } from "./lib/supabase"
import Navbar from "./components/navbar"
import Dock from "./components/dock"
import CreatorSidebar from "./components/creator/sidebar"
import LoadingPage from "./components/loadingPage"
import AppSplash from "./components/AppSplash"
import { AlertToaster } from "./lib/alerts"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const Login = lazy(() => import("./pages/auth/login"))
const Register = lazy(() => import("./pages/auth/register"))
const Otp = lazy(() => import("./pages/auth/otp"))
const ForgotPassword = lazy(() => import("./pages/auth/forgotPassword"))
const ResetPassword = lazy(() => import("./pages/auth/resetPassword"))
const Home = lazy(() => import("./pages/home"))
const History = lazy(() => import("./pages/history"))
const Profile = lazy(() => import("./pages/profile"))
const CreditPage = lazy(() => import("./pages/credit"))
const AdminForms = lazy(() => import("./pages/admin/forms"))
const FormDescription = lazy(() => import("./pages/form/description"))
const FormResolver = lazy(() => import("./pages/form/resolver"))
const FormList = lazy(() => import("./pages/form/formlist"))
const ResultPage = lazy(() => import("./pages/form/result"))
// SATU titik lazy() untuk seluruh area /creator: semua halaman & guard diimpor
// eager lewat modul ini, jadi ketika chunk pertama kali diunduh, seluruh area
// creator ikut tersedia — bukan tiga chunk berurutan (layout → guard → halaman).
// Preload chunk terpisah sudah tidak diperlukan lagi.
const creatorEntry = () => import("./pages/creator/index")
const CreatorGuard = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorGuard })))
const CreatorDashboard = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorDashboard })))
const CreatorForms = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorForms })))
const CreatorResponden = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorResponden })))
const CreatorFormNew = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorFormNew })))
const CreatorFormEdit = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorFormEdit })))
const CreatorQuestions = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorQuestions })))
const CreatorFormSettings = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorFormSettings })))
const CreatorTokens = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorTokens })))
const CreatorSubmissions = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorSubmissions })))
const CreatorSubmissionDetail = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorSubmissionDetail })))
const CreatorFilterResponden = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorFilterResponden })))
const CreatorShared = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorShared })))
const CreatorLayout = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorLayout })))

const hideNavPaths = ["/login", "/register", "/auth", "/forgot-password", "/reset-password", "/form/description", "/form", "/form/list", "/form/result", "/credit"]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return isMobile
}

// App hanya menyediakan provider. Konten asli (gated auth) ada di AppShell,
// biar useAuth() bisa dipanggil di dalam cakupan AuthProvider.
function App() {
  return (
    <AuthProvider>
      <AppShell />
      <AlertToaster />
    </AuthProvider>
  )
}

// Isi app yang sesungguhnya. Selama auth masih dicek di first load / refresh,
// yang dirender hanya AppSplash — Router & semua halaman belum di-mount sama
// sekali, sehingga tidak ada flash UI-lalu-loading-lalu-UI.
function AppShell() {
  const { loading: authLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // Kalau user tiba lewat link reset (mungkin jatuh ke home/route lain karena
  // Site URL default), sesi recovery tetap diproses oleh supabase-js dan
  // memicu event PASSWORD_RECOVERY. Listener global ini memastikan user
  // selalu diarahkan ke /reset-password dari halaman mana pun.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [location.pathname, navigate])
  const isCreator = location.pathname.startsWith("/creator")
  const hideNav =
    hideNavPaths.includes(location.pathname) ||
    /^\/form\/[^/]+$/.test(location.pathname) ||
    (isMobile && location.pathname.startsWith("/form/result"))
  // Dock bottom nav khusus mobile: sama seperti Navbar, tapi tidak tampil di creator
  // dashboard maupun halaman yang menyembunyikan navigasi (auth, form resolver, dll).
  const showDock = !hideNav && !isCreator

  if (authLoading) return <AppSplash />

  return (
      <MotionConfig reducedMotion="user">
      <div className="bg-second min-h-screen flex flex-col">
        <ScrollToTop />
        <AnimatePresence mode="wait" initial={false}>
          {!hideNav && !isCreator && (
            <motion.div
              key="nav-general"
              className="sticky top-0 z-50"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: easeOutExpo }}
            >
              <Navbar />
            </motion.div>
          )}
          {!hideNav && isCreator && (
            <motion.div
              key="nav-creator"
              // initial=false: biar slide-in dikerjakan oleh sidebar-nya sendiri
              // (motion.aside x: -100% -> 0), bukan fade wrapper. exit tetap fade-out.
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CreatorSidebar />
            </motion.div>
          )}
        </AnimatePresence>
        <Suspense fallback={<LoadingPage />}>
          {/* Key = pathname agar tiap pindah halaman me-replay animasi pembukaan halaman */}
          <motion.div
            key={location.pathname}
            className={`flex-1 ${showDock ? "pb-24 md:pb-0" : ""}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOutExpo }}
          >
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/credit" element={<CreditPage />} />
            <Route path="/admin/forms" element={<AdminForms />} />
            <Route path="/form/description" element={<FormDescription />} />
            <Route path="/form/:formId" element={<FormResolver />} />
            <Route path="/form/list" element={<FormList />} />
            <Route path="/form/result/:submissionId" element={<ResultPage />} />
            <Route
              element={<CreatorLayout />}
            >
              <Route
                path="/creator"
                element={<CreatorDashboard />}
              />              <Route
                path="/creator/forms"
                element={
                  <CreatorGuard>
                    <CreatorForms />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/responden"
                element={
                  <CreatorGuard>
                    <CreatorResponden />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/new"
                element={
                  <CreatorGuard>
                    <CreatorFormNew />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id"
                element={
                  <CreatorGuard>
                    <CreatorFormEdit />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/questions"
                element={
                  <CreatorGuard>
                    <CreatorQuestions />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/settings"
                element={
                  <CreatorGuard>
                    <CreatorFormSettings />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/tokens"
                element={
                  <CreatorGuard>
                    <CreatorTokens />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/submissions"
                element={
                  <CreatorGuard>
                    <CreatorSubmissions />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/filter"
                element={
                  <CreatorGuard>
                    <CreatorFilterResponden />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/shared"
                element={
                  <CreatorGuard>
                    <CreatorShared />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms/:id/submissions/:submissionId"
                element={
                  <CreatorGuard>
                    <CreatorSubmissionDetail />
                  </CreatorGuard>
                }
              />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth" element={<Otp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
          </motion.div>
        </Suspense>
        {showDock && <Dock />}
      </div>
      </MotionConfig>
  )
}

export default App
