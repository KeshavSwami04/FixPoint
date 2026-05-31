import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import StaffDashboard from './pages/StaffDashboard'
import HousekeepingDashboard from './pages/HousekeepingDashboard'
import CaretakerDashboard from './pages/CaretakerDashboard'

const DASHBOARDS = {
  student:     <StudentDashboard />,
  staff:       <StaffDashboard />,
  housekeeping:<HousekeepingDashboard />,
  caretaker:   <CaretakerDashboard />,
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function Dashboard() {
  const { user } = useAuth()
  return DASHBOARDS[user?.role] || (
    <div className="text-slate-400 p-8">Unknown role: {user?.role}</div>
  )
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar />
      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
