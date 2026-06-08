import { useEffect, useMemo, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordStrength(val) {
  if (!val) return 0
  let score = 0
  if (val.length >= 8) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++
  return Math.max(score, 1)
}

const STRENGTH_LABELS = [
  '',
  'Weak — add uppercase letters or numbers',
  'Fair — add a number or symbol',
  'Good — add a special character',
  'Strong password',
]
const STRENGTH_SEG_COLOR = ['', 'bg-red-400', 'bg-orange-400', 'bg-green-500', 'bg-[#0c2340]']
const STRENGTH_TEXT_COLOR = ['', 'text-red-500', 'text-orange-500', 'text-green-600', 'text-[#0c2340]']

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = getPasswordStrength(form.password)

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
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email address is required.'
    else if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    if (!form.confirm) nextErrors.confirm = 'Please confirm your password.'
    else if (form.confirm !== form.password) nextErrors.confirm = 'Passwords do not match.'
    return nextErrors
  }, [form])

  const canSubmit = Object.keys(fieldErrors).length === 0 && !loading

  const setField = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
    if (error) setError('')
  }

  const navigateForUser = (user) => {
    const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'].includes(user.role)
    navigate(isAdminRole ? '/admin/dashboard' : '/applicant/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ fullName: true, email: true, password: true, confirm: true })
    if (Object.keys(fieldErrors).length > 0) return
    setLoading(true)
    try {
      const result = await register(form.email.trim(), form.password, form.fullName.trim())
      toast.success(result.message || 'Account created. Please check your email for the confirmation link.')
      navigate('/login', {
        replace: true,
        state: { registrationEmail: form.email.trim(), registrationPendingVerification: true },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential) => {
    if (!credential) {
      setError('Google sign-up did not return a credential. Please try again.')
      return
    }

    setError('')
    setGoogleLoading(true)
    try {
      const user = await loginWithGoogle(credential)
      toast.success(`Welcome, ${user.fullName}!`)
      navigateForUser(user)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to continue with Google right now.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const showError = (key) => touched[key] ? fieldErrors[key] : ''

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT BRANDING PANEL ── */}
      <div className="relative hidden w-[42%] flex-col overflow-hidden lg:flex"
        style={{ background: 'linear-gradient(155deg, #064e3b 0%, #065f46 55%, #047857 100%)' }}
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
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-[#064e3b] to-[#047857] px-5 py-3 lg:hidden">
          <img src={logo} alt="Seal" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Vigan Scholarship Management System</p>
            <p className="text-sm font-bold text-white">City Government of Vigan</p>
          </div>
        </div>

        {/* Form area — scrollable for longer register form */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-10 sm:px-12">
          <div className="w-full max-w-md">

            <h2 className="font-display text-3xl font-bold text-[#0c2340]">Create Account</h2>
            <p className="mt-2 text-sm text-slate-500">Register to begin your scholarship application</p>

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">

              {/* Full Name */}
              <div>
                <label htmlFor="register-full-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Full Name
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-4 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${showError('fullName') ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="Juan dela Cruz"
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, fullName: true }))}
                    aria-invalid={Boolean(showError('fullName'))}
                    required
                  />
                </div>
                {showError('fullName') && <p className="mt-1.5 text-xs text-red-600">{showError('fullName')}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="register-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-4 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${showError('email') ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, email: true }))}
                    aria-invalid={Boolean(showError('email'))}
                    required
                  />
                </div>
                {showError('email') && <p className="mt-1.5 text-xs text-red-600">{showError('email')}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="register-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-16 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${showError('password') ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, password: true }))}
                    aria-invalid={Boolean(showError('password'))}
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
                {showError('password') ? (
                  <p className="mt-1.5 text-xs text-red-600">{showError('password')}</p>
                ) : form.password ? (
                  <>
                    <div className="mt-2 flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-[3px] flex-1 rounded-sm transition-colors duration-300 ${i < passwordStrength ? STRENGTH_SEG_COLOR[passwordStrength] : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className={`mt-1 text-[11px] ${STRENGTH_TEXT_COLOR[passwordStrength]}`}>{STRENGTH_LABELS[passwordStrength]}</p>
                  </>
                ) : null}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="register-confirm" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input
                    id="register-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`w-full rounded-lg border bg-white py-3 pl-10 pr-16 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${showError('confirm') ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={(e) => setField('confirm', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, confirm: true }))}
                    aria-invalid={Boolean(showError('confirm'))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0c2340]"
                    aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                  >
                    {showConfirm ? (
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
                {showError('confirm') && <p className="mt-1.5 text-xs text-red-600">{showError('confirm')}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#064e3b] hover:shadow-[0_4px_16px_rgba(6,78,59,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

            </form>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-4 flex justify-center">
                <GoogleAuthButton
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-up was cancelled or failed. Please try again.')}
                  text="signup_with"
                  disabled={googleLoading}
                />
              </div>
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <p className="mt-3 text-center text-xs text-amber-700">
                  Google sign-up is hidden because `VITE_GOOGLE_CLIENT_ID` is not set.
                </p>
              )}
              {googleLoading && (
                <p className="mt-3 text-center text-xs text-slate-500">Completing Google sign-up...</p>
              )}
            </div>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#059669] transition-colors hover:text-[#0c2340]">
                Sign In
              </Link>
            </p>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} 2026 City Government of Vigan · By City Management Information System Division · Vigan City, Ilocos Sur
        </div>
      </div>

    </div>
  )
}
