import { Navigate } from 'react-router-dom'

/**
 * Route guard that only allows ADMIN users through.
 * Redirects unauthenticated users to /login.
 * Redirects RECRUITER users to /dashboard.
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken')
  const role = localStorage.getItem('userRole')

  if (!token) return <Navigate to="/login" replace />
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
