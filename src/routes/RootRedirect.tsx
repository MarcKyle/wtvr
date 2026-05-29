import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Loader from '../components/common/Loader'
import { ROUTES } from '../constants/routes'
import { homeForRole } from './homeForRole'

// Resolves the root path. Login is the entry point of the app, so visitors
// without a session are sent to /login. Authenticated users land on the
// home that matches their role.
function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <Loader />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  return <Navigate to={homeForRole(user.role)} replace />
}

export default RootRedirect
