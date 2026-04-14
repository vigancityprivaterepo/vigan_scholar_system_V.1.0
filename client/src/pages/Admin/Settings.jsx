import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'
import ConfirmModal from '../../components/shared/ConfirmModal'

const initialForm = {
  facebookPageName: '',
  facebookPageUrl: '',
  facebookPageDescription: '',
  gwaThreshold: '2.0',
  applicationOpen: true,
  applicationDeadline: '',
}

const toDateTimeInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function AdminSettings() {
  const { user } = useAuthStore()
  const isPrimaryAdmin = (user?.email || '').toLowerCase() === 'data@vigancity.gov.ph'
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [roleUpdatingId, setRoleUpdatingId] = useState('')
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '' })
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await adminService.getSiteSettings()
        setForm({
          facebookPageName: data.settings?.facebookPageName || '',
          facebookPageUrl: data.settings?.facebookPageUrl || '',
          facebookPageDescription: data.settings?.facebookPageDescription || '',
          gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '2.0',
          applicationOpen: data.settings?.applicationOpen !== false,
          applicationDeadline: toDateTimeInput(data.settings?.applicationDeadline),
        })
      } catch (err) {
        toast.error(err.response?.data?.message || 'Unable to load settings.')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const loadUsers = async (search = '') => {
    if (!isPrimaryAdmin) {
      setUsers([])
      setUsersLoading(false)
      return
    }

    setUsersLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      const { data } = await adminService.listUsers(params)
      setUsers(data.users || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [isPrimaryAdmin])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    const threshold = parseFloat(form.gwaThreshold)
    if (isNaN(threshold) || threshold < 1.0 || threshold > 5.0) {
      toast.error('GWA threshold must be between 1.0 and 5.0.')
      return
    }

    if (form.applicationDeadline) {
      const parsed = new Date(form.applicationDeadline)
      if (Number.isNaN(parsed.getTime())) {
        toast.error('Please enter a valid application deadline.')
        return
      }
    }

    setSaving(true)
    try {
      const { data } = await adminService.updateSiteSettings({
        ...form,
        gwaThreshold: threshold,
        applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : null,
      })
      setForm({
        facebookPageName: data.settings?.facebookPageName || '',
        facebookPageUrl: data.settings?.facebookPageUrl || '',
        facebookPageDescription: data.settings?.facebookPageDescription || '',
        gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '2.0',
        applicationOpen: data.settings?.applicationOpen !== false,
        applicationDeadline: toDateTimeInput(data.settings?.applicationDeadline),
      })
      toast.success(data.message || 'Settings saved.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const [pendingRoleChange, setPendingRoleChange] = useState(null) // { user, role }

  const handleRoleChange = (targetUser, targetRole) => {
    if (targetRole === targetUser.role) return
    setPendingRoleChange({ user: targetUser, role: targetRole })
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return
    const { user: targetUser, role: targetRole } = pendingRoleChange
    setRoleUpdatingId(targetUser.id)
    setPendingRoleChange(null)
    try {
      const { data } = await adminService.updateUserRole(targetUser.id, targetRole)
      toast.success(data.message || 'User role updated.')
      loadUsers(userSearch.trim())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.')
    } finally {
      setRoleUpdatingId('')
    }
  }

  const handleInviteAdmin = async () => {
    if (!inviteForm.fullName.trim()) {
      toast.error('Full name is required.')
      return
    }
    if (!inviteForm.email.trim()) {
      toast.error('Email is required.')
      return
    }

    setInviteLoading(true)
    try {
      const { data } = await adminService.inviteAdminUser({
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim(),
      })
      toast.success(data.message || 'Invitation sent.')
      setInviteForm({ fullName: '', email: '' })
      loadUsers(userSearch.trim())
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <p className="portal-kicker">Administrative Configuration</p>
        <h1 className="portal-page-title mt-2">Settings</h1>
      </div>

      <div className="portal-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary">Scholarship Configuration</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Minimum GWA Threshold</label>
            <p className="mb-2 text-xs text-slate-500">Applicants must have a GWA equal to or below this value (1.0 scale, lower is better). Used when qualifying applicants to the Exam/Interview stage.</p>
            <input
              type="number"
              className="portal-input max-w-xs"
              value={form.gwaThreshold}
              onChange={e => setField('gwaThreshold', e.target.value)}
              step="0.1"
              min="1.0"
              max="5.0"
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Accept Applications</label>
            <p className="mb-3 text-xs text-slate-500">When turned off, the application form will be closed and new submissions will be blocked.</p>
            <button
              type="button"
              onClick={() => setField('applicationOpen', !form.applicationOpen)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.applicationOpen ? 'bg-[#10b981]' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.applicationOpen ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="ml-3 text-sm text-slate-600">{form.applicationOpen ? 'Open - accepting submissions' : 'Closed - submissions blocked'}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Application Deadline</label>
            <p className="mb-2 text-xs text-slate-500">Optional. After this date and time, applicants can no longer submit or resubmit forms.</p>
            <input
              type="datetime-local"
              className="portal-input max-w-sm"
              value={form.applicationDeadline}
              onChange={e => setField('applicationDeadline', e.target.value)}
            />
            {form.applicationDeadline && (
              <button
                type="button"
                onClick={() => setField('applicationDeadline', '')}
                className="ml-2 text-xs font-medium text-slate-500 hover:text-brand-primary"
              >
                Clear deadline
              </button>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 font-medium text-brand-primary">Landing Page Socials</h3>
            <p className="mb-4 text-sm text-slate-500">
              Add the official Facebook page applicants should follow for announcements and updates.
            </p>

            {loading ? (
              <div className="portal-panel p-4 text-sm text-slate-500">Loading current social settings...</div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Vigan City PH"
                    value={form.facebookPageName}
                    onChange={e => setField('facebookPageName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page URL</label>
                  <input
                    type="url"
                    className="portal-input"
                    placeholder="https://www.facebook.com/your-page"
                    value={form.facebookPageUrl}
                    onChange={e => setField('facebookPageUrl', e.target.value)}
                  />
                  <p className="mt-2 text-xs text-slate-500">Required if you want the landing page to show the Facebook follow section.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Short Description</label>
                  <textarea
                    className="portal-input min-h-[110px] resize-y"
                    placeholder="Follow the official page for scholarship announcements, schedules, and public updates."
                    value={form.facebookPageDescription}
                    onChange={e => setField('facebookPageDescription', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 font-medium text-brand-primary">System Info</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[['Version', '1.0.0'], ['Environment', 'Development'], ['Database', 'PostgreSQL via Prisma'], ['Auth', 'JWT (Access + Refresh)']].map(([l, v]) => (
                <div key={l} className="portal-panel p-3">
                  <p className="text-xs text-slate-500">{l}</p>
                  <p className="font-medium text-brand-primary">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving || loading} className="portal-button-primary">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="portal-surface mt-6 p-6">
        <h2 className="mb-2 text-lg font-semibold text-brand-primary">User Control</h2>
        <p className="mb-4 text-sm text-slate-500">Manage existing admin accounts only. Applicants are excluded from this panel.</p>

        {!isPrimaryAdmin && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Only <strong>data@vigancity.gov.ph</strong> can modify admin users.
          </div>
        )}

        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Invite New Admin</p>
          <p className="mt-1 text-sm text-emerald-900">Create an admin invitation. The user will receive an email link to set their password.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className="portal-input sm:col-span-1"
              placeholder="Full name"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm((current) => ({ ...current, fullName: e.target.value }))}
              disabled={!isPrimaryAdmin || inviteLoading}
            />
            <input
              className="portal-input sm:col-span-1"
              placeholder="Email address"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((current) => ({ ...current, email: e.target.value }))}
              disabled={!isPrimaryAdmin || inviteLoading}
            />
            <button
              type="button"
              className="portal-button-primary sm:col-span-1"
              onClick={handleInviteAdmin}
              disabled={!isPrimaryAdmin || inviteLoading}
            >
              {inviteLoading ? 'Sending Invite...' : 'Send Admin Invite'}
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="portal-input"
            placeholder="Search by full name or email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            disabled={!isPrimaryAdmin}
          />
          <button
            type="button"
            className="portal-button-secondary whitespace-nowrap"
            onClick={() => loadUsers(userSearch.trim())}
            disabled={!isPrimaryAdmin}
          >
            Search Users
          </button>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === user?.id
                  return (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 text-sm font-medium text-brand-primary">
                        {u.fullName}
                        {isSelf && <span className="ml-2 text-xs text-slate-400">(You)</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{u.email}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{u.role}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className="portal-input !py-1.5 text-xs"
                            value={u.role}
                            disabled={!isPrimaryAdmin || isSelf || roleUpdatingId === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="REVIEWER">REVIEWER</option>
                            <option value="SCHEDULER">SCHEDULER</option>
                            <option value="APPLICANT">APPLICANT</option>
                          </select>
                          {roleUpdatingId === u.id && <span className="text-xs text-slate-500">Updating...</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingRoleChange && (
        <ConfirmModal
          title="Change User Role"
          message={`Change ${pendingRoleChange.user.fullName}'s role from ${pendingRoleChange.user.role} to ${pendingRoleChange.role}?`}
          confirmLabel="Change Role"
          danger
          loading={roleUpdatingId === pendingRoleChange.user.id}
          onConfirm={confirmRoleChange}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
    </div>
  )
}
    
