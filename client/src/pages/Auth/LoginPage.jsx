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
    const handlePopState = () => navigate('/', { replace: true, state: { fromAuthFallback: location.pathname } })
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
      const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'].includes(user.role)
      navigate(isAdminRole ? '/admin/dashboard' : '/applicant/dashboard')
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
    <div className="flex min-h-screen">

      {/* ── LEFT BRANDING PANEL ── */}
      <div className="relative hidden w-[42%] flex-col overflow-hidden lg:flex"
        style={{ background: 'linear-gradient(155deg, #0c2340 0%, #0d4f3c 55%, #064e3b 100%)' }}
      >
        {/* Decorative oval shapes */}
        <div className="absolute -left-16 -top-16 h-72 w-52 rotate-12 rounded-full bg-white/5" />
        <div className="absolute -right-8 top-8 h-80 w-56 -rotate-6 rounded-full bg-white/5" />
        <div className="absolute left-1/4 top-1/3 h-48 w-36 rounded-full bg-white/4" />
        <div className="absolute -left-8 bottom-1/3 h-64 w-44 rotate-6 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-1/4 h-52 w-40 -rotate-12 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 left-1/3 h-56 w-44 rounded-full bg-white/4" />

        {/* Main branding content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-12 text-center">
          <img src={logo} alt="Vigan City Seal" className="h-28 w-28 object-contain drop-shadow-lg" />
          <div className="mt-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300/80">
              Vigan Scholarship Management System
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white">
              City Government of Vigan
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-300">
              Province of Ilocos Sur
            </p>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-slate-300/80">
            A formal and transparent digital application system for qualified students seeking scholarship support.
          </p>
        </div>

        {/* Bottom info card */}
        <div className="relative z-10 mx-6 mb-8 rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Scholarship Office</p>
          <p className="mt-2 text-sm font-medium text-white">City Government of Vigan</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">City Hall, Vigan City, Ilocos Sur</p>
          <p className="mt-1 text-xs text-slate-400">Academic Year 2026</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex flex-1 flex-col bg-white">

        {/* Mobile-only top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-[#0c2340] to-[#064e3b] px-5 py-3 lg:hidden">
          <img src={logo} alt="Seal" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Vigan Scholarship Management System</p>
            <p className="text-sm font-bold text-white">City Government of Vigan</p>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-8 py-12 sm:px-12">
          <div className="w-full max-w-md">

            <h2 className="font-display text-3xl font-bold text-[#0c2340]">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to your scholarship portal account</p>

            {pendingVerificationEmail && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
                Confirmation email sent to <strong>{pendingVerificationEmail}</strong>. Open the link before signing in.
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">

              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-4 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${visibleEmailError ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, email: true }))}
                    aria-invalid={Boolean(visibleEmailError)}
                    required
                  />
                </div>
                {visibleEmailError && <p className="mt-1.5 text-xs text-red-600">{visibleEmailError}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-[#059669] transition-colors hover:text-[#0c2340]">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-16 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${visiblePasswordError ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, password: true }))}
                    aria-invalid={Boolean(visiblePasswordError)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0c2340]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {visiblePasswordError && <p className="mt-1.5 text-xs text-red-600">{visiblePasswordError}</p>}
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded accent-[#10b981]"
                />
                Remember me
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#064e3b] hover:shadow-[0_4px_16px_rgba(6,78,59,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>

            {/* Register link */}
            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[#059669] transition-colors hover:text-[#0c2340]">
                Apply Now
              </Link>
            </p>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} City Government of Vigan · By City Management Information Systems · Vigan City, Ilocos Sur
        </div>
      </div>

    </div>
  )
}
