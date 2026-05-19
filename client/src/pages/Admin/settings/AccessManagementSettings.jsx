import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../../../components/shared/ConfirmModal'
import { adminService } from '../../../services/adminService'
import { useAuthStore } from '../../../store/authStore'

export default function AccessManagementSettings() {
  const { user } = useAuthStore()
  const isPrimaryAdmin = (user?.email || '').toLowerCase() === 'data@vigancity.gov.ph'
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [roleUpdatingId, setRoleUpdatingId] = useState('')
  const [deletingUserId, setDeletingUserId] = useState('')
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState(null)
  const [pendingUserDelete, setPendingUserDelete] = useState(null)

  const loadUsers = async (search = '', role = userRoleFilter) => {
    if (!isPrimaryAdmin) {
      setUsers([])
      setUsersLoading(false)
      return
    }

    setUsersLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (role) params.role = role
      const { data } = await adminService.listUsers(params)
      setUsers(data.users || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers('', userRoleFilter)
  }, [isPrimaryAdmin, userRoleFilter])

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
      loadUsers(userSearch.trim(), userRoleFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.')
    } finally {
      setRoleUpdatingId('')
    }
  }

  const confirmUserDelete = async () => {
    if (!pendingUserDelete) return
    const targetUser = pendingUserDelete
    setDeletingUserId(targetUser.id)
    try {
      const { data } = await adminService.deleteUser(targetUser.id)
      toast.success(data.message || 'User deleted successfully.')
      loadUsers(userSearch.trim(), userRoleFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.')
    } finally {
      setDeletingUserId('')
      setPendingUserDelete(null)
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
      loadUsers(userSearch.trim(), userRoleFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <section className="portal-surface p-6">
      <div className="mb-5">
        <p className="portal-kicker">Access Management</p>
        <h2 className="mt-1 text-lg font-semibold text-brand-primary">User Control</h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage user accounts separately from scholarship and landing page settings.
        </p>
      </div>

      {!isPrimaryAdmin && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Only <strong>data@vigancity.gov.ph</strong> can manage user accounts. This section is visible for transparency,
          but invite, role, and delete actions are restricted.
        </div>
      )}

      {isPrimaryAdmin && (
        <>
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Invite New Admin</p>
            <p className="mt-1 text-sm text-emerald-900">
              Create an admin invitation. The user will receive an email link to set their password.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                className="portal-input sm:col-span-1"
                placeholder="Full name"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((current) => ({ ...current, fullName: e.target.value }))}
                disabled={inviteLoading}
              />
              <input
                className="portal-input sm:col-span-1"
                placeholder="Email address"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((current) => ({ ...current, email: e.target.value }))}
                disabled={inviteLoading}
              />
              <button
                type="button"
                className="portal-button-primary sm:col-span-1"
                onClick={handleInviteAdmin}
                disabled={inviteLoading}
              >
                {inviteLoading ? 'Sending Invite...' : 'Send Admin Invite'}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              className="portal-input sm:max-w-[220px]"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="">Staff Accounts</option>
              <option value="APPLICANT">Applicants</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="SCHEDULER">Scheduler</option>
            </select>
            <input
              className="portal-input"
              placeholder="Search by full name or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <button
              type="button"
              className="portal-button-secondary whitespace-nowrap"
              onClick={() => loadUsers(userSearch.trim(), userRoleFilter)}
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
                    const isDeleting = deletingUserId === u.id
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
                              disabled={isSelf || roleUpdatingId === u.id || isDeleting}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                            >
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="REVIEWER">REVIEWER</option>
                              <option value="SCHEDULER">SCHEDULER</option>
                              <option value="APPLICANT">APPLICANT</option>
                            </select>
                            <button
                              type="button"
                              className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:border-red-500 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => setPendingUserDelete(u)}
                              disabled={isSelf || roleUpdatingId === u.id || isDeleting}
                            >
                              Delete
                            </button>
                            {roleUpdatingId === u.id && <span className="text-xs text-slate-500">Updating...</span>}
                            {isDeleting && <span className="text-xs text-red-600">Deleting...</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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

      {pendingUserDelete && (
        <ConfirmModal
          title="Delete User Account"
          message={`Delete ${pendingUserDelete.fullName} (${pendingUserDelete.email}) and all related data? This action cannot be undone.`}
          confirmLabel="Delete User"
          danger
          loading={deletingUserId === pendingUserDelete.id}
          onConfirm={confirmUserDelete}
          onCancel={() => setPendingUserDelete(null)}
        />
      )}
    </section>
  )
}
