import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { homeForRole } from '../../routes/homeForRole'
import { isValidEmail } from '../../utils/validators'
import { getErrorMessage } from '../../constants/errors'
import { ApiError } from '../../lib/api'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'

type LocationState = { from?: string } | null

function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <Loader />
  if (user) return <Navigate to={from ?? homeForRole(user.role)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setSubmitting(true)
    try {
      const authed = await login({ email, password })
      navigate(from ?? homeForRole(authed.role), { replace: true })
    } catch (err) {
      // MKJ 05/29/26 Map error code to user-friendly message
      if (err instanceof ApiError) {
        setError(getErrorMessage(err.code))
      } else {
        setError(err instanceof Error ? err.message : 'Sign in failed.')
      }
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
            Write&nbsp;whatever.<br />
            Read&nbsp;whatever.
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

          <h2 className="login-split__title">Welcome back</h2>
          <p className="login-split__subtitle">Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate className="login-split__form">
            <div className="login-field">
              <label htmlFor="login-email" className="login-field__label">
                Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="login-field__label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="login-split__footer">
            New here?{' '}
            <Link to={ROUTES.REGISTER} className="login-split__link">
              Create an account
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

export default Login
