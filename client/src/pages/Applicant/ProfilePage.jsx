import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { Toggle } from '../../components/ui/Motion'
import { getMotionPreference, setMotionPreference } from '../../utils/motionPreference'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ fullName: user?.fullName || '', contact: user?.contact || '' })
  const [saving, setSaving] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(getMotionPreference)

  useEffect(() => {
    setForm({ fullName: user?.fullName || '', contact: user?.contact || '' })
  }, [user?.fullName, user?.contact])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/profile', form)
      setUser(data.user)
      toast.success('Profile updated successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.fullName || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const changed = form.fullName !== (user?.fullName || '') || form.contact !== (user?.contact || '')

  const toggleMotion = (value) => {
    setReduceMotion(value)
    setMotionPreference(value)
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="portal-page-title">My profile</h1>
        <p className="portal-page-subtitle">Account, display and security</p>
      </div>

      <div className="flex shrink-0 animate-slide-up items-center gap-3.5 rounded-[20px] bg-brand-dark p-[18px]">
        <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[22px] font-bold text-brand-dark" aria-hidden="true">{initials}</span>
        <div className="min-w-0">
          <p className="truncate font-display text-[21px] font-semibold text-white">{user?.fullName || 'Applicant'}</p>
          <p className="truncate text-sm text-emerald-200">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="shrink-0 animate-slide-up overflow-hidden rounded-[18px] bg-white shadow-card" style={{ animationDelay: '60ms' }}>
        <p className="px-4 pb-1 pt-3 text-sm font-semibold text-emerald-700">Personal details</p>
        <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
          <div>
            <label htmlFor="pf-1" className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
            <input id="pf-1" className="form-control min-h-12" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" required />
          </div>
          <div>
            <label htmlFor="pf-2" className="mb-1 block text-sm font-medium text-slate-600">Email address</label>
            <input id="pf-2" className="form-control min-h-12 bg-slate-50 text-slate-500" value={user?.email || ''} disabled />
            <p className="field-hint">Email cannot be changed. Contact the scholarship office if needed.</p>
          </div>
          <div>
            <label htmlFor="pf-3" className="mb-1 block text-sm font-medium text-slate-600">Mobile number <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="pf-3" type="tel" inputMode="tel" className="form-control min-h-12" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="09XX XXX XXXX" />
            <p className="field-hint">This also updates the number on your active application.</p>
          </div>
          <button type="submit" disabled={saving || !changed} className="btn btn-primary min-h-12 text-base">
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Saving…' : changed ? 'Save changes' : 'No changes to save'}
          </button>
        </div>
      </form>

      <div className="shrink-0 animate-slide-up overflow-hidden rounded-[18px] bg-white shadow-card" style={{ animationDelay: '120ms' }}>
        <p className="px-4 pb-1 pt-3 text-sm font-semibold text-emerald-700">Display</p>
        <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
          <div className="flex-1">
            <p id="pref-motion" className="text-base font-semibold text-brand-primary">Reduce motion</p>
            <p className="text-sm text-slate-500">Turn off sliding and bouncing animations on this device.</p>
          </div>
          <Toggle checked={reduceMotion} onChange={toggleMotion} labelledBy="pref-motion" />
        </div>
      </div>

      <div className="shrink-0 animate-slide-up overflow-hidden rounded-[18px] bg-white shadow-card" style={{ animationDelay: '180ms' }}>
        <p className="px-4 pb-1 pt-3 text-sm font-semibold text-emerald-700">Security</p>
        <Link to="/change-password" className="flex min-h-[58px] items-center justify-between px-4 py-2 text-base font-semibold text-brand-primary hover:bg-brand-bg">
          Change password <span aria-hidden="true" className="text-slate-400">›</span>
        </Link>
      </div>
    </div>
  )
}
