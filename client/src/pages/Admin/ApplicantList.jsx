import React, { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { ArrowRightIcon, SearchIcon } from '../../components/ui/PortalIcons'

const ALL_STATUSES = ['PENDING_REVIEW','INCOMPLETE','ELIGIBILITY_SCREENING','NOT_QUALIFIED','EXAM_INTERVIEW','FAILED_EXAM','APPROVED','COR_SUBMITTED','COR_REJECTED','ACCEPTED','REJECTED']

export default function ApplicantList() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState({ applications: [], pagination: { total: 0, pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [sortBy, setSortBy] = useState('submittedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, sortBy, sortOrder }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const r = await adminService.listApplications(params)
      setData(r.data)
    } catch {}
    setLoading(false)
  }, [page, search, statusFilter, sortBy, sortOrder])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }
  const sortIcon = (col) => sortBy === col ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">Application Queue</p>
        <h1 className="portal-page-title mt-2">Applicants</h1>
        <p className="portal-page-subtitle">{data.pagination.total} total applications</p>
      </div>

      <div className="portal-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="portal-input pl-10"
              placeholder="Search by name, email, school..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={fetchData} className="portal-button-primary whitespace-nowrap">Search</button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-slate-500 whitespace-nowrap">Filter:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="portal-input w-auto"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="portal-surface overflow-hidden p-0">
        {/* Desktop table — hidden on mobile */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  { label: 'Name', col: 'applicant' },
                  { label: 'School', col: null },
                  { label: 'GWA', col: 'gwa' },
                  { label: 'Status', col: 'status' },
                  { label: 'Submitted', col: 'submittedAt' },
                  { label: 'Action', col: null },
                ].map(({ label, col }) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {col ? (
                      <button onClick={() => toggleSort(col)} className="flex items-center gap-1 transition-colors hover:text-brand-primary">
                        {label} <span className="text-slate-400">{sortIcon(col)}</span>
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : data.applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p>No applications found</p>
                  </td>
                </tr>
              ) : (
                data.applications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-brand-primary">{app.applicant?.fullName}</p>
                        <p className="text-xs text-slate-500">{app.applicant?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="max-w-32 truncate">{app.school || '-'}</p>
                      <p className="max-w-32 truncate text-xs text-slate-400">{app.course || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono text-sm font-bold', app.gwa && parseFloat(app.gwa) <= 2.0 ? 'text-green-600' : app.gwa ? 'text-red-500' : 'text-slate-400')}>
                        {app.gwa ? parseFloat(app.gwa).toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} size="sm" /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(app.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/applicants/${app.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
                        Review <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list — visible only on mobile */}
        <div className="flex flex-col divide-y divide-slate-100 md:hidden">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4">
                <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          ) : data.applications.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No applications found</p>
          ) : (
            data.applications.map((app) => (
              <div key={app.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{app.applicant?.email}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{app.school || '-'}{app.course ? ` • ${app.course}` : ''}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status} size="sm" />
                    {app.gwa && (
                      <span className={clsx('font-mono text-xs font-bold', parseFloat(app.gwa) <= 2.0 ? 'text-green-600' : 'text-red-500')}>
                        GWA {parseFloat(app.gwa).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(app.submittedAt)}</span>
                  </div>
                </div>
                <Link to={`/admin/applicants/${app.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
                  Review <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            ))
          )}
        </div>

        {data.pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Page {page} of {data.pagination.pages} • {data.pagination.total} results</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Prev</button>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
