import { useEffect, useMemo, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

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
const STRENGTH_SEG_COLOR = ['', 'bg-red-400', 'bg-orange-400', 'bg-green-500', 'bg-[#1E1B4B]']
const STRENGTH_TEXT_COLOR = ['', 'text-red-500', 'text-orange-500', 'text-green-600', 'text-[#1E1B4B]']

export default function RegisterPage() {
  const { register } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = getPasswordStrength(form.password)

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
        state: {
          registrationEmail: form.email.trim(),
          registrationPendingVerification: true,
        },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const showError = (key) => touched[key] ? fieldErrors[key] : ''

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
              className="flex-1 rounded-l border border-[#dde2ec] bg-white px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] text-[#1E1B4B] sm:px-8"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="flex-1 rounded-r bg-[#1E1B4B] px-4 py-2.5 text-center text-[13px] font-medium tracking-[0.04em] text-white sm:px-8"
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
            <h2 className="mb-1.5 text-2xl font-bold text-[#1E1B4B]">Apply Now</h2>
            <p className="mb-6 text-sm leading-[1.6] text-slate-500">
              Create your applicant account to begin your scholarship application.
            </p>

            {/* Notice */}
            <div className="mb-6 rounded-r border-l-[3px] border-[#1E1B4B] bg-[#f8f6ef] px-4 py-3 text-xs leading-[1.6] text-slate-600">
              <strong className="mb-[3px] block text-[10px] uppercase tracking-[0.12em] text-[#1E1B4B]">Secure Registration</strong>
              Your account details are securely stored for scholarship portal access and updates.
            </div>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-4">
              {/* Full Name */}
              <div>
                <label htmlFor="register-full-name" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                  Full Name
                </label>
                <input
                  id="register-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  className={`portal-input ${showError('fullName') ? '!border-red-400' : ''}`}
                  placeholder="Juan dela Cruz"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  onBlur={() => setTouched(current => ({ ...current, fullName: true }))}
                  aria-invalid={Boolean(showError('fullName'))}
                  aria-describedby={showError('fullName') ? 'register-full-name-error' : undefined}
                  required
                />
                {showError('fullName') && (
                  <p id="register-full-name-error" className="mt-2 text-sm text-red-600">{showError('fullName')}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="register-email" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                  Email Address
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={`portal-input ${showError('email') ? '!border-red-400' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  onBlur={() => setTouched(current => ({ ...current, email: true }))}
                  aria-invalid={Boolean(showError('email'))}
                  aria-describedby={showError('email') ? 'register-email-error' : undefined}
                  required
                />
                {showError('email') && (
                  <p id="register-email-error" className="mt-2 text-sm text-red-600">{showError('email')}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="register-password" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`portal-input pr-16 ${showError('password') ? '!border-red-400' : ''}`}
                    placeholder="Create a password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, password: true }))}
                    aria-invalid={Boolean(showError('password'))}
                    aria-describedby={showError('password') ? 'register-password-error' : 'register-password-help'}
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

                {showError('password') ? (
                  <p id="register-password-error" className="mt-2 text-sm text-red-600">{showError('password')}</p>
                ) : form.password ? (
                  <>
                    <div className="mt-2 flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-[3px] flex-1 rounded-sm transition-colors duration-300 ${i < passwordStrength ? STRENGTH_SEG_COLOR[passwordStrength] : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <p className={`mt-1.5 text-[11px] ${STRENGTH_TEXT_COLOR[passwordStrength]}`}>
                      {STRENGTH_LABELS[passwordStrength]}
                    </p>
                  </>
                ) : (
                  <p id="register-password-help" className="mt-1.5 text-[11px] text-slate-400">
                    Use at least 8 characters for a secure password.
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="register-confirm" className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#1E1B4B]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="register-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`portal-input pr-16 ${showError('confirm') ? '!border-red-400' : ''}`}
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={(e) => setField('confirm', e.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, confirm: true }))}
                    aria-invalid={Boolean(showError('confirm'))}
                    aria-describedby={showError('confirm') ? 'register-confirm-error' : undefined}
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
                {showError('confirm') && (
                  <p id="register-confirm-error" className="mt-2 text-sm text-red-600">{showError('confirm')}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded bg-[#1E1B4B] px-6 py-3.5 text-sm font-semibold tracking-[0.04em] text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#2d2a6e] hover:shadow-[0_4px_16px_rgba(30,27,75,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {loading ? 'Creating account…' : 'Create Account'}
                {!loading && <span className="text-base">→</span>}
              </button>

              {/* Switch row */}
              <div className="mt-auto flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3.5">
                <span className="text-[13px] text-slate-600">Already have an account?</span>
                <Link
                  to="/login"
                  className="border-b border-[#1E1B4B]/30 pb-px text-[13px] font-semibold text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
                >
                  Sign In
                </Link>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
