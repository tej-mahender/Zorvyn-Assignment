import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecordsPage from './pages/RecordsPage'
import UsersPage from './pages/UsersPage'
import AuditPage from './pages/AuditPage'

function Protected({ children, require: perm }) {
  const { user, loading, can } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><div className="spinner" style={{width:32,height:32}} /></div>
  if (!user) return <Navigate to="/login" replace />
  if (perm && !can(perm)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Protected require="dashboard:read"><DashboardPage /></Protected>} />
            <Route path="records"   element={<Protected require="records:read"><RecordsPage /></Protected>} />
            <Route path="users"     element={<Protected require="users:read"><UsersPage /></Protected>} />
            <Route path="audit"     element={<Protected require="audit:read"><AuditPage /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
