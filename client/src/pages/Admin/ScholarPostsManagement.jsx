import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import ConfirmModal from '../../components/shared/ConfirmModal'

export default function ScholarPostsManagement() {
  const [postedScholars, setPostedScholars] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirm, setConfirm] = useState(null) // { action, label, message }

  const loadPostedScholars = async () => {
    try {
      const { data } = await adminService.getPostedScholars()
      const posts = data.posts || []
      setPostedScholars(posts)
      setSelectedIds((current) => current.filter((id) => posts.some((item) => item.application_id === id)))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load posted scholars.')
      setPostedScholars([])
      setSelectedIds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPostedScholars()
  }, [])

  const doPublish = async () => {
    setConfirm(null)
    setPublishing(true)
    try {
      const { data } = await adminService.publishAcceptedScholars()
      toast.success(data.message || 'Accepted scholars posted.')
      await loadPostedScholars()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to post accepted scholars.')
    } finally {
      setPublishing(false)
    }
  }

  const handlePublishAcceptedScholars = () => {
    setConfirm({
      label: 'Post Accepted Scholars',
      message: 'This will create or refresh public postings for all currently accepted applicants. Continue?',
      action: doPublish,
    })
  }

  const handleDeletePostedScholar = async (applicationId) => {
    setDeletingPostId(applicationId)
    try {
      const { data } = await adminService.deletePostedScholar(applicationId)
      setPostedScholars((current) => current.filter((item) => item.application_id !== applicationId))
      setSelectedIds((current) => current.filter((id) => id !== applicationId))
      toast.success(data.message || 'Posted scholar removed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to remove posted scholar.')
    } finally {
      setDeletingPostId('')
    }
  }

  const handleToggleSelect = (applicationId) => {
    setSelectedIds((current) => (
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId]
    ))
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === postedScholars.length) {
      setSelectedIds([])
      return
    }

    setSelectedIds(postedScholars.map((scholar) => scholar.application_id))
  }

  const doDeleteSelected = async () => {
    setConfirm(null)
    setBulkDeleting(true)
    try {
      const { data } = await adminService.deleteManyPostedScholars(selectedIds)
      setPostedScholars((current) => current.filter((item) => !selectedIds.includes(item.application_id)))
      setSelectedIds([])
      toast.success(data.message || 'Selected posted scholars removed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to remove selected posted scholars.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleDeleteSelected = () => {
    if (!selectedIds.length) { toast.error('Select at least one posted scholar first.'); return }
    setConfirm({
      label: `Delete ${selectedIds.length} Selected`,
      message: `Remove ${selectedIds.length} selected scholar post(s) from the public landing page? This cannot be undone.`,
      action: doDeleteSelected,
    })
  }

  const doDeleteAll = async () => {
    setConfirm(null)
    setDeletingAll(true)
    try {
      const { data } = await adminService.deleteAllPostedScholars()
      setPostedScholars([])
      setSelectedIds([])
      toast.success(data.message || 'All posted scholars removed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to remove all posted scholars.')
    } finally {
      setDeletingAll(false)
    }
  }

  const handleDeleteAll = () => {
    if (!postedScholars.length) { toast.error('There are no posted scholars to remove.'); return }
    setConfirm({
      label: 'Delete All',
      message: `Remove all ${postedScholars.length} posted scholar(s) from the public landing page? This cannot be undone.`,
      action: doDeleteAll,
    })
  }

  const allSelected = postedScholars.length > 0 && selectedIds.length === postedScholars.length

  return (
    <div className="flex flex-col gap-6">
      {confirm && (
        <ConfirmModal
          title={confirm.label}
          message={confirm.message}
          confirmLabel={confirm.label}
          danger
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div>
        <p className="portal-kicker">Landing Page Publishing</p>
        <h1 className="portal-page-title mt-2">Scholar Posts</h1>
        <p className="portal-page-subtitle">
          Manage the official accepted-scholar posting shown on the public landing page.
        </p>
      </div>

      <div className="portal-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-primary">Publish Accepted Scholars</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create or refresh official public postings from the currently accepted applications.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePublishAcceptedScholars}
            disabled={publishing}
            className="portal-button-primary"
          >
            {publishing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {publishing ? 'Posting Scholars...' : 'Post Accepted Scholars'}
          </button>
        </div>
      </div>

      <div className="portal-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-primary">Posted Scholars</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select all, select specific scholars, or clear the entire public posting from one place.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {postedScholars.length} Posted
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : postedScholars.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No scholars are currently posted on the landing page.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                />
                {allSelected ? 'Unselect all posted scholars' : 'Select all posted scholars'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={bulkDeleting || !selectedIds.length}
                  className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkDeleting ? 'Deleting Selected...' : `Delete Selected (${selectedIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deletingAll || !postedScholars.length}
                  className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingAll ? 'Deleting All...' : 'Delete All'}
                </button>
              </div>
            </div>

            {postedScholars.map((scholar) => (
              <div key={scholar.application_id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(scholar.application_id)}
                    onChange={() => handleToggleSelect(scholar.application_id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
                      {scholar.applicant_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {scholar.school || 'No school specified'}
                      {' • '}
                      {scholar.course || 'No course specified'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePostedScholar(scholar.application_id)}
                  disabled={deletingPostId === scholar.application_id}
                  className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingPostId === scholar.application_id ? 'Removing...' : 'Delete Post'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
