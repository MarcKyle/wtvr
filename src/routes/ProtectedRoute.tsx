import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Loader from '../components/common/Loader'
import type { Role } from '../constants/roles'
import { ROUTES } from '../constants/routes'
import { homeForRole } from './homeForRole'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: Role[]
}

// Frontend gate. Server must still enforce the same rules on every request.
// Unauthenticated users are sent to /login (the app's entry point).
// Authenticated users with the wrong role land on their own home instead.
function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loader />

  if (!user) {
    return (
      <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />
    )
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
