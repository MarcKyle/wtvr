import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES, REGISTRATION_ROLES, type Role } from '../../constants/roles'
import { ROUTES } from '../../constants/routes'
import { homeForRole } from '../../routes/homeForRole'
import { isStrongPassword, isValidEmail } from '../../utils/validators'
import Button from '../../components/common/Button'
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
    <div className="login-split">
      {/* ── Left panel ── */}
      <div className="login-split__left" aria-hidden="true">
        <div className="login-split__left-inner">
          <span className="login-split__brand-mark">wtvr</span>
          <h1 className="login-split__headline">
            Join&nbsp;the&nbsp;community.<br />
            Your&nbsp;voice&nbsp;matters.
          </h1>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-split__right">
        <div className="login-split__form-wrap">
          {/* Logo */}
          <div className="login-split__logo" aria-label="WTVR">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
              <rect width="40" height="40" rx="10" fill="var(--login-accent)" />
              <text
                x="50%"
                y="54%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="#fff"
                fontSize="13"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
                letterSpacing="-0.5"
              >
                wtvr
              </text>
            </svg>
          </div>

          <h2 className="login-split__title">Create your account</h2>
          <p className="login-split__subtitle">Pick how you want to use WTVR.</p>

          <form onSubmit={handleSubmit} noValidate className="login-split__form">
            {/* Role picker */}
            <fieldset className="reg-role-picker">
              <legend className="reg-role-picker__legend">I want to join as</legend>
              <div className="reg-role-picker__options">
                {REGISTRATION_ROLES.map((value) => (
                  <label
                    key={value}
                    className={`reg-role-option${role === value ? ' reg-role-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      className="reg-role-option__input"
                    />
                    <span className="reg-role-option__body">
                      <strong className="reg-role-option__title">{ROLE_LABELS[value].title}</strong>
                      <small className="reg-role-option__hint">{ROLE_LABELS[value].hint}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="login-field">
              <label htmlFor="register-email" className="login-field__label">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-field__input"
                placeholder="you@example.com"
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-password" className="login-field__label">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-field__input"
                placeholder="••••••••"
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-confirm" className="login-field__label">
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="login-field__input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="login-split__error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="login-split__submit">
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="login-split__footer">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="login-split__link">
              Sign in
            </Link>
          </p>

          <p className="login-split__footer" style={{ marginTop: '8px' }}>
            <Link to={ROUTES.ROOT} className="login-split__link login-split__link--muted">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
