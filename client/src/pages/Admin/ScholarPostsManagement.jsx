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

  // "Remove posting" needs a second click within 3 seconds.
  const [armedId, setArmedId] = useState('')
  useEffect(() => {
    if (!armedId) return undefined
    const timer = setTimeout(() => setArmedId(''), 3000)
    return () => clearTimeout(timer)
  }, [armedId])

  const handleRemoveClick = (applicationId) => {
    if (armedId !== applicationId) {
      setArmedId(applicationId)
      return
    }
    setArmedId('')
    handleDeletePostedScholar(applicationId)
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
    <div className="flex flex-col gap-4">
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
        <h1 className="portal-page-title">Scholar posts</h1>
        <p className="portal-page-subtitle">
          Manage the official accepted-scholar posting shown on the public landing page.
        </p>
      </div>

      <div className="card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${postedScholars.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-semibold text-brand-primary">Public posting</h2>
                <span className={`badge badge-dot ${postedScholars.length ? 'bg-status-accepted-bg text-status-accepted-fg' : 'bg-status-pending-bg text-status-pending-fg'}`}>
                  {postedScholars.length ? `Published · ${postedScholars.length} scholars` : 'Not published'}
                </span>
              </div>
              <p className="mt-1 text-[15px] text-slate-500">
                Post or refresh the official list of accepted scholars on the public landing page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePublishAcceptedScholars}
            disabled={publishing}
            className="btn btn-primary"
          >
            {publishing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {publishing ? 'Posting scholars…' : postedScholars.length ? 'Refresh posting' : 'Post accepted scholars'}
          </button>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-brand-primary">What the public sees</h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Each card is one posted scholar. Select several to remove them together.
            </p>
          </div>
          <span className="text-sm text-slate-600">{postedScholars.length} posted</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-20 rounded-card" />
            ))}
          </div>
        ) : postedScholars.length === 0 ? (
          <p className="rounded-card border border-dashed border-slate-300 bg-brand-bg px-4 py-6 text-[15px] text-slate-500">
            No scholars are currently posted on the landing page.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-button border border-brand-line bg-emerald-50 p-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  className="h-5 w-5 accent-emerald-700"
                />
                {allSelected ? 'Unselect all posted scholars' : 'Select all posted scholars'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={bulkDeleting || !selectedIds.length}
                  className="btn btn-warn"
                >
                  {bulkDeleting ? 'Removing…' : `Remove selected (${selectedIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deletingAll || !postedScholars.length}
                  className="btn btn-danger"
                >
                  {deletingAll ? 'Removing all…' : 'Remove all'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {postedScholars.map((scholar, index) => {
              const selected = selectedIds.includes(scholar.application_id)
              const armed = armedId === scholar.application_id
              return (
                <div
                  key={scholar.application_id}
                  className={`lift flex animate-slide-up flex-col gap-3 rounded-card border bg-white p-4 ${selected ? 'border-emerald-500 shadow-[0_0_0_3px_#a7f3d0]' : 'border-brand-line'}`}
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleToggleSelect(scholar.application_id)}
                      aria-label={`Select ${scholar.applicant_name}`}
                      className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-primary">{scholar.applicant_name}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{scholar.school || 'No school specified'}</p>
                      <p className="text-sm text-slate-500">{scholar.course || 'No course specified'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveClick(scholar.application_id)}
                    disabled={deletingPostId === scholar.application_id}
                    aria-live="polite"
                    className={`btn btn-danger mt-auto min-h-9 text-sm ${armed ? 'animate-pop-in !border-red-600 !bg-red-600 !text-white' : ''}`}
                  >
                    {deletingPostId === scholar.application_id ? 'Removing…' : armed ? 'Click again to remove' : 'Remove posting'}
                  </button>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
