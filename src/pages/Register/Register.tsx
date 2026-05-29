import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES, REGISTRATION_ROLES, type Role } from '../../constants/roles'
import { ROUTES } from '../../constants/routes'
import { homeForRole } from '../../routes/homeForRole'
import { isStrongPassword, isValidEmail } from '../../utils/validators'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loader from '../../components/common/Loader'

const ROLE_LABELS: Record<Role, { title: string; hint: string }> = {
  [ROLES.READER]: {
    title: 'Reader',
    hint: 'Browse and read posts from the community.',
  },
  [ROLES.AUTHOR]: {
    title: 'Author',
    hint: 'Publish your own text posts and manage them.',
  },
  [ROLES.ADMIN]: {
    title: 'Admin',
    hint: 'Reserved. Admins are provisioned by the system.',
  },
}

// Register page. Lets visitors create a Reader or Author account; Admin is
// not selectable here and is provisioned server-side.
function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<Role>(ROLES.READER)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <Loader />
  if (user) return <Navigate to={homeForRole(user.role)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!isStrongPassword(password)) {
      setError(
        'Password must be at least 8 characters with upper- and lowercase letters, a number, and a symbol.',
      )
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const authed = await register({ email, password, role })
      navigate(homeForRole(authed.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-subtitle">Pick how you want to use WTVR.</p>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="role-picker">
            <legend>I want to join as</legend>
            {REGISTRATION_ROLES.map((value) => (
              <label key={value} className="role-option">
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                <span>
                  <strong>{ROLE_LABELS[value].title}</strong>
                  <small>{ROLE_LABELS[value].hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <Input
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="register-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            id="register-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="auth-submit">
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
