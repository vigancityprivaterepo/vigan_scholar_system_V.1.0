import { useEffect, useState } from 'react'
import { AuthBrandPanel, AuthMobileBar } from '../../components/auth/AuthBranding'
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

      <AuthBrandPanel />

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex flex-1 flex-col bg-white">

        <AuthMobileBar />

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
