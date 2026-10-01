import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { formatDateTime } from '../../utils/formatDate'
import { getStatusBadge } from '../../utils/statusConfig'

const APPEAL_STATUS_LABEL = { PENDING: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' }

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolutions, setResolutions] = useState({})
  const [actingId, setActingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchAppeals = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await adminService.listAppeals(params)
      setAppeals(response.data.appeals || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load appeals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppeals() }, [statusFilter])

  const resolveAppeal = async (appeal, status) => {
    const resolution = String(resolutions[appeal.id] || '').trim()
    if (!resolution) {
      toast.error('Please provide a resolution note.')
      return
    }
    try {
      setActingId(appeal.id)
      const response = await adminService.resolveAppeal(appeal.id, { status, resolution })
      toast.success(response.data.message || 'Appeal resolved.')
      fetchAppeals()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve appeal.')
    } finally {
      setActingId('')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="portal-page-title">Appeals</h1>
          <p className="portal-page-subtitle">Review and resolve rejected applicant appeals.</p>
        </div>
      </div>

      <div className="portal-surface p-4">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="appeal-filter">Show appeals</label>
          <select id="appeal-filter" className="portal-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Appeals</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
          </select>
          <button onClick={fetchAppeals} className="portal-button-secondary">Refresh</button>
        </div>
      </div>

      <div className="portal-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Applicant</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Application</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : appeals.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                  {statusFilter === 'PENDING' ? 'No appeals are waiting for a decision.' : 'No appeals match this filter.'}
                </td></tr>
              ) : (
                appeals.map((appeal) => (
                  <tr key={appeal.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3 text-sm text-slate-700">
                      <p className="font-medium text-brand-primary">{appeal.applicant?.fullName || '-'}</p>
                      <p className="text-xs text-slate-500">{appeal.applicant?.email || '-'}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {appeal.application?.id ? (
                        <Link to={`/admin/applicants/${appeal.application.id}`} className="font-medium text-brand-primary underline-offset-2 hover:underline">
                          Open application #{appeal.application.id.slice(0, 8).toUpperCase()}
                        </Link>
                      ) : <p>-</p>}
                      <p>{appeal.application?.status ? getStatusBadge(appeal.application.status).label : '-'}</p>
                      <p>{appeal.application?.academicYear ? `AY ${appeal.application.academicYear}` : '-'}</p>
                      <p>{formatDateTime(appeal.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700">{appeal.reason}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      <p className="font-semibold">{APPEAL_STATUS_LABEL[appeal.status] || appeal.status}</p>
                      {appeal.resolution && <p className="mt-1 text-slate-500">Resolution: {appeal.resolution}</p>}
                    </td>
                    <td className="px-3 py-3">
                      {appeal.status === 'PENDING' ? (
                        <div className="flex min-w-[250px] flex-col gap-2">
                          <textarea
                            className="portal-input text-xs"
                            rows={2}
                            placeholder="Resolution notes"
                            value={resolutions[appeal.id] || ''}
                            onChange={(e) => setResolutions((prev) => ({ ...prev, [appeal.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveAppeal(appeal, 'APPROVED')}
                              disabled={actingId === appeal.id}
                              className="portal-button-primary !px-3 !py-1.5 text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => resolveAppeal(appeal, 'DENIED')}
                              disabled={actingId === appeal.id}
                              className="portal-button-secondary !border-red-300 !px-3 !py-1.5 text-xs !text-red-700"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Resolved</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
