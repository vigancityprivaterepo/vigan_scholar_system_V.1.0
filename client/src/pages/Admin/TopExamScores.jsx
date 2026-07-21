import { useEffect, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { SearchIcon, ChartIcon } from '../../components/ui/PortalIcons'
import { formatDate } from '../../utils/formatDate'

const getAcademicYearOptions = () => {
  const now = new Date()
  const base = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 8 }, (_, i) => {
    const s = base - i
    return `${s}-${s + 1}`
  })
}

const STATUS_LABELS = {
  APPROVED: { label: 'Approved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  ACCEPTED: { label: 'Accepted / Scholar', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  COR_SUBMITTED: { label: 'COR Submitted', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  COR_REJECTED: { label: 'COR Rejected', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  FAILED_EXAM: { label: 'Failed Exam', color: 'text-red-700 bg-red-50 border-red-200' },
  EXAM_INTERVIEW: { label: 'Pending Result', color: 'text-slate-600 bg-slate-50 border-slate-200' },
}

const toDisplayName = (app) => {
  if (app.lastName) {
    const mi = app.middleName ? ` ${app.middleName.charAt(0)}.` : ''
    return `${app.lastName}, ${app.firstName}${mi}`
  }
  return app.applicant?.fullName || ''
}

const ALL_STATUSES = 'APPROVED,ACCEPTED,COR_SUBMITTED,COR_REJECTED,FAILED_EXAM,EXAM_INTERVIEW'

// Compute dense ranks based on descending numeric score
const computeRanks = (items, getScore) => {
  const ranks = []
  let rank = 1
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && getScore(items[i]) !== getScore(items[i - 1])) {
      rank = i + 1
    }
    ranks.push(rank)
  }
  return ranks
}

export default function TopExamScores() {
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [apps, setApps] = useState([])
  const pageRanks = useMemo(() => computeRanks(apps, x => x.examScore ? parseFloat(x.examScore) : null), [apps])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [academicYear, setAcademicYear] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = {
      status: ALL_STATUSES,
      hasExamScore: 'true',
      limit: 50,
      page,
      sortBy: 'examScore',
      sortOrder: 'desc',
    }
    if (search.trim()) params.search = search.trim()
    if (academicYear) params.academicYear = academicYear
    adminService.listApplications(params)
      .then(r => {
        setApps(r.data.applications)
        setPagination(r.data.pagination || { total: 0, pages: 1 })
      })
      .catch(() => toast.error('Failed to load exam scores'))
      .finally(() => setLoading(false))
  }, [page, search, academicYear])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchAll = async () => {
    let all = []
    let p = 1
    let pages = 1
    while (p <= pages) {
      const params = {
        status: ALL_STATUSES,
        hasExamScore: 'true',
        limit: 200,
        page: p,
        sortBy: 'examScore',
        sortOrder: 'desc',
      }
      if (academicYear) params.academicYear = academicYear
      if (search.trim()) params.search = search.trim()
      const r = await adminService.listApplications(params)
      all = [...all, ...r.data.applications]
      pages = r.data.pagination?.pages || 1
      p++
    }
    return all
  }

  const exportCSV = async () => {
    try {
      toast.loading('Preparing CSV…', { id: 'csv' })
      const all = await fetchAll()
      const headers = [
        'Rank', 'Last Name', 'First Name', 'Middle Name', 'Email', 'Contact',
        'SHS Attended', 'Gen. Average (%)', 'General Score', 'Status', 'Academic Year', 'Date Updated',
      ]
      const ranks = computeRanks(all, x => x.examScore ? parseFloat(x.examScore) : null)
      const rows = all.map((a, i) => {
        const score = a.examScore ? parseFloat(a.examScore) : null
        return [
          ranks[i],
          a.lastName || '',
          a.firstName || '',
          a.middleName || '',
          a.applicant?.email || '',
          a.contact || '',
          a.school || '',
          a.generalAverage ? parseFloat(a.generalAverage).toFixed(2) : '',
          score !== null ? score.toFixed(2) : '',
          STATUS_LABELS[a.status]?.label || a.status || '',
          a.academicYear || '',
          a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-PH') : '',
        ]
      })
      const csv = [headers, ...rows].map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `top-exam-scores-${academicYear || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${all.length} records`, { id: 'csv' })
    } catch {
      toast.error('CSV export failed', { id: 'csv' })
    }
  }

  const exportPrint = async () => {
    try {
      toast.loading('Preparing report…', { id: 'print' })
      const all = await fetchAll()
      toast.dismiss('print')
      const rows = all.map((a, i) => {
        const score = a.examScore ? parseFloat(a.examScore) : null
        const gwa = a.generalAverage ? parseFloat(a.generalAverage).toFixed(2) + '%' : '-'
        const statusLabel = STATUS_LABELS[a.status]?.label || a.status || '-'
        return `
        <tr>
          <td style="text-align:center;font-weight:bold">${i + 1}</td>
          <td>${toDisplayName(a)}</td>
          <td>${a.school || '-'}</td>
          <td style="text-align:center">${gwa}</td>
          <td style="text-align:center;font-weight:bold;color:${score !== null ? '#064e3b' : '#888'}">${score !== null ? score.toFixed(2) : '-'}</td>
          <td style="text-align:center">${statusLabel}</td>
          <td>${a.academicYear || '-'}</td>
        </tr>`
      }).join('')
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Top Exam Scores — AY ${academicYear || 'All'}</title>
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
  <h1>General Average / Total Score — Scholarship Applicants</h1>
  <p>Academic Year: ${academicYear || 'All'} &nbsp;|&nbsp; Total Records: ${all.length}</p>
</div>
<table>
  <thead>
    <tr>
      <th style="text-align:center">Rank</th>
      <th>Name</th>
      <th>SHS Attended</th>
      <th style="text-align:center">GWA</th>
      <th style="text-align:center">General Score</th>
      <th style="text-align:center">Status</th>
      <th>AY</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">No records</td></tr>'}</tbody>
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
          <p className="portal-kicker">Assessment Results</p>
          <h1 className="portal-page-title mt-2">General Average / Total Score</h1>
          <p className="portal-page-subtitle">{pagination.total} applicant{pagination.total !== 1 ? 's' : ''} with recorded scores</p>
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
        </div>
      </div>

      {/* Table */}
      <div className="portal-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SHS Attended</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">GWA</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  General Score <span className="text-brand-primary">&#8595;</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">AY</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(8)].map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                      <ChartIcon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">No scores recorded yet</p>
                    {search && <p className="mt-1 text-xs text-slate-400">Try clearing the search</p>}
                  </td>
                </tr>
              ) : (
                apps.map((app, idx) => {
                  const score = app.examScore ? parseFloat(app.examScore) : null
                  const pageOffset = (page - 1) * 50
                  const denseRank = pageOffset + pageRanks[idx]
                  const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: 'text-slate-600 bg-slate-50 border-slate-200' }
                  return (
                    <tr key={app.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        {denseRank <= 3 ? (
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${denseRank === 1 ? 'bg-yellow-400 text-yellow-900' : denseRank === 2 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'}`}>
                            {denseRank}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{denseRank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-primary">{toDisplayName(app)}</p>
                        <p className="text-xs text-slate-500">{app.applicant?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{app.school || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono text-sm font-bold ${app.generalAverage && parseFloat(app.generalAverage) >= 83 ? 'text-green-600' : app.generalAverage ? 'text-red-500' : 'text-slate-400'}`}>
                          {app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono text-sm font-bold ${score !== null ? 'text-brand-primary' : 'text-slate-400'}`}>
                          {score !== null ? score.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{app.academicYear || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(app.updatedAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Page {page} of {pagination.pages} • {pagination.total} records</p>
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
