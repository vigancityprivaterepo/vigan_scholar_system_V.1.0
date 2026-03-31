import { useEffect, useMemo, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pendingVerificationEmail = location.state?.registrationPendingVerification ? location.state?.registrationEmail : ''

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

  const fieldErrors = useMemo(() => {
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email address is required.'
    else if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.'

    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'

    return nextErrors
  }, [form.email, form.password])

  const canSubmit = Object.keys(fieldErrors).length === 0 && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true })

    if (Object.keys(fieldErrors).length > 0) return

    setError('')
    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${user.fullName}!`)
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/applicant/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  const setField = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
    if (error) setError('')
  }

  const visibleEmailError = touched.email ? fieldErrors.email : ''
  const visiblePasswordError = touched.password ? fieldErrors.password : ''

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">

      {/* Sticky header */}
      <div className="sticky top-0 z-50 shadow-sm">

        {/* Government bar */}
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="max-w-full text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:max-w-none sm:text-xs sm:tracking-[0.2em]">
            Republic of the Philippines
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:flex-nowrap sm:gap-5 sm:text-xs">
            <a href="#" className="transition-colors hover:text-brand-primary">Scholarship Guidelines</a>
            <Link to="/login" className="transition-colors hover:text-brand-primary">Applicant Login</Link>
          </div>
        </div>

        {/* Site header */}
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

        {/* Page switcher */}
        <div className="flex justify-center border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex w-full max-w-md">
            <Link
              to="/login"
              className="flex-1 rounded-l bg-[#1E1B4B] px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] text-white sm:px-8"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="flex-1 rounded-r border border-[#dde2ec] bg-white px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] text-[#1E1B4B] sm:px-8"
            >
              Create Account
            </Link>
          </div>
        </div>

      </div>{/* end sticky */}

      {/* Main content */}
      <main className="flex flex-1 items-start justify-center px-4 py-6 pb-16 sm:px-6">
        <div className="w-full max-w-lg overflow-hidden rounded-lg shadow-[0_8px_40px_rgba(30,27,75,0.14)]">

          {/* Form panel */}
          <div className="flex flex-col bg-white p-8 md:p-12">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0D9488]">Applicant Services</div>
            <h2 className="mb-1.5 text-2xl font-bold text-[#1E1B4B]">Sign In</h2>
            <p className="mb-7 text-sm leading-[1.6] text-slate-500">
              Access your scholarship application and monitor your portal status.
            </p>

            {pendingVerificationEmail && (
              <div className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
                Confirmation email sent to <strong>{pendingVerificationEmail}</strong>. Open the link in that inbox before signing in.
              </div>
            )}

            {/* Notice */}
            <div className="mb-7 rounded-r border-l-[3px] border-[#1E1B4B] bg-[#f8f6ef] px-4 py-3 text-xs leading-[1.6] text-slate-600">
              <strong className="mb-[3px] block text-[10px] uppercase tracking-[0.12em] text-[#1E1B4B]">Secure Access</strong>
              Your information is protected and used only for scholarship portal services.
            </div>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-5">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={`portal-input ${visibleEmailError ? '!border-red-400' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  onBlur={() => setTouched(current => ({ ...current, email: true }))}
                  aria-invalid={Boolean(visibleEmailError)}
                  aria-describedby={visibleEmailError ? 'login-email-error' : undefined}
                  required
                />
                {visibleEmailError && (
                  <p id="login-email-error" className="mt-2 text-sm text-red-600">{visibleEmailError}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="border-b border-[#1E1B4B]/30 pb-px text-xs font-medium text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`portal-input pr-16 ${visiblePasswordError ? '!border-red-400' : ''}`}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, password: true }))}
                    aria-invalid={Boolean(visiblePasswordError)}
                    aria-describedby={visiblePasswordError ? 'login-password-error' : undefined}
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
                  <p id="login-password-error" className="mt-2 text-sm text-red-600">{visiblePasswordError}</p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-400">Use the password tied to your scholarship portal account.</p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-[15px] w-[15px] cursor-pointer accent-[#1E1B4B]"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-[11px] text-slate-400">Preferred on personal devices</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded bg-[#1E1B4B] px-6 py-3.5 text-sm font-semibold tracking-[0.04em] text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#2d2a6e] hover:shadow-[0_4px_16px_rgba(30,27,75,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {loading ? 'Signing in…' : 'Sign In'}
                {!loading && <span className="text-base">→</span>}
              </button>

              {/* Switch row */}
              <div className="mt-auto flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3.5">
                <span className="text-[13px] text-slate-600">New here?</span>
                <Link
                  to="/register"
                  className="border-b border-[#1E1B4B]/30 pb-px text-[13px] font-semibold text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
                >
                  Apply Now
                </Link>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
