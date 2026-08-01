import { Routes, Route, useLocation } from "react-router-dom"
import { AuthProvider } from "./lib/auth"
import Login from "./pages/auth/login"
import Register from "./pages/auth/register"
import Otp from "./pages/auth/otp"
import Home from "./pages/home"
import History from "./pages/history"
import Profile from "./pages/profile"
import AdminForms from "./pages/admin/forms"
import FormDescription from "./pages/form/description"
import FormPage from "./pages/form/form"
import FormList from "./pages/form/formlist"
import CreatorGuard from "./pages/creator/guard"
import CreatorDashboard from "./pages/creator/dashboard"
import CreatorForms from "./pages/creator/forms"
import CreatorFormNew from "./pages/creator/formNew"
import CreatorFormEdit from "./pages/creator/formEdit"
import CreatorQuestions from "./pages/creator/questions"
import CreatorTokens from "./pages/creator/tokens"
import CreatorSubmissions from "./pages/creator/submissions"
import CreatorSubmissionDetail from "./pages/creator/submissionDetail"
import Navbar from "./components/navbar"

const hideNavPaths = ["/login", "/register", "/auth", "/form/description", "/form", "/form/list"]

function App() {
  const location = useLocation()
  const hideNav = hideNavPaths.includes(location.pathname)

  return (
    <AuthProvider>
      <div className="bg-second min-h-screen">
        {!hideNav && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/forms" element={<AdminForms />} />
          <Route path="/form/description" element={<FormDescription />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/form/list" element={<FormList />} />
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
            element={
              <CreatorGuard>
                <CreatorForms />
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
            path="/creator/forms/:id/submissions/:submissionId"
            element={
              <CreatorGuard>
                <CreatorSubmissionDetail />
              </CreatorGuard>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth" element={<Otp />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
