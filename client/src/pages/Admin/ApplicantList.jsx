import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmModal from '../../components/shared/ConfirmModal'
import { formatDate } from '../../utils/formatDate'
import { getStatusBadge } from '../../utils/statusConfig'
import { ArrowRightIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, XIcon } from '../../components/ui/PortalIcons'
import ReviewDrawer from '../../components/admin/ReviewDrawer'
import { barangayOf } from '../../utils/requirements'

const SAVED_VIEWS_KEY = 'adminApplicantList.savedViews.v1'

const getAcademicYearOptions = () => {
  const now = new Date()
  const baseStartYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 8 }, (_, index) => {
    const start = baseStartYear - index
    return `${start}-${start + 1}`
  })
}

const getFirstPreferenceDetails = (application) => {
  const firstPreference = application.collegePreferences?.[0]

  return {
    school: firstPreference?.name?.trim() || '',
    course: firstPreference?.course?.trim() || application.course || '',
  }
}

const exportToCSV = async (search, statusFilter, academicYear, onlyIds = null) => {
  try {
    const params = { page: 1, limit: 9999, sortBy: 'submittedAt', sortOrder: 'desc' }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (academicYear) params.academicYear = academicYear
    const r = await adminService.listApplications(params)
    const apps = onlyIds ? r.data.applications.filter((a) => onlyIds.has(a.id)) : r.data.applications

    const headers = [
      'Reference ID',
      'Applicant Account Name',
      'Last Name',
      'First Name',
      'Middle Name',
      'Email',
      'Contact',
      'Birthdate',
      'Age',
      'Sex',
      'Gender',
      'Place of Birth',
      'Address',
      'School',
      'College Preference School',
      'Course',
      'Year Level',
      'Gen. Average (%)',
      'Status',
      'Academic Year',
      'Submitted',
    ]
    const rows = apps.map(a => {
      const firstPreference = getFirstPreferenceDetails(a)

      return [
        a.id ? `#${String(a.id).slice(0, 8).toUpperCase()}` : '',
        a.applicant?.fullName || '',
        a.lastName || '',
        a.firstName || '',
        a.middleName || '',
        a.applicant?.email || '',
        a.contact || '',
        a.birthdate ? new Date(a.birthdate).toLocaleDateString() : '',
        a.age ?? '',
        a.sex || '',
        a.gender || '',
        a.placeOfBirth || '',
        a.address || '',
        a.school || '',
        firstPreference.school,
        firstPreference.course,
        a.yearLevel || '',
        a.generalAverage ? parseFloat(a.generalAverage).toFixed(1) : '',
        a.status || '',
        a.academicYear || '',
        a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '',
      ]
    })

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
const SORTS = {
  new: { label: 'Newest first', sortBy: 'submittedAt', sortOrder: 'desc' },
  old: { label: 'Oldest first', sortBy: 'submittedAt', sortOrder: 'asc' },
  gwa: { label: 'Highest GWA', sortBy: 'gwa', sortOrder: 'desc' },
  name: { label: 'Name A–Z', sortBy: 'applicant', sortOrder: 'asc' },
}
// Clicks on these inside a row do their own thing instead of opening the drawer.
const INTERACTIVE = 'a, button, input, select, textarea, label'

export default function ApplicantList() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [data, setData] = useState({ applications: [], pagination: { total: 0, pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [academicYear, setAcademicYear] = useState('')
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
  const [pendingApplicantDelete, setPendingApplicantDelete] = useState(null)
  const [deletingApplicantId, setDeletingApplicantId] = useState('')
  const canDeleteApplicants = user?.role === 'SUPER_ADMIN'
  const [statusCounts, setStatusCounts] = useState({})
  const [threshold, setThreshold] = useState(83)
  const [drawerId, setDrawerId] = useState(searchParams.get('review') || '')
  const [batchOpen, setBatchOpen] = useState(false)
  const [flashId, setFlashId] = useState('')

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
  // Chip counts follow the academic-year filter.
  const fetchCounts = useCallback(() => {
    adminService.getStats(academicYear ? { academicYear } : undefined)
      .then((r) => setStatusCounts(r.data.stats?.byStatus || {}))
      .catch(() => {})
  }, [academicYear])
  useEffect(() => { fetchCounts() }, [fetchCounts])
  useEffect(() => {
    adminService.getSiteSettings()
      .then((r) => {
        const t = parseFloat(r.data.settings?.gwaThreshold)
        if (!Number.isNaN(t)) setThreshold(t)
      })
      .catch(() => {})
  }, [])
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

  const confirmApplicantDelete = async () => {
    if (!pendingApplicantDelete) return
    const target = pendingApplicantDelete
    setDeletingApplicantId(target.id)
    try {
      const { data: response } = await adminService.deleteApplicant(target.id)
      toast.success(response.message || 'Application deleted successfully.')
      if (selectedSet.has(target.id)) {
        setSelectedIds((current) => current.filter((id) => id !== target.id))
      }
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete applicant.')
    } finally {
      setDeletingApplicantId('')
      setPendingApplicantDelete(null)
    }
  }

  const sortKey = Object.keys(SORTS).find((key) => SORTS[key].sortBy === sortBy && SORTS[key].sortOrder === sortOrder) || ''
  const totalCount = Object.values(statusCounts).reduce((sum, n) => sum + (Number(n) || 0), 0)
  const chipStatuses = ALL_STATUSES.filter((status) => statusCounts[status] > 0 || status === statusFilter)

  const openRow = (event, id) => {
    if (event.target.closest(INTERACTIVE)) return
    setDrawerId(id)
  }

  // After a decision in the drawer, move on to the next applicant still pending review.
  const handleDecided = (id, status) => {
    toast.success(status === 'ELIGIBILITY_SCREENING' ? 'Sent to eligibility screening.' : 'Marked incomplete. The applicant has been told what to fix.')
    const list = data.applications
    const at = list.findIndex((app) => app.id === id)
    const next = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))].find((app) => app.id !== id && app.status === 'PENDING_REVIEW')
    setDrawerId(next ? next.id : '')
    setFlashId(id)
    fetchData()
    fetchCounts()
  }

  const hasFilters = Boolean(search.trim() || statusFilter || academicYear)
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setAcademicYear('')
    setSelectedViewId('')
    setPage(1)
  }
  const emptyState = hasFilters ? (
    <>
      <p className="text-sm text-slate-700">No applications match these filters.</p>
      <button type="button" onClick={clearFilters} className="mt-2 text-sm font-medium text-brand-primary underline-offset-2 hover:underline">
        Clear filters
      </button>
    </>
  ) : (
    <p className="text-sm text-slate-500">No applications yet. They appear here as soon as applicants submit the form.</p>
  )

  return (
    <div className="flex flex-col gap-4">
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
      {pendingApplicantDelete && (
        <ConfirmModal
          title="Delete Application"
          message={`Delete the application of ${pendingApplicantDelete.applicant?.fullName || 'this applicant'} (${pendingApplicantDelete.applicant?.email || 'no email'})? The applicant account will remain. This action cannot be undone.`}
          confirmLabel="Delete Application"
          danger
          loading={deletingApplicantId === pendingApplicantDelete.id}
          onConfirm={confirmApplicantDelete}
          onCancel={() => setPendingApplicantDelete(null)}
        />
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="portal-page-title">Applicants</h1>
          <p className="portal-page-subtitle">
            {data.pagination.total} applications · click a row to review, then use J / K to move between applicants and Esc to close.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/bulk-email" className="btn whitespace-nowrap">
            Email applicants
          </Link>
          <button
            onClick={() => exportToCSV(search, statusFilter, academicYear)}
            className="btn whitespace-nowrap"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              aria-label="Search applications"
              className="form-control pl-10"
              placeholder="Search by name, email, or Ref. ID (e.g. #A1B2C3D4)"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          <button type="button" className="chip" aria-pressed={!statusFilter} onClick={() => { setStatusFilter(''); setPage(1) }}>
            All <span className="tabular-nums opacity-75">{totalCount}</span>
          </button>
          {chipStatuses.map((status) => (
            <button key={status} type="button" className="chip" aria-pressed={statusFilter === status} onClick={() => { setStatusFilter(status); setPage(1) }}>
              {getStatusBadge(status).label} <span className="tabular-nums opacity-75">{statusCounts[status] || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            aria-label="Academic year"
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); setPage(1) }}
            className="form-control w-auto min-w-[140px]"
          >
            <option value="">All academic years</option>
            {academicYearOptions.map((year) => (
              <option key={year} value={year}>AY {year}</option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sortKey}
            onChange={(e) => {
              const next = SORTS[e.target.value]
              if (!next) return
              setSortBy(next.sortBy)
              setSortOrder(next.sortOrder)
              setPage(1)
            }}
            className="form-control w-auto min-w-[160px] sm:ml-auto"
          >
            {!sortKey && <option value="">Custom sort</option>}
            {Object.entries(SORTS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
          </select>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            aria-label="Name for this view"
            className="form-control"
            placeholder="Name this view to reuse it (e.g. Accepted 2026)"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <button type="button" onClick={saveCurrentView} className="btn whitespace-nowrap">
            Save current view
          </button>
          <div className="flex gap-2">
            <select
              aria-label="Saved views"
              value={selectedViewId}
              onChange={(e) => applySavedView(e.target.value)}
              className="form-control min-w-[180px]"
            >
              <option value="">Saved views</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>{view.name}</option>
              ))}
            </select>
            <button type="button" onClick={deleteSavedView} className="btn whitespace-nowrap">
              Delete
            </button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 lg:ml-32" role="region" aria-label="Bulk actions">
          <div className="animate-sheet-up">
          {batchOpen && (
            <div className="mb-2 grid animate-pop-in gap-2 rounded-2xl bg-white p-3 shadow-raised ring-1 ring-brand-line sm:grid-cols-2">
              <input
                type="number"
                aria-label="General score"
                className="form-control"
                placeholder="General score (optional)"
                value={batchExamScore}
                onChange={(e) => setBatchExamScore(e.target.value)}
              />
              <input
                aria-label="Remarks"
                className="form-control"
                placeholder="Admin remarks (optional)"
                value={batchRemarks}
                onChange={(e) => setBatchRemarks(e.target.value)}
              />
              <input
                aria-label="Rejection reason"
                className="form-control sm:col-span-2"
                placeholder={DESTRUCTIVE_STATUSES.includes(batchStatus) ? 'Rejection reason (shown to applicants)' : 'Rejection reason (optional)'}
                value={batchRejectionReason}
                onChange={(e) => setBatchRejectionReason(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-primary py-2 pl-4 pr-2 text-white shadow-[0_20px_48px_rgba(12,35,64,.3)]">
            <span key={selectedIds.length} className="mr-1 animate-pop-in text-[15px] font-semibold tabular-nums">{selectedIds.length} selected</span>
            <select
              aria-label="New status"
              className="h-[38px] min-w-0 flex-1 rounded-control border border-white/25 bg-white/10 px-2 text-sm text-white [&>option]:text-brand-primary"
              value={batchStatus}
              onChange={(e) => { setBatchStatus(e.target.value); if (DESTRUCTIVE_STATUSES.includes(e.target.value)) setBatchOpen(true) }}
            >
              <option value="">Change status to…</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>{getStatusBadge(status).label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setBatchOpen((v) => !v)} aria-expanded={batchOpen} className="press h-[38px] rounded-control border border-white/25 px-3 text-sm font-semibold">
              {batchOpen ? 'Fewer options' : 'Options'}
            </button>
            <button type="button" onClick={runBatchStatus} disabled={batchLoading || !batchStatus} className="press h-[38px] rounded-control bg-emerald-500 px-3.5 text-sm font-semibold text-brand-dark disabled:opacity-50">
              {batchLoading ? 'Applying…' : 'Apply'}
            </button>
            <button type="button" onClick={() => navigate('/admin/bulk-email')} className="press h-[38px] rounded-control border border-white/25 px-3 text-sm font-semibold">
              Send email
            </button>
            <button type="button" onClick={() => exportToCSV(search, statusFilter, academicYear, new Set(selectedIds))} className="press h-[38px] rounded-control border border-white/25 px-3 text-sm font-semibold">
              Export
            </button>
            <button type="button" onClick={() => { setSelectedIds([]); clearBatchFields(); setBatchOpen(false) }} aria-label="Clear selection" className="press flex h-[38px] w-[38px] items-center justify-center rounded-control bg-white/10">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>
      )}

      <div className={`card ${selectedIds.length ? 'mb-24' : ''}`}>
        <div className="hidden overflow-x-auto md:block">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">
                  <input type="checkbox" className="h-5 w-5 accent-emerald-700" checked={isAllVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select all visible" />
                </th>
                {[
                  { label: 'Applicant', col: 'applicant' },
                  { label: 'School · Course', col: null },
                  { label: 'Barangay', col: null },
                  { label: 'GWA', col: 'gwa' },
                  { label: 'Status', col: 'status' },
                  { label: 'Submitted', col: 'submittedAt' },
                  ...(canDeleteApplicants ? [{ label: 'Delete', col: null }] : []),
                  { label: '', col: null },
                ].map(({ label, col }) => (
                  <th key={label}>
                    {col ? (
                      <button onClick={() => toggleSort(col)} className="flex items-center gap-1 transition-colors hover:text-brand-dark">
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
                    {Array.from({ length: canDeleteApplicants ? 9 : 8 }, (_, j) => j).map(j => (
                      <td key={j}><div className="skeleton h-4" /></td>
                    ))}
                  </tr>
                ))
              ) : data.applications.length === 0 ? (
                <tr>
                  <td colSpan={canDeleteApplicants ? 9 : 8} className="py-12 text-center">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                data.applications.map((app, index) => (
                  <tr
                    key={app.id}
                    onClick={(event) => openRow(event, app.id)}
                    className={`animate-slide-up cursor-pointer ${selectedSet.has(app.id) ? 'bg-emerald-50' : ''} ${drawerId === app.id ? 'bg-brand-bg' : ''} ${flashId === app.id ? 'row-flash' : ''}`}
                    style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-emerald-700"
                        checked={selectedSet.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        aria-label={`Select ${app.applicant?.fullName || app.id}`}
                      />
                    </td>
                    <td>
                      <div>
                        <button type="button" onClick={() => setDrawerId(app.id)} className="text-left font-semibold text-brand-primary hover:text-brand-teal">{app.applicant?.fullName}</button>
                        <p className="tabular-nums text-[13px] text-slate-500" title={app.applicant?.email}>#{app.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </td>
                    <td className="text-slate-700">
                      <p className="max-w-56 truncate leading-snug">{app.school || '—'}</p>
                      <p className="max-w-56 truncate text-[13px] text-slate-500">{app.course || ''}</p>
                    </td>
                    <td className="text-slate-700">{barangayOf(app.address) || '—'}</td>
                    <td>
                      <span className={clsx('tabular-nums font-semibold', app.generalAverage && parseFloat(app.generalAverage) >= threshold ? 'text-emerald-700' : app.generalAverage ? 'text-red-700' : 'text-slate-500')}>
                        {app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td><StatusBadge status={app.status} size="sm" /></td>
                    <td className="text-sm text-slate-500">{formatDate(app.submittedAt)}</td>
                    {canDeleteApplicants && (
                    <td>
                        <button
                          type="button"
                          onClick={() => setPendingApplicantDelete(app)}
                          disabled={deletingApplicantId === app.id}
                          className="btn btn-danger min-h-[34px] px-3 text-sm"
                        >
                          {deletingApplicantId === app.id ? 'Deleting…' : 'Delete'}
                        </button>
                    </td>
                    )}
                    <td className="w-8 pl-0 text-slate-400" aria-hidden="true"><ChevronRightIcon className="h-[18px] w-[18px]" /></td>
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
            <div className="py-10 text-center">{emptyState}</div>
          ) : (
            data.applications.map((app) => (
              <div key={app.id} onClick={(event) => openRow(event, app.id)} className={`flex cursor-pointer items-start gap-3 p-4 ${selectedSet.has(app.id) ? 'bg-emerald-50' : ''}`}>
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-emerald-700"
                  checked={selectedSet.has(app.id)}
                  onChange={() => toggleSelect(app.id)}
                  aria-label={`Select ${app.applicant?.fullName || app.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                    <span className="shrink-0 tabular-nums text-xs font-semibold text-slate-500">#{app.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{app.applicant?.email}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{app.school || '-'}{app.course ? ` • ${app.course}` : ''}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status} size="sm" />
                    {app.generalAverage && (
                      <span className={clsx('tabular-nums text-xs font-bold', parseFloat(app.generalAverage) >= 83 ? 'text-green-600' : 'text-red-500')}>
                        {parseFloat(app.generalAverage).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{formatDate(app.submittedAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button type="button" onClick={() => setDrawerId(app.id)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-teal">
                    Review <ChevronRightIcon className="h-4 w-4" />
                  </button>
                  {canDeleteApplicants && (
                    <button
                      type="button"
                      onClick={() => setPendingApplicantDelete(app)}
                      disabled={deletingApplicantId === app.id}
                      className="btn btn-danger min-h-[34px] px-3 text-sm"
                    >
                      {deletingApplicantId === app.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {data.pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {data.pagination.pages} • {data.pagination.total} results</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn min-h-9 px-3 text-sm">Prev</button>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="btn min-h-9 px-3 text-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {drawerId && (
        <ReviewDrawer
          id={drawerId}
          ids={visibleIds}
          threshold={threshold}
          onClose={() => setDrawerId('')}
          onNavigate={setDrawerId}
          onDecided={handleDecided}
        />
      )}
    </div>
  )
}
