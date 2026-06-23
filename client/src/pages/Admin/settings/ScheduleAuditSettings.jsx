import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Pagination from '../../../components/shared/Pagination'
import { adminService } from '../../../services/adminService'
import { formatDateTime, formatScheduleDateTime } from '../../../utils/formatDate'
import { ArrowRightIcon, SearchIcon } from '../../../components/ui/PortalIcons'

export default function ScheduleAuditSettings() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 })

  const loadRecords = useCallback(() => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (search.trim()) params.search = search.trim()
    adminService.listExamScheduleRecords(params)
      .then((response) => {
        setRecords(response.data.records || [])
        setPagination(response.data.pagination || { total: 0, pages: 1, limit: 20 })
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load schedule audit records.'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return (
    <section className="portal-surface p-6">
      <div className="mb-5">
        <p className="portal-kicker">Schedule Audit</p>
        <h2 className="mt-1 text-lg font-semibold text-brand-primary">Exam / Interview Schedule Records</h2>
        <p className="mt-2 text-sm text-slate-500">
          Review which applicants were sent a schedule, including the assigned examiner, schedule type, and send timestamp.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="portal-input pl-10"
            placeholder="Search by applicant, email, school, location, or examiner"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {pagination.total} total record{pagination.total === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">No schedule audit records found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <div key={record.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-primary">{record.application?.applicant?.fullName || 'Unknown applicant'}</p>
                  <p className="truncate text-xs text-slate-500">#{record.applicationId.slice(0, 8).toUpperCase()} | {record.application?.applicant?.email || 'No email'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{record.application?.school || 'School not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Scheduled for</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatScheduleDateTime(record.scheduledAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{record.type}{record.location ? ` | ${record.location}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Sent at</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(record.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{record.examiner?.fullName ? `${record.examiner.fullName} (${record.examiner.role})` : 'No examiner assigned'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{record.status}</span>
                  <Link to={`/admin/applicants/${record.applicationId}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                    Open <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          pages={pagination.pages}
          total={pagination.total}
          label="schedule records"
          onPrev={() => setPage((current) => current - 1)}
          onNext={() => setPage((current) => current + 1)}
        />
      </div>
    </section>
  )
}
