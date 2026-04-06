import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

export default function ChangePasswordPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({})

  const errors = {}
  if (touched.currentPassword && !form.currentPassword) errors.currentPassword = 'Current password is required.'
  if (touched.newPassword) {
    if (!form.newPassword) errors.newPassword = 'New password is required.'
    else if (form.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.'
  }
  if (touched.confirmPassword) {
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your new password.'
    else if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match.'
  }

  const canSubmit = !loading && form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (Object.keys(errors).length > 0 || !canSubmit) return
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password changed successfully.')
      navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : '/applicant/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ visible }) => visible ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  const inputClass = (field) =>
    `w-full rounded-lg border bg-white py-3 pl-10 pr-12 text-sm text-[#0c2340] placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${errors[field] ? 'border-red-400' : 'border-slate-300'}`

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h2 className="font-display text-2xl font-bold text-[#0c2340]">Change Password</h2>
        <p className="mt-1 text-sm text-slate-500">Update your scholarship portal account password.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">

          {/* Current Password */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Current Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showCurrent ? 'text' : 'password'}
                className={inputClass('currentPassword')}
                placeholder="Enter current password"
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, currentPassword: true }))}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c2340]">
                <EyeIcon visible={showCurrent} />
              </button>
            </div>
            {errors.currentPassword && <p className="mt-1.5 text-xs text-red-600">{errors.currentPassword}</p>}
          </div>

          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">New Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showNew ? 'text' : 'password'}
                className={inputClass('newPassword')}
                placeholder="At least 8 characters"
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, newPassword: true }))}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c2340]">
                <EyeIcon visible={showNew} />
              </button>
            </div>
            {errors.newPassword && <p className="mt-1.5 text-xs text-red-600">{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Confirm New Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                className={inputClass('confirmPassword')}
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c2340]">
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0c4a3a] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#064e3b] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
