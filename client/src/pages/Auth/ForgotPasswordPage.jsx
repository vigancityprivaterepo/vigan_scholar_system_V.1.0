import { useEffect, useMemo, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { ArrowRightIcon } from '../../components/ui/PortalIcons'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const emailFromQuery = searchParams.get('email') || ''
  const isResetMode = Boolean(token && emailFromQuery)

  const [email, setEmail] = useState(emailFromQuery)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false })

  useEffect(() => {
    const sameOriginReferrer = document.referrer && new URL(document.referrer).origin === window.location.origin
    const needsFallbackHistory = !sameOriginReferrer && window.history.length <= 2

    if (!needsFallbackHistory) return

    window.history.pushState({ authFallback: true }, '', window.location.href)

    const handlePopState = () => {
      navigate('/', { replace: true, state: { fromAuthFallback: location.pathname } })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [location.pathname, navigate])

  const title = useMemo(() => (isResetMode ? 'Reset Password' : 'Forgot Password'), [isResetMode])
  const description = useMemo(
    () =>
      isResetMode
        ? 'Choose a new password for your scholarship portal account.'
        : 'Enter your registered email address to receive a password reset link.',
    [isResetMode]
  )

  const noticeTitle = isResetMode ? 'Password Update' : 'Reset Assistance'
  const noticeText = isResetMode
    ? 'Use a new password with at least 8 characters to secure your applicant portal access.'
    : 'A reset link will be sent to your registered email address if your account is found in the portal.'

  const fieldErrors = useMemo(() => {
    const nextErrors = {}

    if (!isResetMode) {
      if (!email.trim()) nextErrors.email = 'Email address is required.'
      else if (!emailPattern.test(email.trim())) nextErrors.email = 'Enter a valid email address.'
    }

    if (isResetMode) {
      if (!password) nextErrors.password = 'Password is required.'
      else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'

      if (!confirm) nextErrors.confirm = 'Please confirm your password.'
      else if (confirm !== password) nextErrors.confirm = 'Passwords do not match.'
    }

    return nextErrors
  }, [confirm, email, isResetMode, password])

  const canSubmit = Object.keys(fieldErrors).length === 0 && !loading

  const visibleEmailError = touched.email ? fieldErrors.email : ''
  const visiblePasswordError = touched.password ? fieldErrors.password : ''
  const visibleConfirmError = touched.confirm ? fieldErrors.confirm : ''

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: false, confirm: false })
    if (fieldErrors.email) return

    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() })
      toast.success(res.data.message)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process request.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setTouched({ email: false, password: true, confirm: true })
    if (fieldErrors.password || fieldErrors.confirm) return

    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        email: emailFromQuery,
        password,
      })
      toast.success(res.data.message)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
      <div className="sticky top-0 z-50 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="max-w-full text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:max-w-none sm:text-xs sm:tracking-[0.2em]">
            Republic of the Philippines
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:flex-nowrap sm:gap-5 sm:text-xs">
            <a href="#" className="transition-colors hover:text-brand-primary">Scholarship Guidelines</a>
            <Link to="/login" className="transition-colors hover:text-brand-primary">Applicant Login</Link>
          </div>
        </div>

        <header className="flex min-h-[76px] items-center justify-between bg-gradient-to-r from-[#0f3d6d] via-[#164f8c] to-[#0f3d6d] px-4 py-3 sm:h-20 sm:min-h-0 sm:px-10 sm:py-0">
          <div className="flex min-w-0 items-center gap-3 sm:gap-[18px]">
            <img src={logo} alt="Vigan City Seal" className="h-11 w-11 shrink-0 object-contain sm:h-[52px] sm:w-[52px]" />
            <div className="min-w-0 border-l border-white/25 pl-3 sm:pl-[18px]">
              <div className="mb-[3px] text-[9px] uppercase tracking-[0.12em] text-white/60 sm:text-[10px] sm:tracking-[0.15em]">Heritage City Scholarship Portal</div>
              <h1 className="font-display text-[15px] font-bold leading-tight text-white sm:text-xl sm:leading-none">City Government of Vigan</h1>
              <div className="mt-[3px] text-[9px] uppercase tracking-[0.08em] text-white/50 sm:text-[10px] sm:tracking-[0.1em]">Province of Ilocos Sur</div>
            </div>
          </div>
          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: 'Overview', href: '/#overview' },
              { label: 'Application Process', href: '/#how-it-works' },
              { label: 'Benefits', href: '/#benefits' },
              { label: 'FAQs', href: '/#faq' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="text-[13px] text-white/75 transition-colors hover:text-white">{item.label}</a>
            ))}
          </nav>
        </header>

        <div className="flex justify-center border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex w-full max-w-md">
            <Link
              to="/login"
              className={`flex-1 rounded-l px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] sm:px-8 ${
                isResetMode ? 'border border-[#dde2ec] bg-white text-[#1E1B4B]' : 'bg-[#1E1B4B] text-white'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/forgot-password"
              className={`flex-1 rounded-r px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] sm:px-8 ${
                isResetMode ? 'bg-[#1E1B4B] text-white' : 'border border-[#dde2ec] bg-white text-[#1E1B4B]'
              }`}
            >
              {isResetMode ? 'Reset Password' : 'Recover Access'}
            </Link>
          </div>
        </div>
      </div>

      <main className="flex flex-1 items-start justify-center px-4 py-6 pb-16 sm:px-6">
        <div className="w-full max-w-lg overflow-hidden rounded-lg shadow-[0_8px_40px_rgba(30,27,75,0.14)]">
          <div className="flex flex-col bg-white p-8 md:p-12">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0D9488]">Applicant Services</div>
            <h2 className="mb-1.5 text-2xl font-bold text-[#1E1B4B]">{title}</h2>
            <p className="mb-7 text-sm leading-[1.6] text-slate-500">
              {description}
            </p>

            <div className="mb-7 rounded-r border-l-[3px] border-[#1E1B4B] bg-[#f8f6ef] px-4 py-3 text-xs leading-[1.6] text-slate-600">
              <strong className="mb-[3px] block text-[10px] uppercase tracking-[0.12em] text-[#1E1B4B]">{noticeTitle}</strong>
              {noticeText}
            </div>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            {!isResetMode ? (
              <form onSubmit={handleRequestReset} noValidate className="flex flex-1 flex-col gap-5">
                <div>
                  <label htmlFor="forgot-email" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className={`portal-input ${visibleEmailError ? '!border-red-400' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    onBlur={() => setTouched(current => ({ ...current, email: true }))}
                    aria-invalid={Boolean(visibleEmailError)}
                    aria-describedby={visibleEmailError ? 'forgot-email-error' : 'forgot-email-help'}
                    required
                  />
                  {visibleEmailError ? (
                    <p id="forgot-email-error" className="mt-2 text-sm text-red-600">{visibleEmailError}</p>
                  ) : (
                    <p id="forgot-email-help" className="mt-1.5 text-[11px] text-slate-400">
                      Use the email address linked to your scholarship portal account.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[#1E1B4B] px-6 py-3.5 text-sm font-semibold tracking-[0.04em] text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#2d2a6e] hover:shadow-[0_4px_16px_rgba(30,27,75,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                  {!loading && <ArrowRightIcon className="h-4 w-4" />}
                </button>

                <div className="mt-auto flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <span className="text-[13px] text-slate-600">Remembered your password?</span>
                  <Link
                    to="/login"
                    className="border-b border-[#1E1B4B]/30 pb-px text-[13px] font-semibold text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
                  >
                    Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} noValidate className="flex flex-1 flex-col gap-5">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={emailFromQuery}
                    disabled
                    className="portal-input bg-slate-50 text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="reset-password" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`portal-input pr-16 ${visiblePasswordError ? '!border-red-400' : ''}`}
                      placeholder="Create a new password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      onBlur={() => setTouched(current => ({ ...current, password: true }))}
                      aria-invalid={Boolean(visiblePasswordError)}
                      aria-describedby={visiblePasswordError ? 'reset-password-error' : 'reset-password-help'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold tracking-[0.06em] text-[#1E1B4B] transition-colors hover:text-[#2d2a6e]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                  {visiblePasswordError ? (
                    <p id="reset-password-error" className="mt-2 text-sm text-red-600">{visiblePasswordError}</p>
                  ) : (
                    <p id="reset-password-help" className="mt-1.5 text-[11px] text-slate-400">
                      Use at least 8 characters for your new password.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="reset-confirm" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`portal-input pr-16 ${visibleConfirmError ? '!border-red-400' : ''}`}
                      placeholder="Repeat your new password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value)
                        if (error) setError('')
                      }}
                      onBlur={() => setTouched(current => ({ ...current, confirm: true }))}
                      aria-invalid={Boolean(visibleConfirmError)}
                      aria-describedby={visibleConfirmError ? 'reset-confirm-error' : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold tracking-[0.06em] text-[#1E1B4B] transition-colors hover:text-[#2d2a6e]"
                      aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                    >
                      {showConfirm ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                  {visibleConfirmError && (
                    <p id="reset-confirm-error" className="mt-2 text-sm text-red-600">{visibleConfirmError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded bg-[#1E1B4B] px-6 py-3.5 text-sm font-semibold tracking-[0.04em] text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#2d2a6e] hover:shadow-[0_4px_16px_rgba(30,27,75,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Resetting password...' : 'Reset Password'}
                  {!loading && <ArrowRightIcon className="h-4 w-4" />}
                </button>

                <div className="mt-auto flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <span className="text-[13px] text-slate-600">Return to portal sign in</span>
                  <Link
                    to="/login"
                    className="border-b border-[#1E1B4B]/30 pb-px text-[13px] font-semibold text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
                  >
                    Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
