import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../hooks/useAuth'

// Admin-only console: user management, role changes, audit log viewer.
function Admin() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate(ROUTES.LOGIN, { replace: true })
    }
  }

  return (
    <section>
      <h1>Admin Console</h1>
      <p>Manage users, roles, and view activity logs.</p>
      <Button onClick={handleLogout}>Log out</Button>
    </section>
  )
}

export default Admin
