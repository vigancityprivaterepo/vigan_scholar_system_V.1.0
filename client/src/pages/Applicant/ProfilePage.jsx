import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ fullName: user?.fullName || '', contact: user?.contact || '' })
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="portal-page-title">My Profile</h1>
        <p className="portal-page-subtitle">Update your personal information.</p>
      </div>

      <div className="portal-surface p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <label htmlFor="pf-1" className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input id="pf-1"
              className="portal-input"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label htmlFor="pf-2" className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
            <input id="pf-2" className="portal-input bg-slate-50 text-slate-400" value={user?.email || ''} disabled />
            <p className="mt-1 text-xs text-slate-400">Email cannot be changed. Contact the scholarship office if needed.</p>
          </div>

          <div>
            <label htmlFor="pf-3" className="mb-1 block text-sm font-medium text-slate-700">Contact Number <span className="text-slate-400 font-normal">(optional)</span></label>
            <input id="pf-3"
              className="portal-input"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              placeholder="09XX XXX XXXX"
            />
            <p className="mt-1 text-xs text-slate-400">This updates the contact number on your active application.</p>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <button type="submit" disabled={saving} className="portal-button-primary flex items-center gap-2">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/change-password" className="portal-button-secondary text-sm">
              Change Password
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
