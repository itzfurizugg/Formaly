import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { lazy, Suspense, useEffect, useState } from "react"
import { AuthProvider } from "./lib/auth"
import Loading from "./components/loading"
import Navbar from "./components/navbar"
import { AlertToaster } from "./lib/alerts"

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
const FormPage = lazy(() => import("./pages/form/form"))
const FormList = lazy(() => import("./pages/form/formlist"))
const ResultPage = lazy(() => import("./pages/form/result"))

import CreatorGuard from "./pages/creator/guard"
import CreatorDashboard from "./pages/creator/dashboard"
import CreatorFormNew from "./pages/creator/formNew"
import CreatorFormEdit from "./pages/creator/formEdit"
import CreatorQuestions from "./pages/creator/questions"
import CreatorTokens from "./pages/creator/tokens"
import CreatorSubmissions from "./pages/creator/submissions"
import CreatorSubmissionDetail from "./pages/creator/submissionDetail"
import CreatorShared from "./pages/creator/shared"
import CreatorLayout from "./pages/creator/layout"

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
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/forms" element={<AdminForms />} />
          <Route path="/form/description" element={<FormDescription />} />
          <Route path="/form/:formId" element={<FormPage />} />
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
        </Suspense>
      </div>
      <AlertToaster />
    </AuthProvider>
  )
}

export default App
