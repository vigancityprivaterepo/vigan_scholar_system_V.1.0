import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { getStatusBadge } from '../../utils/statusConfig'
import Pagination from '../../components/shared/Pagination'
import { CollapseOut, RemarkField, useRequiredRemark } from '../../components/ui/Motion'
import { useUndoableActions } from '../../hooks/useUndoableActions'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
]
const STATUS_BADGE = {
  PENDING: { label: 'Pending', className: 'bg-status-warn-bg text-status-warn-fg' },
  APPROVED: { label: 'Approved', className: 'bg-status-accepted-bg text-status-accepted-fg' },
  DENIED: { label: 'Denied', className: 'bg-status-rejected-bg text-status-rejected-fg' },
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [resolutions, setResolutions] = useState({})
  const [statusFilter, setStatusFilter] = useState('')
  const { schedule, isHidden } = useUndoableActions()
  const remark = useRequiredRemark()

  const fetchAppeals = useCallback(async () => {
    try {
      const params = { page }
      if (statusFilter) params.status = statusFilter
      const [response, stats] = await Promise.all([
        adminService.listAppeals(params),
        adminService.getStats().catch(() => null),
      ])
      setAppeals(response.data.appeals || [])
      setPagination(response.data.pagination || { total: 0, pages: 1 })
      if (stats) setCounts(stats.data.stats?.appeals || {})
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load appeals.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    setLoading(true)
    fetchAppeals()
  }, [fetchAppeals])

  const resolveAppeal = (appeal, status) => {
    const resolution = String(resolutions[appeal.id] || '').trim()
    if (!remark.require(appeal.id, resolution)) return
    const name = appeal.applicant?.fullName || 'Applicant'
    schedule({
      id: appeal.id,
      message: status === 'APPROVED' ? `Appeal approved for ${name}` : `Appeal denied for ${name}`,
      commit: () => adminService.resolveAppeal(appeal.id, { status, resolution }),
      onDone: fetchAppeals,
      errorMessage: 'Failed to resolve appeal.',
    })
  }

  const countFor = (value) => (value
    ? counts[value] || 0
    : Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="portal-page-title">Appeals</h1>
        <p className="portal-page-subtitle">Requests for reconsideration from applicants who were not qualified or rejected.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show appeals">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            aria-pressed={statusFilter === filter.value}
            onClick={() => { setStatusFilter(filter.value); setPage(1) }}
            className="chip"
          >
            {filter.label}
            <span className="tabular-nums opacity-75">{countFor(filter.value)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-card" />)}
        </div>
      ) : appeals.length === 0 ? (
        <div className="portal-empty text-[15px] text-slate-500">
          {statusFilter === 'PENDING' ? 'No appeals are waiting for a decision.' : 'No appeals match this filter.'}
        </div>
      ) : (
        <>
          {appeals.map((appeal, index) => {
            const badge = STATUS_BADGE[appeal.status] || { label: appeal.status, className: 'bg-status-pending-bg text-status-pending-fg' }
            return (
              <CollapseOut key={appeal.id} leaving={statusFilter === 'PENDING' && isHidden(appeal.id)}>
                <div className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="card grid items-start gap-5 p-5 lg:grid-cols-[minmax(200px,0.8fr)_minmax(0,1.4fr)_minmax(280px,1fr)]">
                    <div className="flex flex-col gap-1">
                      <p className="text-[17px] font-semibold text-brand-primary">{appeal.applicant?.fullName || '—'}</p>
                      <p className="text-sm text-slate-500">{appeal.applicant?.email || '—'}</p>
                      <p className="mt-1 text-[13px] tabular-nums text-slate-500">
                        {appeal.application?.id ? (
                          <Link to={`/admin/applicants/${appeal.application.id}`} className="font-semibold text-brand-teal hover:text-brand-dark">
                            #{appeal.application.id.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : '—'}
                        {appeal.application?.status && ` · was ${getStatusBadge(appeal.application.status).label.toLowerCase()}`}
                      </p>
                      <p className="text-[13px] text-slate-500">
                        Filed {formatDate(appeal.createdAt)}{appeal.application?.academicYear ? ` · AY ${appeal.application.academicYear}` : ''}
                      </p>
                    </div>

                    <blockquote className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] leading-relaxed text-slate-800">
                      “{appeal.reason}”
                    </blockquote>

                    <div>
                      {appeal.status === 'PENDING' && !isHidden(appeal.id) ? (
                        <div className="flex flex-col gap-2">
                          <RemarkField
                            value={resolutions[appeal.id] || ''}
                            onChange={(e) => {
                              setResolutions((prev) => ({ ...prev, [appeal.id]: e.target.value }))
                              remark.clear(appeal.id)
                            }}
                            placeholder="Resolution note (required)"
                            aria-label={`Resolution note for ${appeal.applicant?.fullName || 'applicant'}`}
                            error={remark.errorFor(appeal.id)}
                            shakeKey={remark.shakeKeyFor(appeal.id)}
                            helper="The applicant will see this note, so add a short explanation."
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => resolveAppeal(appeal, 'APPROVED')} className="btn btn-primary">Approve</button>
                            <button type="button" onClick={() => resolveAppeal(appeal, 'DENIED')} className="btn btn-danger">Deny</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2">
                          <span className={`badge badge-dot ${isHidden(appeal.id) ? 'bg-status-pending-bg text-status-pending-fg' : badge.className}`}>
                            {isHidden(appeal.id) ? 'Saving…' : badge.label}
                          </span>
                          {(appeal.resolution || isHidden(appeal.id)) && (
                            <p className="text-sm leading-normal text-slate-600">{appeal.resolution || resolutions[appeal.id]}</p>
                          )}
                        </div>
                      )}
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
                label="appeals"
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
