import { useEffect, useState } from 'react'
import logo from '../../assets/logo.png'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Confirming your email address...')

  useEffect(() => {
    const verify = async () => {
      if (!token || !email) {
        setStatus('error')
        setMessage('Invalid confirmation link. Please use the link sent to your email.')
        return
      }

      try {
        const { data } = await api.get('/auth/verify-email', { params: { token, email } })
        setStatus('success')
        setMessage(data.message || 'Email confirmed successfully. You may now sign in.')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Unable to confirm your email.')
      }
    }

    verify()
  }, [email, navigate, token])

  const toneClass =
    status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
      <div className="sticky top-0 z-50 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Republic of the Philippines</p>
          <div className="flex items-center gap-3 sm:gap-5">
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
        </header>
      </div>

      <main className="flex flex-1 items-start justify-center px-4 py-6 pb-16 sm:px-6">
        <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-[0_8px_40px_rgba(30,27,75,0.14)]">
          <div className="p-8 md:p-12">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0D9488]">Applicant Services</div>
            <h2 className="mb-1.5 text-2xl font-bold text-[#1E1B4B]">Email Confirmation</h2>
            <p className="mb-6 text-sm leading-[1.6] text-slate-500">
              Your email address must be confirmed before you can sign in to the scholarship portal.
            </p>

            <div className={`rounded border px-4 py-4 text-sm ${toneClass}`}>
              {message}
            </div>

            <div className="mt-6 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3.5">
              <span className="text-[13px] text-slate-600">Ready to continue?</span>
              <Link
                to="/login"
                className="border-b border-[#1E1B4B]/30 pb-px text-[13px] font-semibold text-[#1E1B4B] transition-colors hover:border-[#1E1B4B]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
