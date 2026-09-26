import { Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { lazy, Suspense, useEffect } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { easeOutExpo } from "./lib/motion"
import { AuthProvider } from "./lib/auth"
import { ThemeProvider } from "./lib/theme"
import { useAuth } from "./lib/auth-context"
import { supabase } from "./lib/supabase"
import Navbar from "./components/navbar"
import GuestOnly, { RequireOtpFlow, RequireResetFlow } from "./components/guestGuard"
import Dock from "./components/dock"
import CreatorSidebar from "./components/creator/sidebar"
import LoadingPage from "./components/loadingPage"
import AppSplash from "./components/AppSplash"
import { AlertToaster } from "./lib/alerts"
import { initTimeSync } from "./lib/networkTime"
import { setResetFlow } from "./lib/redirect"
import ErrorBoundary from "./components/ErrorBoundary"
import type { ReactNode } from "react"

initTimeSync()

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
const SettingsPage = lazy(() => import("./pages/settings"))
const CreditPage = lazy(() => import("./pages/credit"))
const UpgradeToCreator = lazy(() => import("./pages/upgradeToCreator"))
// SATU titik lazy() untuk area /admin (pola creator/index): home +
// userManagement eager dalam satu modul -> SATU chunk. Navigasi
// /admin <-> /admin/userManagement tidak download chunk kedua + tidak
// melempar Suspense fallback (halaman kosong) di tengah jalan.
const adminEntry = () => import("./pages/admin/index")
const AdminUsers = lazy(() => adminEntry().then((m) => ({ default: m.AdminHome })))
const AdminUserManagement = lazy(() => adminEntry().then((m) => ({ default: m.AdminUserManagement })))
const FormDescription = lazy(() => import("./pages/form/description"))
const FormResolver = lazy(() => import("./pages/form/resolver"))
const FormList = lazy(() => import("./pages/form/formlist"))
const ResultPage = lazy(() => import("./pages/form/result"))
const DonePage = lazy(() => import("./pages/form/done"))
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
const CreatorTokens = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorTokens })))
const CreatorSubmissions = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorSubmissions })))
const CreatorSubmissionDetail = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorSubmissionDetail })))
const CreatorShared = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorShared })))
const CreatorLayout = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorLayout })))
const CreatorProfile = lazy(() => creatorEntry().then((m) => ({ default: m.CreatorProfile })))
const CreatorGalileo = lazy(() => import("./pages/creator/galileo/chat"))
const CreatorGalileoGenerate = lazy(() => import("./pages/creator/galileo/generate"))
const ErrorHandling = lazy(() => import("./pages/errorHandling"))

const hideNavPaths = ["/login", "/register", "/auth", "/forgot-password", "/reset-password", "/form/description", "/form", "/form/list", "/form/result", "/credit", "/pages/errorHandling", "/settings", "/upgrade-to-creator", "/admin", "/admin/userManagement"]

// App hanya menyediakan provider. Konten asli (gated auth) ada di AppShell,
// biar useAuth() bisa dipanggil di dalam cakupan AuthProvider.
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
        <AlertToaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

// Isi app yang sesungguhnya. Selama auth masih dicek di first load / refresh,
// yang dirender hanya AppSplash — Router & semua halaman belum di-mount sama
// sekali, sehingga tidak ada flash UI-lalu-loading-lalu-UI.
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) navigate("/", { replace: true })
  }, [loading, user, profile, navigate])

  if (loading || !user || profile?.role !== "admin") return null
  return <>{children}</>
}

function AppShell() {
  const { profile, loading: authLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && profile?.role === "admin" && !location.pathname.startsWith("/admin")) {
      navigate("/admin", { replace: true })
    }
  }, [authLoading, profile, location.pathname, navigate])

  // Kalau user tiba lewat link reset (mungkin jatuh ke home/route lain karena
  // Site URL default), sesi recovery tetap diproses oleh supabase-js dan
  // memicu event PASSWORD_RECOVERY. Listener global ini memastikan user
  // selalu diarahkan ke /reset-password dari halaman mana pun.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetFlow()
        if (location.pathname !== "/reset-password") {
          navigate("/reset-password", { replace: true })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [location.pathname, navigate])
  const isCreator = location.pathname.startsWith("/creator") || (location.pathname === "/settings" && new URLSearchParams(location.search).get("mode") === "creator")

  // Path yang punya halaman nyata. Selain ini jatuh ke ErrorHandling (route "*"),
  // jadi Navbar umum & Dock disembunyikan biar halaman error tampil minim.
  const knownRoutes = ["/", "/history", "/profile", "/settings", "/credit", "/upgrade-to-creator", "/admin", "/admin/userManagement"]
  const isResultPage = location.pathname.startsWith("/form/result")
  const isDonePage = location.pathname.startsWith("/form/done")
  const isKnownRoute =
    knownRoutes.includes(location.pathname) ||
    /^\/creator(?:\/.*)?$/.test(location.pathname) ||
    /^\/form\/[^/]+$/.test(location.pathname) ||
    isResultPage ||
    isDonePage

  // Navbar umum & Dock disembunyikan pada daftar path di bawah (auth, form,
  // credit, dll.) — senada dengan aturan di lib/nav.ts (isGeneralNavVisible).
  const navHiddenHere =
    (hideNavPaths.includes(location.pathname) && !(location.pathname === "/settings" && isCreator)) ||
    /^\/form\/[^/]+$/.test(location.pathname) ||
    isResultPage ||
    isDonePage
  const hideNav = !isKnownRoute || navHiddenHere
  // Dock bottom nav khusus mobile: sama seperti Navbar, tapi tidak tampil di creator
  // dashboard maupun halaman yang menyembunyikan navigasi (auth, form resolver, dll).
  const showDock = !hideNav && !isCreator

  if (authLoading) return <AppSplash />

  return (
      <MotionConfig reducedMotion="user">
      <div className="bg-second dark:bg-base min-h-screen flex flex-col text-darks transition-colors duration-150">
        <ScrollToTop />
        <AnimatePresence initial={false}>
          {!hideNav && !isCreator && (
            <motion.div
              key="nav-general"
              className="sticky top-0 z-50 overflow-hidden"
              initial={{ height: 0, opacity: 0, y: -16 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -16 }}
              transition={{ duration: 0.38, ease: easeOutExpo }}
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
        <ErrorBoundary>
          {/* TIDAK ada lagi AnimatePresence/motion di level route.
              mode="wait" + fade-out bikin jeda halaman kosong tiap pindah route
              (probe: opacity wrapper 1 -> 0, ~8 frame textLen < 30, luma
              loncat) -> terbaca sebagai "kedip kayak fetching". Tiap halaman
              sudah punya animasi masuk sendiri (fadeSlide/stagger), jadi swap
              instan di sini justru mulus. Suspense di dalam supaya chunk lazy
              yang belum turun tidak ikut me-unmount Navbar/sidebar/Dock. */}
          <div
            className={`flex-1 ${showDock ? "pb-24 md:pb-0" : ""}`}
          >
            <Suspense fallback={<LoadingPage />}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/credit" element={<CreditPage />} />
            <Route path="/upgrade-to-creator" element={<UpgradeToCreator />} />
            <Route path="/admin" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
            <Route path="/admin/userManagement" element={<RequireAdmin><AdminUserManagement /></RequireAdmin>} />
            <Route path="/form/description" element={<FormDescription />} />
            <Route path="/form/:formId" element={<FormResolver />} />
            <Route path="/form/list" element={<FormList />} />
            <Route path="/form/result/:submissionId" element={<ResultPage />} />
            <Route path="/form/done/:submissionId" element={<DonePage />} />
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
                path="/creator/forms/:id/shared"
                element={
                  <CreatorGuard>
                    <CreatorShared />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/galileo"
                element={
                  <CreatorGuard>
                    <CreatorGalileo />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/profile"
                element={
                  <CreatorGuard>
                    <CreatorProfile />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/galileo/generate"
                element={
                  <CreatorGuard>
                    <CreatorGalileoGenerate />
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
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login />
                </GuestOnly>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnly>
                  <Register />
                </GuestOnly>
              }
            />
            <Route
              path="/auth"
              element={
                <RequireOtpFlow>
                  <Otp />
                </RequireOtpFlow>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <GuestOnly>
                  <ForgotPassword />
                </GuestOnly>
              }
            />
            <Route
              path="/reset-password"
              element={
                <RequireResetFlow>
                  <ResetPassword />
                </RequireResetFlow>
              }
            />
            <Route path="*" element={<ErrorHandling />} />
            </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
        {showDock && <Dock />}
      </div>
      </MotionConfig>
  )
}

export default App
