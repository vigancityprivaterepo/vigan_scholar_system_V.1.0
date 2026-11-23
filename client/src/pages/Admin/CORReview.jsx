import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { openProtectedFile } from '../../utils/openProtectedFile'
import Pagination from '../../components/shared/Pagination'
import { AlertTriangleIcon } from '../../components/ui/PortalIcons'
import { CollapseOut, EmptyQueue, RemarkField, useRequiredRemark } from '../../components/ui/Motion'
import { useUndoableActions } from '../../hooks/useUndoableActions'

const PAGE_SIZE = 20

export default function CORReview() {
  const [apps, setApps] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reasons, setReasons] = useState({})
  const { schedule, isHidden } = useUndoableActions()
  const remark = useRequiredRemark()

  const fetchData = useCallback(() => {
    adminService.listApplications({ status: 'COR_SUBMITTED', limit: PAGE_SIZE, page })
      .then(r => {
        setApps(r.data.applications)
        setPagination(r.data.pagination || { total: 0, pages: 1 })
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load COR submissions.'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const review = (app, approved) => {
    const reason = reasons[app.id] || ''
    if (!approved && !remark.require(app.id, reason)) return
    const name = app.applicant?.fullName || 'Applicant'
    schedule({
      id: app.id,
      message: approved ? `COR approved · ${name} accepted` : `COR returned to ${name}`,
      commit: () => adminService.reviewCOR(app.id, { approved, reason: reason || undefined }),
      onDone: fetchData,
    })
  }

  const openCor = async (corId) => {
    try {
      await openProtectedFile(`/files/cor/${corId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open COR file.')
    }
  }

  const waiting = Math.max(0, pagination.total - apps.filter((app) => isHidden(app.id)).length)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="portal-page-title">COR review</h1>
        <p className="portal-page-subtitle">
          <strong className="text-brand-primary">{waiting}</strong> certificates of registration waiting. Approving a COR accepts the applicant as a scholar.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-card" />)}
        </div>
      ) : apps.length === 0 || (apps.every((app) => isHidden(app.id)) && pagination.pages <= 1) ? (
        <EmptyQueue title="No CORs pending">All COR submissions have been reviewed.</EmptyQueue>
      ) : (
        <>
          {apps.map((app, index) => {
            const latestCOR = app.corFiles?.[0] || null
            return (
              <CollapseOut key={app.id} leaving={isHidden(app.id)}>
                <div className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="card grid items-center gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)_minmax(280px,1fr)]">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[17px] font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                      <p className="text-sm text-slate-500">{app.school} · {app.course}</p>
                      <p className="text-[13px] tabular-nums text-slate-500">#{app.id.slice(0, 8).toUpperCase()}</p>
                      <Link to={`/admin/applicants/${app.id}`} className="mt-1 self-start py-1 text-sm font-semibold text-brand-teal hover:text-brand-dark">
                        Open full review →
                      </Link>
                    </div>

                    {latestCOR ? (
                      <div className="flex items-center gap-3 rounded-[14px] border border-brand-divider bg-brand-bg p-3">
                        <div className="flex h-[54px] w-11 shrink-0 items-end justify-center rounded-md border border-brand-line bg-[repeating-linear-gradient(0deg,#fff_0_6px,#ecfdf5_6px_7px)] pb-1 text-[10px] font-bold text-red-700" aria-hidden="true">PDF</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-brand-primary">{latestCOR.fileName}</p>
                          <p className="text-[13px] text-slate-500">Uploaded {formatDate(latestCOR.uploadedAt)}</p>
                        </div>
                        <button type="button" onClick={() => openCor(latestCOR.id)} className="btn min-h-9 px-3 text-sm">View</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangleIcon className="h-5 w-5" />
                        No COR file found.
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <RemarkField
                        value={reasons[app.id] || ''}
                        onChange={(e) => {
                          setReasons(r => ({ ...r, [app.id]: e.target.value }))
                          remark.clear(app.id)
                        }}
                        placeholder="Reason (required to reject)"
                        aria-label={`Rejection reason for ${app.applicant?.fullName || 'applicant'}`}
                        error={remark.errorFor(app.id)}
                        shakeKey={remark.shakeKeyFor(app.id)}
                        helper="Tell the scholar what to fix, e.g. “Upload the COR for the current semester.”"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => review(app, true)} className="btn btn-primary">Approve COR</button>
                        <button type="button" onClick={() => review(app, false)} className="btn btn-danger">Reject COR</button>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapseOut>
            )
          })}

          {pagination.pages > 1 && (
            <div className="card">
              <Pagination
                page={page}
                pages={pagination.pages}
                total={pagination.total}
                label="submissions"
                onPrev={() => setPage(p => p - 1)}
                onNext={() => setPage(p => p + 1)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
