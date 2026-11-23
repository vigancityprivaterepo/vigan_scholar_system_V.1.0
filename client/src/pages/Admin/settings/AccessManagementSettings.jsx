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
  const [pendingTwoFactorReset, setPendingTwoFactorReset] = useState(null)
  const [resettingTwoFactorId, setResettingTwoFactorId] = useState('')

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

  const confirmTwoFactorReset = async () => {
    if (!pendingTwoFactorReset) return
    const targetUser = pendingTwoFactorReset
    setResettingTwoFactorId(targetUser.id)
    try {
      const { data } = await adminService.resetUserTwoFactor(targetUser.id)
      toast.success(data.message || 'Two-step sign-in reset.')
      loadUsers(userSearch.trim(), userRoleFilter)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset two-step sign-in.')
    } finally {
      setResettingTwoFactorId('')
      setPendingTwoFactorReset(null)
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
    <section className="card p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-brand-primary">User Control</h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage user accounts separately from scholarship and landing page settings.
        </p>
      </div>

      {!isPrimaryAdmin && (
        <div className="rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Only the primary administrator account can invite staff, change roles, or delete accounts.
          Ask the primary administrator if someone's access needs to change.
        </div>
      )}

      {isPrimaryAdmin && (
        <>
          <div className="mb-4 rounded-control border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">Invite a staff member</h3>
            <p className="mt-1 text-sm text-emerald-900">
              Create an admin invitation. The user will receive an email link to set their password.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                aria-label="Full name"
                className="form-control sm:col-span-1"
                placeholder="Full name"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((current) => ({ ...current, fullName: e.target.value }))}
                disabled={inviteLoading}
              />
              <input
                type="email"
                aria-label="Email address"
                className="form-control sm:col-span-1"
                placeholder="Email address"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((current) => ({ ...current, email: e.target.value }))}
                disabled={inviteLoading}
              />
              <button
                type="button"
                className="btn btn-primary sm:col-span-1"
                onClick={handleInviteAdmin}
                disabled={inviteLoading}
              >
                {inviteLoading ? 'Sending Invite...' : 'Send Admin Invite'}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Account type"
              className="form-control sm:max-w-[220px]"
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
              aria-label="Search users"
              className="form-control"
              placeholder="Search by full name or email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <button
              type="button"
              className="btn whitespace-nowrap"
              onClick={() => loadUsers(userSearch.trim(), userRoleFilter)}
            >
              Search Users
            </button>
          </div>

          <div className="overflow-x-auto rounded-control border border-slate-200">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Email</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Role</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Two-step sign-in</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-slate-500" colSpan={5}>Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-slate-500" colSpan={5}>No users found.</td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === user?.id
                    const isDeleting = deletingUserId === u.id
                    const isStaff = u.role !== 'APPLICANT'
                    const isResetting = resettingTwoFactorId === u.id
                    return (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 text-sm font-medium text-brand-primary">
                          {u.fullName}
                          {isSelf && <span className="ml-2 text-xs text-slate-500">(You)</span>}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">{u.email}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{u.role}</td>
                        <td className="px-3 py-3 text-sm">
                          {isStaff
                            ? (u.twoFactorEnabled
                              ? <span className="font-medium text-emerald-700">On</span>
                              : <span className="text-slate-500">Not set up</span>)
                            : <span className="text-slate-400">Not used</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Role for ${u.fullName}`}
                              className="form-control !py-1.5 text-xs"
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
                            {isStaff && !isSelf && (
                              <button
                                type="button"
                                className="whitespace-nowrap rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => setPendingTwoFactorReset(u)}
                                disabled={roleUpdatingId === u.id || isDeleting || isResetting}
                              >
                                Reset 2FA
                              </button>
                            )}
                            {roleUpdatingId === u.id && <span className="text-xs text-slate-500">Updating...</span>}
                            {isDeleting && <span className="text-xs text-red-600">Deleting...</span>}
                            {isResetting && <span className="text-xs text-slate-500">Resetting...</span>}
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
      {pendingTwoFactorReset && (
        <ConfirmModal
          title="Reset Two-Step Sign-In"
          message={`${pendingTwoFactorReset.fullName} will set up two-step sign-in again at their next sign-in, and will be signed out of every device. Use this only after confirming who is asking.`}
          confirmLabel="Reset 2FA"
          danger
          loading={resettingTwoFactorId === pendingTwoFactorReset.id}
          onConfirm={confirmTwoFactorReset}
          onCancel={() => setPendingTwoFactorReset(null)}
        />
      )}
    </section>
  )
}
