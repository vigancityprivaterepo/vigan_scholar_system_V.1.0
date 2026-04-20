import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmModal from '../../components/shared/ConfirmModal'
import { formatDate } from '../../utils/formatDate'
import { ArrowRightIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../../components/ui/PortalIcons'

const SAVED_VIEWS_KEY = 'adminApplicantList.savedViews.v1'

const getAcademicYearOptions = () => {
  const now = new Date()
  const baseStartYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 8 }, (_, index) => {
    const start = baseStartYear - index
    return `${start}-${start + 1}`
  })
}

const exportToCSV = async (search, statusFilter, academicYear) => {
  try {
    const params = { page: 1, limit: 9999, sortBy: 'submittedAt', sortOrder: 'desc' }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (academicYear) params.academicYear = academicYear
    const r = await adminService.listApplications(params)
    const apps = r.data.applications

    const headers = ['Name', 'Email', 'School', 'Course', 'Year Level', 'Gen. Average (%)', 'Status', 'Contact', 'Submitted']
    const rows = apps.map(a => [
      a.applicant?.fullName || '',
      a.applicant?.email || '',
      a.school || '',
      a.course || '',
      a.yearLevel || '',
      a.generalAverage ? parseFloat(a.generalAverage).toFixed(1) : '',
      a.status || '',
      a.contact || '',
      a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '',
    ])

    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `applicants-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Failed to export CSV')
  }
}

const ALL_STATUSES = ['PENDING_REVIEW', 'INCOMPLETE', 'ELIGIBILITY_SCREENING', 'NOT_QUALIFIED', 'EXAM_INTERVIEW', 'FAILED_EXAM', 'APPROVED', 'COR_SUBMITTED', 'COR_REJECTED', 'ACCEPTED', 'REJECTED']
const DESTRUCTIVE_STATUSES = ['NOT_QUALIFIED', 'FAILED_EXAM', 'REJECTED']

export default function ApplicantList() {
  const [searchParams] = useSearchParams()
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [data, setData] = useState({ applications: [], pagination: { total: 0, pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [academicYear, setAcademicYear] = useState(academicYearOptions[0] || '')
  const [sortBy, setSortBy] = useState('submittedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [savedViews, setSavedViews] = useState([])
  const [selectedViewId, setSelectedViewId] = useState('')
  const [viewName, setViewName] = useState('')

  const [selectedIds, setSelectedIds] = useState([])
  const [batchStatus, setBatchStatus] = useState('')
  const [batchRemarks, setBatchRemarks] = useState('')
  const [batchRejectionReason, setBatchRejectionReason] = useState('')
  const [batchExamScore, setBatchExamScore] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)
  const [confirm, setConfirm] = useState(null) // { message, label, action }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, sortBy, sortOrder }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (academicYear) params.academicYear = academicYear
      const r = await adminService.listApplications(params)
      setData(r.data)
    } catch {
      toast.error('Failed to load applications')
    }
    setLoading(false)
  }, [page, search, statusFilter, sortBy, sortOrder, academicYear])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_VIEWS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setSavedViews(parsed)
    } catch {
      setSavedViews([])
    }
  }, [])
  useEffect(() => {
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews))
  }, [savedViews])

  const visibleIds = useMemo(() => data.applications.map((app) => app.id), [data.applications])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedVisibleCount = useMemo(() => visibleIds.filter((id) => selectedSet.has(id)).length, [visibleIds, selectedSet])
  const isAllVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  const toggleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }

  const sortIcon = (col) => {
    if (sortBy !== col) return <ChevronUpIcon className="h-3.5 w-3.5 text-slate-300" />
    return sortOrder === 'asc'
      ? <ChevronUpIcon className="h-3.5 w-3.5 text-brand-primary" />
      : <ChevronDownIcon className="h-3.5 w-3.5 text-brand-primary" />
  }

  const toggleSelect = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id)
      return [...current, id]
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (isAllVisibleSelected) return current.filter((id) => !visibleIds.includes(id))
      const merged = new Set([...current, ...visibleIds])
      return [...merged]
    })
  }

  const clearBatchFields = () => {
    setBatchStatus('')
    setBatchRemarks('')
    setBatchRejectionReason('')
    setBatchExamScore('')
  }

  const saveCurrentView = () => {
    const normalizedName = viewName.trim()
    if (!normalizedName) {
      toast.error('Enter a view name first.')
      return
    }
    const newView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      search,
      statusFilter,
      academicYear,
      sortBy,
      sortOrder,
    }
    setSavedViews((current) => [newView, ...current].slice(0, 20))
    setSelectedViewId(newView.id)
    setViewName('')
    toast.success('Filter view saved.')
  }

  const applySavedView = (viewId) => {
    setSelectedViewId(viewId)
    if (!viewId) return
    const view = savedViews.find((item) => item.id === viewId)
    if (!view) return
    setSearch(view.search || '')
    setStatusFilter(view.statusFilter || '')
    setAcademicYear(view.academicYear || '')
    setSortBy(view.sortBy || 'submittedAt')
    setSortOrder(view.sortOrder === 'asc' ? 'asc' : 'desc')
    setPage(1)
    toast.success(`Applied view: ${view.name}`)
  }

  const deleteSavedView = () => {
    if (!selectedViewId) {
      toast.error('Select a saved view to delete.')
      return
    }
    const target = savedViews.find((item) => item.id === selectedViewId)
    setConfirm({
      message: `Delete saved view "${target?.name || 'selected'}"? This cannot be undone.`,
      label: 'Delete View',
      action: () => {
        setSavedViews((current) => current.filter((item) => item.id !== selectedViewId))
        setSelectedViewId('')
        toast.success('Saved view deleted.')
      },
    })
  }

  const executeBatch = async () => {
    setConfirm(null)
    setBatchLoading(true)
    try {
      const payload = {
        applicationIds: selectedIds,
        status: batchStatus,
        remarks: batchRemarks || undefined,
        rejectionReason: batchRejectionReason || undefined,
        examScore: batchExamScore ? parseFloat(batchExamScore) : undefined,
      }
      const { data: response } = await adminService.batchUpdateStatus(payload)

      const updated = response.summary?.updated || 0
      const skipped = response.summary?.skipped || 0
      if (updated > 0) toast.success(`Updated ${updated} application(s).`)
      if (skipped > 0) {
        const preview = response.skipped?.slice(0, 2).map((item) => item.reason).join(' | ')
        toast.error(`Skipped ${skipped} application(s). ${preview || ''}`.trim())
      }

      setSelectedIds([])
      clearBatchFields()
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Batch update failed.')
    } finally {
      setBatchLoading(false)
    }
  }

  const runBatchStatus = () => {
    if (selectedIds.length === 0) { toast.error('Select at least one application.'); return }
    if (!batchStatus) { toast.error('Choose a target status first.'); return }

    if (DESTRUCTIVE_STATUSES.includes(batchStatus)) {
      setConfirm({
        message: `Apply ${batchStatus.replaceAll('_', ' ')} to ${selectedIds.length} application(s)? This action cannot be undone.`,
        label: `Apply ${batchStatus.replaceAll('_', ' ')}`,
        action: executeBatch,
      })
      return
    }

    executeBatch()
  }

  return (
    <div className="flex flex-col gap-6">
      {confirm && (
        <ConfirmModal
          title={confirm.label}
          message={confirm.message}
          confirmLabel={confirm.label}
          danger
          onConfirm={() => { confirm.action(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="portal-kicker">Application Queue</p>
          <h1 className="portal-page-title mt-2">Applicants</h1>
          <p className="portal-page-subtitle">{data.pagination.total} total applications</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/bulk-email" className="portal-button-primary whitespace-nowrap !px-4 !py-2 text-sm">
            Bulk Email Module
          </Link>
          <button
            onClick={() => exportToCSV(search, statusFilter, academicYear)}
            className="portal-button-secondary whitespace-nowrap !px-4 !py-2 text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="portal-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="portal-input pl-10"
              placeholder="Search by name, email, or Ref. ID (e.g. #A1B2C3D4)..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={fetchData} className="portal-button-primary whitespace-nowrap">Search</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Filter:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="portal-input flex-1 sm:flex-none sm:w-auto min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); setPage(1) }}
            className="portal-input flex-1 sm:flex-none sm:w-auto min-w-[140px]"
          >
            <option value="">All Academic Years</option>
            {academicYearOptions.map((year) => (
              <option key={year} value={year}>AY {year}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            className="portal-input"
            placeholder="Saved view name (e.g., Accepted 2026)"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <button type="button" onClick={saveCurrentView} className="portal-button-secondary whitespace-nowrap">
            Save Current View
          </button>
          <div className="flex gap-2">
            <select
              value={selectedViewId}
              onChange={(e) => applySavedView(e.target.value)}
              className="portal-input min-w-[180px]"
            >
              <option value="">Saved Views</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>{view.name}</option>
              ))}
            </select>
            <button type="button" onClick={deleteSavedView} className="portal-button-secondary whitespace-nowrap">
              Delete
            </button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="portal-surface border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Batch Action</p>
              <p className="mt-1 text-sm text-emerald-900">{selectedIds.length} selected application(s)</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedIds([]); clearBatchFields() }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Clear Selection
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="portal-input" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)}>
              <option value="">Select target status</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input
              type="number"
              className="portal-input"
              placeholder="Exam score (optional)"
              value={batchExamScore}
              onChange={(e) => setBatchExamScore(e.target.value)}
            />
            <textarea
              className="portal-input"
              rows={2}
              placeholder="Admin remarks (optional)"
              value={batchRemarks}
              onChange={(e) => setBatchRemarks(e.target.value)}
            />
            <textarea
              className="portal-input"
              rows={2}
              placeholder="Rejection reason (optional)"
              value={batchRejectionReason}
              onChange={(e) => setBatchRejectionReason(e.target.value)}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={runBatchStatus}
              disabled={batchLoading}
              className="portal-button-primary"
            >
              {batchLoading ? 'Processing...' : 'Apply to Selected'}
            </button>
          </div>
        </div>
      )}

      <div className="portal-surface overflow-hidden p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={isAllVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select all visible" />
                </th>
                {[
                  { label: 'Name', col: 'applicant' },
                  { label: 'School', col: null },
                  { label: 'Gen. Avg', col: 'gwa' },
                  { label: 'Status', col: 'status' },
                  { label: 'Submitted', col: 'submittedAt' },
                  { label: 'Action', col: null },
                ].map(({ label, col }) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {col ? (
                      <button onClick={() => toggleSort(col)} className="flex items-center gap-1 transition-colors hover:text-brand-primary">
                        {label} {sortIcon(col)}
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
                    {[1, 2, 3, 4, 5, 6, 7].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : data.applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p>No applications found</p>
                  </td>
                </tr>
              ) : (
                data.applications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        aria-label={`Select ${app.applicant?.fullName || app.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-brand-primary">{app.applicant?.fullName}</p>
                        <p className="text-xs text-slate-500">{app.applicant?.email}</p>
                        <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-400">#{app.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p className="max-w-32 truncate">{app.school || '-'}</p>
                      <p className="max-w-32 truncate text-xs text-slate-400">{app.course || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono text-sm font-bold', app.generalAverage && parseFloat(app.generalAverage) >= 83 ? 'text-green-600' : app.generalAverage ? 'text-red-500' : 'text-slate-400')}>
                        {app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(1)}%` : '-'}
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
              <div key={app.id} className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedSet.has(app.id)}
                  onChange={() => toggleSelect(app.id)}
                  aria-label={`Select ${app.applicant?.fullName || app.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                    <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wider text-slate-400">#{app.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{app.applicant?.email}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{app.school || '-'}{app.course ? ` • ${app.course}` : ''}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status} size="sm" />
                    {app.generalAverage && (
                      <span className={clsx('font-mono text-xs font-bold', parseFloat(app.generalAverage) >= 83 ? 'text-green-600' : 'text-red-500')}>
                        {parseFloat(app.generalAverage).toFixed(1)}%
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
