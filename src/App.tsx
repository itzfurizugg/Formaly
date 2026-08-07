import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { lazy, Suspense, useEffect, useState } from "react"
import { AuthProvider } from "./lib/auth"
import Loading from "./components/loading"
import Navbar from "./components/navbar"
import { AlertToaster } from "./lib/alerts"
import { isCreatorSubdomain } from "./lib/redirect"

const Login = lazy(() => import("./pages/auth/login"))
const Register = lazy(() => import("./pages/auth/register"))
const Otp = lazy(() => import("./pages/auth/otp"))
const ForgotPassword = lazy(() => import("./pages/auth/forgotPassword"))
const ResetPassword = lazy(() => import("./pages/auth/resetPassword"))
const Home = lazy(() => import("./pages/home"))
const History = lazy(() => import("./pages/history"))
const Profile = lazy(() => import("./pages/profile"))
const AdminForms = lazy(() => import("./pages/admin/forms"))
const FormDescription = lazy(() => import("./pages/form/description"))
const FormResolver = lazy(() => import("./pages/form/resolver"))
const FormList = lazy(() => import("./pages/form/formlist"))
const ResultPage = lazy(() => import("./pages/form/result"))
const CreatorGuard = lazy(() => import("./pages/creator/guard"))
const CreatorDashboard = lazy(() => import("./pages/creator/dashboard"))
const CreatorFormNew = lazy(() => import("./pages/creator/formNew"))
const CreatorFormEdit = lazy(() => import("./pages/creator/formEdit"))
const CreatorQuestions = lazy(() => import("./pages/creator/questions"))
const CreatorTokens = lazy(() => import("./pages/creator/tokens"))
const CreatorSubmissions = lazy(() => import("./pages/creator/submissions"))
const CreatorSubmissionDetail = lazy(() => import("./pages/creator/submissionDetail"))
const CreatorShared = lazy(() => import("./pages/creator/shared"))
const CreatorLayout = lazy(() => import("./pages/creator/layout"))

const hideNavPaths = ["/login", "/register", "/auth", "/forgot-password", "/reset-password", "/form/description", "/form", "/form/list", "/form/result"]

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
  // Di subdomain creator (creator-formaly.vercel.app), halaman "/" diarahkan
  // otomatis ke /creator. /creator tetap bisa diakses normal dari domain utama.
  const creatorSubdomain = isCreatorSubdomain()
  const hideNav =
    hideNavPaths.includes(location.pathname) ||
    /^\/form\/[^/]+$/.test(location.pathname) ||
    location.pathname.startsWith("/creator") ||
    (isMobile && location.pathname.startsWith("/form/result"))

  return (
    <AuthProvider>
      <div className="bg-second min-h-screen">
        {!hideNav && <Navbar />}
        <Suspense fallback={<Loading />}>
          {/* Key = pathname agar tiap pindah halaman me-replay animasi pembukaan halaman */}
          <div key={location.pathname} className="min-h-screen animate-page-enter">
            <Routes>
            <Route
              path="/"
              element={creatorSubdomain ? <Navigate to="/creator" replace /> : <Home />}
            />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/forms" element={<AdminForms />} />
            <Route path="/form/description" element={<FormDescription />} />
            <Route path="/form/:formId" element={<FormResolver />} />
            <Route path="/form/list" element={<FormList />} />
            <Route path="/form/result/:submissionId" element={<ResultPage />} />
            <Route element={<CreatorLayout />}>
              <Route
                path="/creator"
                element={
                  <CreatorGuard>
                    <CreatorDashboard />
                  </CreatorGuard>
                }
              />
              <Route
                path="/creator/forms"
                element={<Navigate to="/creator" replace />}
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
          </div>
        </Suspense>
      </div>
      <AlertToaster />
    </AuthProvider>
  )
}

export default App
