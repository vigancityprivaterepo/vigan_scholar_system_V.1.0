import { useEffect, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { SearchIcon, GraduationCapIcon } from '../../components/ui/PortalIcons'
import { formatDate } from '../../utils/formatDate'

const getAcademicYearOptions = () => {
  const now = new Date()
  const base = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 8 }, (_, i) => {
    const s = base - i
    return `${s}-${s + 1}`
  })
}

const toFullName = (app) => {
  if (app.lastName) {
    return [app.lastName, app.firstName, app.middleName].filter(Boolean).join(', ').replace(', ', ' ').replace(',', ' ')
  }
  return app.applicant?.fullName || ''
}

const toDisplayName = (app) => {
  if (app.lastName) {
    const mi = app.middleName ? ` ${app.middleName.charAt(0)}.` : ''
    return `${app.lastName}, ${app.firstName}${mi}`
  }
  return app.applicant?.fullName || ''
}

const firstPref = (app) => {
  const p = (app.collegePreferences || [])[0]
  if (!p?.name) return '-'
  return p.course ? `${p.name} — ${p.course}` : p.name
}

export default function Masterlist() {
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [apps, setApps] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [yearLevel, setYearLevel] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { status: 'ACCEPTED', limit: 50, page, sortBy: 'submittedAt', sortOrder: 'asc' }
    if (search.trim()) params.search = search.trim()
    if (academicYear) params.academicYear = academicYear
    if (yearLevel) params.yearLevel = yearLevel
    adminService.listApplications(params)
      .then(r => {
        setApps(r.data.applications)
        setPagination(r.data.pagination || { total: 0, pages: 1 })
      })
      .catch(() => toast.error('Failed to load masterlist'))
      .finally(() => setLoading(false))
  }, [page, search, academicYear, yearLevel])

  useEffect(() => { fetchData() }, [fetchData])

  const exportCSV = async () => {
    try {
      toast.loading('Preparing CSV…', { id: 'csv' })
      let all = []
      let p = 1
      let pages = 1
      while (p <= pages) {
        const params = { status: 'ACCEPTED', limit: 200, page: p, sortBy: 'submittedAt', sortOrder: 'asc' }
        if (academicYear) params.academicYear = academicYear
        if (search.trim()) params.search = search.trim()
        if (yearLevel) params.yearLevel = yearLevel
        const r = await adminService.listApplications(params)
        all = [...all, ...r.data.applications]
        pages = r.data.pagination?.pages || 1
        p++
      }
      const headers = [
        '#', 'Last Name', 'First Name', 'Middle Name', 'Email', 'Contact',
        'Address', 'SHS Attended', 'Gen. Average (%)', 'Year Level',
        '1st College Preference', 'Academic Year', 'Date Accepted',
      ]
      const rows = all.map((a, i) => [
        i + 1,
        a.lastName || '',
        a.firstName || '',
        a.middleName || '',
        a.applicant?.email || '',
        a.contact || '',
        a.address || '',
        a.school || '',
        a.generalAverage ? parseFloat(a.generalAverage).toFixed(2) : '',
        a.yearLevel || '',
        firstPref(a),
        a.academicYear || '',
        a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-PH') : '',
      ])
      const csv = [headers, ...rows].map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ylSlug = yearLevel ? `-${yearLevel.replace(/\s+/g, '-').toLowerCase()}` : ''
      a.download = `masterlist-scholars-${academicYear || 'all'}${ylSlug}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${all.length} scholars`, { id: 'csv' })
    } catch {
      toast.error('CSV export failed', { id: 'csv' })
    }
  }

  const exportPrint = async () => {
    try {
      toast.loading('Preparing report…', { id: 'print' })
      let all = []
      let p = 1
      let pages = 1
      while (p <= pages) {
        const params = { status: 'ACCEPTED', limit: 200, page: p, sortBy: 'submittedAt', sortOrder: 'asc' }
        if (academicYear) params.academicYear = academicYear
        if (search.trim()) params.search = search.trim()
        if (yearLevel) params.yearLevel = yearLevel
        const r = await adminService.listApplications(params)
        all = [...all, ...r.data.applications]
        pages = r.data.pagination?.pages || 1
        p++
      }
      toast.dismiss('print')
      const rows = all.map((a, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${toDisplayName(a)}</td>
          <td>${a.address || '-'}</td>
          <td>${a.contact || '-'}</td>
          <td>${a.school || '-'}</td>
          <td style="text-align:center">${a.generalAverage ? parseFloat(a.generalAverage).toFixed(2) + '%' : '-'}</td>
          <td style="text-align:center">${a.yearLevel || '-'}</td>
          <td>${firstPref(a)}</td>
          <td>${a.applicant?.email || '-'}</td>
        </tr>`).join('')
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Masterlist of Accepted Scholars — AY ${academicYear || 'All'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; padding: 20px 28px; }
  .header { text-align: center; margin-bottom: 16px; }
  .header h1 { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
  .header p { font-size: 9pt; color: #444; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 10px; }
  thead { background: #064e3b; color: #fff; }
  th { padding: 5px 6px; text-align: left; font-size: 8pt; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: #f8fafb; }
  .footer { margin-top: 18px; font-size: 7.5pt; color: #777; text-align: right; }
  @media print { body { padding: 12px 16px; } }
</style>
</head>
<body>
<div class="header">
  <h1>City Government of Vigan</h1>
  <h1>Masterlist of Accepted Scholars</h1>
  <p>Academic Year: ${academicYear || 'All'} &nbsp;|&nbsp; Year Level: ${yearLevel || 'All'} &nbsp;|&nbsp; Total Scholars: ${all.length}</p>
</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Name</th>
      <th>Address</th>
      <th>Contact</th>
      <th>SHS Attended</th>
      <th>GWA</th>
      <th>Year Level</th>
      <th>College Preference</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888">No records</td></tr>'}</tbody>
</table>
<div class="footer">Printed: ${new Date().toLocaleString('en-PH')} &nbsp;|&nbsp; Vigan City Scholarship Management System</div>
</body>
</html>`
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 400)
    } catch {
      toast.error('Print failed', { id: 'print' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">Masterlist of Accepted Scholars</h1>
          <p className="portal-page-subtitle">{pagination.total} accepted scholar{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="portal-button-secondary whitespace-nowrap !px-4 !py-2 text-sm">
            Export CSV
          </button>
          <button onClick={exportPrint} className="portal-button-primary whitespace-nowrap !px-4 !py-2 text-sm">
            Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="portal-surface p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="portal-input pl-10"
              placeholder="Search by name, email, or Ref. ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="portal-input md:w-48"
            value={academicYear}
            onChange={e => { setAcademicYear(e.target.value); setPage(1) }}
          >
            <option value="">All Academic Years</option>
            {academicYearOptions.map(y => <option key={y} value={y}>AY {y}</option>)}
          </select>
          <select
            className="portal-input md:w-44"
            value={yearLevel}
            onChange={e => { setYearLevel(e.target.value); setPage(1) }}
          >
            <option value="">All Year Levels</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="portal-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SHS Attended</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">GWA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Year Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">1st College Preference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">AY</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date Accepted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(9)].map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                      <GraduationCapIcon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">No accepted scholars found</p>
                    {search && <p className="mt-1 text-xs text-slate-400">Try clearing the search</p>}
                  </td>
                </tr>
              ) : (
                apps.map((app, idx) => (
                  <tr key={app.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-400">{(page - 1) * 50 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-primary">{toDisplayName(app)}</p>
                      <p className="text-xs text-slate-500">{app.applicant?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{app.contact || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{app.school || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm font-bold ${app.generalAverage && parseFloat(app.generalAverage) >= 83 ? 'text-green-600' : app.generalAverage ? 'text-red-500' : 'text-slate-400'}`}>
                        {app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{app.yearLevel || '-'}</td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="truncate text-xs text-slate-700">{firstPref(app)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{app.academicYear || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(app.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Page {page} of {pagination.pages} • {pagination.total} scholars</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
