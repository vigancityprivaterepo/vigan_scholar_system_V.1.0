import { useEffect, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Confirming your email address...')

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Invalid confirmation link. Please use the link sent to your email.')
        return
      }

      try {
        const { data } = await api.get('/auth/verify-email', { params: { token } })
        setStatus('success')
        setMessage(data.message || 'Email confirmed successfully. You may now sign in.')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Unable to confirm your email.')
      }
    }

    verify()
  }, [navigate, token])

  const statusBanner =
    status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT BRANDING PANEL ── */}
      <div
        className="relative hidden w-[42%] flex-col overflow-hidden lg:flex"
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

        {/* Content area */}
        <div className="flex flex-1 items-center justify-center px-8 py-12 sm:px-12">
          <div className="w-full max-w-md">

            <h2 className="font-display text-3xl font-bold text-[#0c2340]">Email Confirmation</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your email address must be confirmed before you can sign in to the scholarship portal.
            </p>

            <div className={`mt-8 rounded-lg border px-4 py-4 text-sm ${statusBanner}`}>
              {status === 'loading' && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {message}
                </span>
              )}
              {status !== 'loading' && message}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
              <span className="text-sm text-slate-600">Ready to continue?</span>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#059669] transition-colors hover:text-[#0c2340]"
              >
                Sign In
              </Link>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} 2026 
        </div>
      </div>

    </div>
  )
}
