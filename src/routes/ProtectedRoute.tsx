import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import Loader from '../components/common/Loader'
import type { Role } from '../constants/roles'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: Role[]
  fallback?: ReactNode
}

// Frontend gate. Server must still enforce the same rules on every request.
function ProtectedRoute({
  children,
  allowedRoles,
  fallback = null,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) return <Loader />
  if (!user) return <>{fallback}</>
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default ProtectedRoute
