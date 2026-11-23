import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { SearchIcon } from '../../components/ui/PortalIcons'
import { RemarkField, useRequiredRemark } from '../../components/ui/Motion'
import { useUndoableActions } from '../../hooks/useUndoableActions'

const STATUS_OPTS = ['All', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-status-warn-bg text-status-warn-fg',
  APPROVED: 'bg-status-accepted-bg text-status-accepted-fg',
  REJECTED: 'bg-status-rejected-bg text-status-rejected-fg',
}

const STATUS_LABEL = {
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export default function RenewalList() {
  const [renewals, setRenewals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [rejecting, setRejecting] = useState(null)
  const [remarks, setRemarks] = useState({})
  // Status shown while a decision waits on Undo.
  const [pendingStatus, setPendingStatus] = useState({})
  const { schedule, isHidden } = useUndoableActions()
  const remark = useRequiredRemark()

  const fetchRenewals = useCallback(() => {
    adminService.listRenewals()
      .then((res) => setRenewals(res.data.renewals || []))
      .catch(() => toast.error('Failed to load renewals.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRenewals() }, [fetchRenewals])

  const statusOf = (r) => (isHidden(r.id) && pendingStatus[r.id]) || r.status

  const decide = (r, status) => {
    const text = String(remarks[r.id] || '').trim()
    if (status === 'REJECTED' && !remark.require(r.id, text)) return
    setPendingStatus((current) => ({ ...current, [r.id]: status }))
    setRejecting(null)
    const name = r.applicant?.fullName || 'Scholar'
    schedule({
      id: r.id,
      message: status === 'APPROVED' ? `Renewal approved for ${name}` : `Renewal rejected for ${name}`,
      commit: () => adminService.updateRenewalStatus(r.id, status === 'APPROVED' ? { status } : { status, adminRemarks: text }),
      onDone: fetchRenewals,
      errorMessage: 'Failed to update renewal.',
    })
  }

  const countFor = (opt) => (opt === 'All' ? renewals.length : renewals.filter((r) => statusOf(r) === opt).length)

  const displayed = renewals.filter((r) => {
    if (filter !== 'All' && statusOf(r) !== filter && !isHidden(r.id)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = r.applicant?.fullName?.toLowerCase() || ''
      const email = r.applicant?.email?.toLowerCase() || ''
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="portal-page-title">Scholarship renewals</h1>
        <p className="portal-page-subtitle">Scholars renewing for the next academic year. Check grades and enrollment before approving.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_OPTS.map((opt) => (
            <button key={opt} type="button" onClick={() => setFilter(opt)} aria-pressed={filter === opt} className="chip">
              {opt === 'All' ? 'All' : STATUS_LABEL[opt]}
              <span className="tabular-nums opacity-75">{countFor(opt)}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-60">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            aria-label="Search renewals"
            placeholder="Search scholar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="portal-empty text-[15px] text-slate-500">
          {filter === 'PENDING_REVIEW' && !search.trim() ? 'No renewals are waiting for review.' : 'No renewals match this filter.'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[820px]">
            <thead>
              <tr>
                <th>Scholar</th>
                <th>Reference</th>
                <th>Academic year</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => {
                const status = statusOf(r)
                const waiting = isHidden(r.id)
                return (
                  <tr key={r.id} className={waiting ? 'bg-brand-bg' : ''}>
                    <td>
                      <Link to={`/admin/renewals/${r.id}`} className="font-semibold text-brand-primary hover:text-brand-teal">
                        {r.applicant?.fullName || 'Unnamed scholar'}
                      </Link>
                      <p className="text-[13px] text-slate-500">{r.applicant?.email || ''}</p>
                    </td>
                    <td className="text-sm tabular-nums text-slate-500">#{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className="text-slate-700">{r.academicYear || '—'}</td>
                    <td>
                      <span key={status} className={`badge badge-dot animate-pop-in ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="text-sm text-slate-500">{formatDate(r.submittedAt)}</td>
                    <td className="text-right">
                      {r.status === 'PENDING_REVIEW' && !waiting ? (
                        rejecting === r.id ? (
                          <div className="ml-auto flex max-w-xs flex-col gap-2 text-left">
                            <RemarkField
                              autoFocus
                              value={remarks[r.id] || ''}
                              onChange={(e) => {
                                setRemarks((current) => ({ ...current, [r.id]: e.target.value }))
                                remark.clear(r.id)
                              }}
                              placeholder="Reason (required)"
                              aria-label={`Rejection reason for ${r.applicant?.fullName || 'scholar'}`}
                              error={remark.errorFor(r.id)}
                              shakeKey={remark.shakeKeyFor(r.id)}
                              helper="The scholar will see this reason."
                            />
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => setRejecting(null)} className="btn btn-ghost-secondary min-h-[34px] px-3 text-sm">Cancel</button>
                              <button type="button" onClick={() => decide(r, 'REJECTED')} className="btn btn-danger min-h-[34px] px-3 text-sm">Reject</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => decide(r, 'APPROVED')} className="btn btn-primary min-h-[34px] px-3 text-sm">Approve</button>
                            <button type="button" onClick={() => setRejecting(r.id)} className="btn btn-danger min-h-[34px] px-3 text-sm">Reject</button>
                          </div>
                        )
                      ) : (
                        <Link to={`/admin/renewals/${r.id}`} className="text-sm font-semibold text-brand-teal hover:text-brand-dark">Open →</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right text-sm text-slate-500">{displayed.length} record{displayed.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
