import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { ArrowRightIcon, DocumentIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

export default function CORReview() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasons, setReasons] = useState({})
  const [acting, setActing] = useState({})

  const fetchData = () => {
    adminService.listApplications({ status: 'COR_SUBMITTED', limit: 50 })
      .then(r => setApps(r.data.applications))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load COR submissions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const review = async (id, approved) => {
    if (!approved && !reasons[id]?.trim()) { toast.error('Please provide a rejection reason'); return }
    setActing(a => ({ ...a, [id]: true }))
    try {
      await adminService.reviewCOR(id, { approved, reason: reasons[id] || undefined })
      toast.success(approved ? 'COR approved. Applicant accepted.' : 'COR rejected.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">COR Review Queue</p>
        <h1 className="portal-page-title mt-2">COR Review</h1>
        <p className="portal-page-subtitle">{apps.length} COR submission(s) pending review</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-36 animate-pulse bg-gray-100" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
            <DocumentIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-xl font-bold text-brand-primary">No CORs pending</p>
          <p className="mt-1 text-sm text-slate-500">All COR submissions have been reviewed.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {apps.map(app => {
            const latestCOR = app.corFiles?.[0] || null
            return (
              <div key={app.id} className="portal-surface p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                    <p className="text-xs text-slate-500">{app.school} • {app.course}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">#{app.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <Link to={`/admin/applicants/${app.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                    Full Review <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>

                {latestCOR ? (
                  <div className="portal-panel mb-4 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="h-5 w-5 text-brand-primary" />
                        <div>
                          <p className="text-sm font-medium text-brand-primary">{latestCOR.fileName}</p>
                          <p className="text-xs text-slate-500">Uploaded {formatDate(latestCOR.uploadedAt)}</p>
                        </div>
                      </div>
                      <a href={latestCOR.fileUrl} target="_blank" rel="noreferrer" className="portal-button-secondary !px-3 !py-1.5 text-xs">
                        View PDF
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="portal-panel mb-4 flex items-center gap-3 p-4 text-sm text-amber-700">
                    <AlertTriangleIcon className="h-5 w-5" />
                    No COR file found.
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <textarea
                    className="portal-input text-sm"
                    rows={2}
                    placeholder="Rejection reason (required if rejecting)"
                    value={reasons[app.id] || ''}
                    onChange={e => setReasons(r => ({ ...r, [app.id]: e.target.value }))}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => review(app.id, true)} disabled={acting[app.id]} className="portal-button-primary flex-1">
                      <CheckCircleIcon className="h-4 w-4" />
                      Approve COR
                    </button>
                    <button onClick={() => review(app.id, false)} disabled={acting[app.id]} className="portal-button-secondary flex-1 !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800">
                      <AlertTriangleIcon className="h-4 w-4" />
                      Reject COR
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
