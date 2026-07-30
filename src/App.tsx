import { Routes, Route, useLocation } from "react-router-dom"
import { AuthProvider } from "./lib/auth"
import Login from "./pages/auth/login"
import Register from "./pages/auth/register"
import Otp from "./pages/auth/otp"
import Home from "./pages/home"
import History from "./pages/history"
import Profile from "./pages/profile"
import FormDescription from "./pages/form/description"
import FormPage from "./pages/form/form"
import FormList from "./pages/form/formlist"
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
          <Route path="/form/description" element={<FormDescription />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/form/list" element={<FormList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth" element={<Otp />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
