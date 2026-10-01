import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminService } from '../../services/adminService'
import { fromNow } from '../../utils/formatDate'
import { getAcademicYearOptions, getCurrentAcademicYear } from '../../utils/academicYear'
import { escapeHtml } from '../../utils/escapeHtml'

// Work a staff member can act on, in the order an application moves through the office.
const OPEN_WORK = [
  { key: 'pendingReview', label: 'Pending review', hint: 'New applications to check for completeness', to: '/admin/applicants?status=PENDING_REVIEW' },
  { key: 'eligibilityScreening', label: 'Eligibility screening', hint: 'Check grades against the GWA threshold', to: '/admin/eligibility' },
  { key: 'examInterview', label: 'Exam / interview', hint: 'Schedule and record scores', to: '/admin/exam' },
  { key: 'corSubmitted', label: 'COR to verify', hint: 'Certificates of registration awaiting review', to: '/admin/cor' },
  { key: 'renewals', label: 'Renewals', hint: 'Scholars requesting renewal', to: '/admin/renewals' },
  { key: 'appeals', label: 'Appeals', hint: 'Requests for reconsideration', to: '/admin/appeals' },
]

const PIPELINE_ACTIVE = [
  ['PENDING_REVIEW', 'Pending review'],
  ['INCOMPLETE', 'Incomplete'],
  ['ELIGIBILITY_SCREENING', 'Eligibility screening'],
  ['EXAM_INTERVIEW', 'Exam / interview'],
  ['APPROVED', 'Approved'],
  ['COR_SUBMITTED', 'COR submitted'],
  ['COR_REJECTED', 'COR returned'],
  ['ACCEPTED', 'Accepted'],
]

const PIPELINE_ENDED = [
  ['NOT_QUALIFIED', 'Not qualified'],
  ['FAILED_EXAM', 'Failed exam'],
  ['REJECTED', 'Rejected'],
]

const ALL_YEARS = ''
const CHART_FILL = '#059669'

export default function AdminDashboard() {
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), [])
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
  const [stats, setStats] = useState(null)
  const [allYearsStats, setAllYearsStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const barangayChartRef = useRef(null)
  const schoolsChartRef = useRef(null)
  const coursesChartRef = useRef(null)

  const fetchDashboard = () => {
    setLoading(true)
    // Open work is counted across all years (same request the sidebar badges use);
    // the rest of the page follows the selected academic year.
    const allYears = adminService.getStats()
    const selectedYear = academicYear ? adminService.getStats({ academicYear }) : allYears
    Promise.all([allYears, selectedYear])
      .then(([allResponse, yearResponse]) => {
        setAllYearsStats(allResponse.data.stats)
        setStats(yearResponse.data.stats)
        setActivity(yearResponse.data.recentActivity || [])
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboard()
  }, [academicYear])

  const yearLabel = academicYear ? `AY ${academicYear}` : 'All academic years'
  const openWorkCounts = allYearsStats ? {
    pendingReview: allYearsStats.byStatus?.PENDING_REVIEW || 0,
    eligibilityScreening: allYearsStats.byStatus?.ELIGIBILITY_SCREENING || 0,
    examInterview: allYearsStats.byStatus?.EXAM_INTERVIEW || 0,
    corSubmitted: allYearsStats.byStatus?.COR_SUBMITTED || 0,
    renewals: allYearsStats.pendingRenewals || 0,
    appeals: allYearsStats.appeals?.PENDING || 0,
  } : {}
  const openWork = OPEN_WORK.map((item) => ({ ...item, count: openWorkCounts[item.key] || 0 }))
  const waiting = openWork.filter((item) => item.count > 0)

  const byStatus = stats?.byStatus || {}
  const toRows = (entries) => entries.map(([status, label]) => ({ status, label, count: byStatus[status] || 0 }))
  const activeRows = toRows(PIPELINE_ACTIVE)
  const endedRows = toRows(PIPELINE_ENDED).filter((row) => row.count > 0)
  const pipelineMax = Math.max(1, ...activeRows.map((row) => row.count), ...endedRows.map((row) => row.count))

  const breakdowns = [
    { title: 'Applicants by barangay', ref: barangayChartRef, data: stats?.trends?.barangays || [], empty: 'No applicant addresses matched a Vigan barangay.', png: 'applicants-by-barangay.png' },
    { title: 'Applicants by school', ref: schoolsChartRef, data: stats?.trends?.schools || [], empty: 'No school recorded on applications.', png: 'applicants-by-school.png' },
    { title: 'First-choice courses', ref: coursesChartRef, data: stats?.trends?.courses || [], empty: 'No college preferences recorded on applications.', png: 'first-choice-courses.png' },
  ]

  const svgToCanvas = (ref, callback) => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const { width, height } = svg.getBoundingClientRect()
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = width * scale
      canvas.height = height * scale
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.scale(scale, scale)
      context.drawImage(image, 0, 0)
      URL.revokeObjectURL(url)
      callback(canvas.toDataURL('image/png'))
    }

    image.src = url
  }

  const downloadChartAsPng = (ref, filename) => {
    svgToCanvas(ref, (dataUrl) => {
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = filename
      anchor.click()
    })
  }

  const downloadChartAsPdf = (ref, title) => {
    svgToCanvas(ref, (dataUrl) => {
      const win = window.open('', '_blank', 'width=860,height=640')
      if (!win) return

      win.document.write(
        `<!DOCTYPE html><html><head><title>${title}</title>` +
        `<style>body{margin:0;padding:28px 32px;font-family:Arial,sans-serif}` +
        `h2{font-size:15px;font-weight:600;margin:0 0 14px;color:#1e293b}` +
        `img{max-width:100%;display:block;border:1px solid #e2e8f0;border-radius:6px}` +
        `p{font-size:11px;color:#64748b;margin:10px 0 0}` +
        `@media print{body{padding:16px}}</style></head>` +
        `<body><h2>${title} (${yearLabel})</h2><img src="${dataUrl}"/>` +
        `<p>Vigan City Scholarship System | Generated ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` +
        `<script>window.onload=function(){window.print()}<\/script></body></html>`
      )
      win.document.close()
    })
  }

  const exportRows = () => [
    ...openWork.map((item) => ['Open work (all years)', item.label, item.count]),
    [yearLabel, 'Total applications', stats?.total || 0],
    ...[...activeRows, ...toRows(PIPELINE_ENDED)].map((row) => [yearLabel, row.label, row.count]),
  ]

  const exportAnalyticsCSV = () => {
    const csv = [['Scope', 'Metric', 'Value'], ...exportRows()]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dashboard-${academicYear || 'all-years'}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportAnalyticsPDF = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    const rows = exportRows()
      .map(([scope, metric, value]) => `<tr><td>${escapeHtml(scope)}</td><td>${escapeHtml(metric)}</td><td>${value}</td></tr>`)
      .join('')
    win.document.write(`
      <!DOCTYPE html><html><head><title>Scholarship Dashboard Report</title>
      <style>
        body{font-family:Arial,sans-serif;color:#0c2340;padding:28px}
        h2{margin:0 0 4px}p{margin:0 0 16px;color:#64748b;font-size:12px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}
        th{background:#f0fdf4}
      </style></head><body>
      <h2>Scholarship Dashboard Report</h2>
      <p>${yearLabel} · Generated ${new Date().toLocaleString('en-PH')}</p>
      <table><thead><tr><th>Scope</th><th>Metric</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print()}<\/script></body></html>
    `)
    win.document.close()
  }

  const showData = !loading && stats

  return (
    <div className="flex flex-col gap-6">
      {loadError && (
        <div className="card border-red-200 bg-red-50 text-red-700">
          <div className="card-body flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Dashboard data could not be loaded</p>
              <p className="mt-1 text-sm">The figures below are not current. Check the connection and try again.</p>
            </div>
            <button type="button" onClick={fetchDashboard} className="btn border-red-200 bg-white text-red-700 hover:bg-red-100">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="page-header mb-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Work waiting on the office, and where this year's applications stand.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="dashboard-ay">Academic year</label>
            <select
              id="dashboard-ay"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              className="form-control w-auto py-2"
            >
              {academicYearOptions.map((year) => <option key={year} value={year}>AY {year}</option>)}
              <option value={ALL_YEARS}>All academic years</option>
            </select>
            <button type="button" onClick={exportAnalyticsCSV} disabled={!stats} className="btn py-2">Export CSV</button>
            <button type="button" onClick={exportAnalyticsPDF} disabled={!stats} className="btn py-2">Export PDF</button>
            <button type="button" onClick={fetchDashboard} disabled={loading} className="btn btn-primary py-2">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* NEEDS ACTION — the reason staff open this page, so it leads */}
      <section className="card" aria-labelledby="needs-action-title">
        <div className="card-header">
          <div>
            <h2 id="needs-action-title" className="card-title">Needs action</h2>
            <p className="mt-0.5 text-xs text-slate-500">Across all academic years</p>
          </div>
        </div>
        {loading && !stats ? (
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
            {OPEN_WORK.slice(0, 3).map((item) => <div key={item.key} className="h-20 animate-pulse bg-white" />)}
          </div>
        ) : !stats ? (
          <p className="card-body text-sm text-slate-500">Open work is unavailable until the dashboard loads.</p>
        ) : waiting.length === 0 ? (
          <p className="card-body text-sm text-slate-600">
            Nothing is waiting. New applications, renewals and appeals will appear here as they come in.
          </p>
        ) : (
          <ul className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
            {waiting.map((item) => (
              <li key={item.key} className="bg-white">
                <Link to={item.to} className="flex h-full items-center gap-4 px-5 py-4 transition-colors hover:bg-emerald-50/60 focus:outline-none focus-visible:bg-emerald-50">
                  <span className="min-w-[3ch] text-3xl font-bold tabular-nums text-brand-primary">{item.count}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">{item.label}</span>
                    <span className="block text-sm text-slate-500">{item.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* PIPELINE */}
        <section className="card" aria-labelledby="pipeline-title">
          <div className="card-header">
            <div>
              <h2 id="pipeline-title" className="card-title">Where applications are now</h2>
              <p className="mt-0.5 text-xs text-slate-500">{yearLabel}</p>
            </div>
            {/* The total frames every bar below, so it sits at the top of this section */}
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-brand-primary">
                {showData ? stats.total.toLocaleString('en-PH') : '—'}
              </p>
              <p className="text-xs text-slate-500">total applications</p>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {PIPELINE_ACTIVE.map(([status]) => <div key={status} className="h-6 animate-pulse rounded bg-slate-100" />)}
              </div>
            ) : !stats ? (
              <p className="text-sm text-slate-500">Status counts are unavailable until the dashboard loads.</p>
            ) : stats.total === 0 ? (
              <p className="text-sm text-slate-600">No applications for {yearLabel} yet. They will appear here once applicants submit.</p>
            ) : (
              <>
                <PipelineList rows={activeRows} max={pipelineMax} barClass="bg-emerald-600" />
                {endedRows.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Did not continue</h3>
                    <PipelineList rows={endedRows} max={pipelineMax} barClass="bg-slate-400" />
                  </>
                )}
              </>
            )}
          </div>
        </section>

        {/* REJECTION REASONS */}
        <section className="card" aria-labelledby="reasons-title">
          <div className="card-header">
            <div>
              <h2 id="reasons-title" className="card-title">Why applications were turned down</h2>
              <p className="mt-0.5 text-xs text-slate-500">{yearLabel} · most common reasons recorded by reviewers</p>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="h-40 animate-pulse rounded bg-slate-100" />
            ) : !stats?.rejectionReasons?.length ? (
              <p className="text-sm text-slate-500">No rejection reasons recorded for {yearLabel}.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.rejectionReasons.map((item) => (
                  <li key={item.reason} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm text-slate-700">{item.reason}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* BREAKDOWNS */}
      <div className="grid gap-6 xl:grid-cols-3">
        {breakdowns.map((card) => (
          <section key={card.title} className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">{card.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{yearLabel} · top 8</p>
              </div>
              {showData && card.data.length > 0 && (
                <div className="btn-list">
                  <button type="button" onClick={() => downloadChartAsPng(card.ref, card.png)} className="btn px-3 py-1.5 text-xs">PNG</button>
                  <button type="button" onClick={() => downloadChartAsPdf(card.ref, card.title)} className="btn px-3 py-1.5 text-xs">PDF</button>
                </div>
              )}
            </div>
            <div className="card-body">
              {loading ? (
                <div className="h-60 animate-pulse rounded bg-slate-100" />
              ) : card.data.length ? (
                <div ref={card.ref}>
                  <ResponsiveContainer width="100%" height={Math.max(card.data.length * 38, 220)}>
                    <BarChart data={card.data} layout="vertical" margin={{ left: 0, right: 12, top: 2, bottom: 2 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip formatter={(value) => [value, 'Applicants']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" fill={CHART_FILL} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{stats ? card.empty : 'Unavailable until the dashboard loads.'}</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* RECENT ACTIVITY */}
      <section className="card" aria-labelledby="activity-title">
        <div className="card-header">
          <div>
            <h2 id="activity-title" className="card-title">Recent activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Latest 10 actions, all academic years</p>
          </div>
        </div>
        {loading && !activity.length ? (
          <div className="card-body space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-6 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : activity.length === 0 ? (
          <p className="card-body text-sm text-slate-500">
            {stats ? 'No actions recorded yet. Reviews, status changes and uploads will be logged here.' : 'Activity is unavailable until the dashboard loads.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((log) => {
              const actor = log.performedBy?.fullName || 'System'
              const applicant = log.application?.applicant?.fullName
              return (
                <li key={log.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <p className="min-w-0 text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{actor}</span>
                    {' · '}{log.action}
                    {applicant && log.applicationId && (
                      <>
                        {' · '}
                        <Link to={`/admin/applicants/${log.applicationId}`} className="font-medium text-emerald-700 underline-offset-2 hover:underline">
                          {applicant}
                        </Link>
                      </>
                    )}
                  </p>
                  <time dateTime={log.createdAt} className="shrink-0 text-xs text-slate-500">{fromNow(log.createdAt)}</time>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function PipelineList({ rows, max, barClass }) {
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.status}>
          <Link
            to={`/admin/applicants?status=${row.status}`}
            className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100"
          >
            <span className={`truncate text-sm ${row.count ? 'text-slate-700' : 'text-slate-400'}`}>{row.label}</span>
            <span className="h-2.5 rounded-sm bg-slate-100" aria-hidden="true">
              <span className={`block h-full rounded-sm ${barClass}`} style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className={`text-right text-sm font-semibold tabular-nums ${row.count ? 'text-slate-900' : 'text-slate-400'}`}>{row.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
