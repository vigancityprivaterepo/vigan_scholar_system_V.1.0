import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { SearchIcon } from '../../components/ui/PortalIcons'

const STATUS_OPTS = ['All', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const STATUS_LABEL = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export default function RenewalList() {
  const navigate = useNavigate()
  const [renewals, setRenewals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminService.listRenewals()
      .then((res) => setRenewals(res.data.renewals || []))
      .catch(() => toast.error('Failed to load renewals.'))
      .finally(() => setLoading(false))
  }, [])

  const displayed = renewals.filter((r) => {
    if (filter !== 'All' && r.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = r.applicant?.fullName?.toLowerCase() || ''
      const email = r.applicant?.email?.toLowerCase() || ''
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">Admin</p>
        <h1 className="portal-page-title mt-2">Scholarship Renewals</h1>
        <p className="portal-page-subtitle">Review and act on scholar renewal applications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="portal-input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                filter === opt
                  ? 'bg-brand-primary text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt === 'All' ? 'All' : STATUS_LABEL[opt]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="portal-surface p-12 text-center">
          <p className="text-slate-500">No renewal applications found.</p>
        </div>
      ) : (
        <div className="portal-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Scholar</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Ref #</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Academic Year</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/renewals/${r.id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-primary">{r.applicant?.fullName || '—'}</p>
                    <p className="text-xs text-slate-500">{r.applicant?.email || ''}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    #{r.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.academicYear || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right text-xs text-slate-400">{displayed.length} record{displayed.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
