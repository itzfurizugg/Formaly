import { Routes, Route, useLocation } from "react-router-dom"
import { lazy, Suspense, useEffect, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { AuthProvider } from "./lib/auth"
import Navbar from "./components/navbar"
import Dock from "./components/dock"
import CreatorSidebar from "./components/creator/sidebar"
import { AlertToaster } from "./lib/alerts"

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
const CreatorGuard = lazy(() => import("./pages/creator/guard"))
// Loader dipisah agar bisa dipakai ulang untuk preload chunk saat guard
// mengecek role (unduhan bundle paralel dengan query role, bukan menunggu).
const loadCreatorDashboard = () => import("./pages/creator/dashboard")
const CreatorDashboard = lazy(loadCreatorDashboard)
const CreatorForms = lazy(() => import("./pages/creator/forms"))
const CreatorResponden = lazy(() => import("./pages/creator/responden"))
const CreatorFormNew = lazy(() => import("./pages/creator/formNew"))
const CreatorFormEdit = lazy(() => import("./pages/creator/formEdit"))
const CreatorQuestions = lazy(() => import("./pages/creator/questions"))
const CreatorFormSettings = lazy(() => import("./pages/creator/formSettings"))
const CreatorTokens = lazy(() => import("./pages/creator/tokens"))
const CreatorSubmissions = lazy(() => import("./pages/creator/submissions"))
const CreatorSubmissionDetail = lazy(() => import("./pages/creator/submissionDetail"))
const CreatorShared = lazy(() => import("./pages/creator/shared"))
const CreatorLayout = lazy(() => import("./pages/creator/layout"))

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

function App() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const isCreator = location.pathname.startsWith("/creator")
  const hideNav =
    hideNavPaths.includes(location.pathname) ||
    /^\/form\/[^/]+$/.test(location.pathname) ||
    (isMobile && location.pathname.startsWith("/form/result"))
  // Dock bottom nav khusus mobile: sama seperti Navbar, tapi tidak tampil di creator
  // dashboard maupun halaman yang menyembunyikan navigasi (auth, form resolver, dll).
  const showDock = !hideNav && !isCreator

  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
      <div className="bg-second min-h-screen">
        <AnimatePresence mode="wait" initial={false}>
          {!hideNav && !isCreator && (
            <motion.div
              key="nav-general"
              className="sticky top-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Navbar />
            </motion.div>
          )}
          {!hideNav && isCreator && (
            <motion.div
              key="nav-creator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CreatorSidebar />
            </motion.div>
          )}
        </AnimatePresence>
        <Suspense>
          {/* Key = pathname agar tiap pindah halaman me-replay animasi pembukaan halaman */}
          <motion.div
            key={location.pathname}
            className={`min-h-screen ${showDock ? "pb-24 md:pb-0" : ""}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
            <Route element={<CreatorLayout />}>
              <Route
                path="/creator"
                element={
                  <CreatorGuard preload={loadCreatorDashboard}>
                    <CreatorDashboard />
                  </CreatorGuard>
                }
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
      <AlertToaster />
    </AuthProvider>
  )
}

export default App
