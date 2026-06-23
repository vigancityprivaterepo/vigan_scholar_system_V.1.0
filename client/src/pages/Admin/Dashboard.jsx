import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import { fromNow } from '../../utils/formatDate'
import {
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  ClipboardIcon,
  DocumentIcon,
  UsersIcon,
  ArrowRightIcon,
  SearchIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '../../components/ui/PortalIcons'

const STATUS_COLORS = {
  PENDING_REVIEW: '#6B7280',
  INCOMPLETE: '#F59E0B',
  ELIGIBILITY_SCREENING: '#3B82F6',
  NOT_QUALIFIED: '#EF4444',
  EXAM_INTERVIEW: '#8B5CF6',
  FAILED_EXAM: '#EF4444',
  APPROVED: '#0D9488',
  COR_SUBMITTED: '#0D9488',
  COR_REJECTED: '#F59E0B',
  ACCEPTED: '#10B981',
  REJECTED: '#DC2626',
}

const STATUS_LINKS = {
  PENDING_REVIEW: '/admin/applicants?status=PENDING_REVIEW',
  INCOMPLETE: '/admin/applicants?status=INCOMPLETE',
  ELIGIBILITY_SCREENING: '/admin/applicants?status=ELIGIBILITY_SCREENING',
  NOT_QUALIFIED: '/admin/applicants?status=NOT_QUALIFIED',
  EXAM_INTERVIEW: '/admin/applicants?status=EXAM_INTERVIEW',
  FAILED_EXAM: '/admin/applicants?status=FAILED_EXAM',
  APPROVED: '/admin/applicants?status=APPROVED',
  COR_SUBMITTED: '/admin/applicants?status=COR_SUBMITTED',
  COR_REJECTED: '/admin/applicants?status=COR_REJECTED',
  ACCEPTED: '/admin/applicants?status=ACCEPTED',
  REJECTED: '/admin/applicants?status=REJECTED',
}

const PRIORITY_RANK = {
  Critical: 3,
  High: 2,
  Medium: 1,
  Low: 0,
}

const SORTABLE_QUEUE_FIELDS = ['status', 'count', 'priority']
const SORTABLE_ACTIVITY_FIELDS = ['actor', 'action', 'time']

const formatStatus = (value) => String(value || '').replace(/_/g, ' ')

const getPriority = (status, count) => {
  if (status === 'PENDING_REVIEW' && count > 0) return 'Critical'
  if (['ELIGIBILITY_SCREENING', 'COR_SUBMITTED', 'EXAM_INTERVIEW'].includes(status) && count > 0) return 'High'
  if (['INCOMPLETE', 'APPROVED', 'COR_REJECTED'].includes(status) && count > 0) return 'Medium'
  return 'Low'
}

const getPriorityBadgeClass = (priority) => {
  if (priority === 'Critical') return 'bg-danger-lt'
  if (priority === 'High') return 'bg-warning-lt'
  if (priority === 'Medium') return 'bg-info-lt'
  return 'bg-success-lt'
}

const compareValues = (a, b, direction = 'asc') => {
  if (a === b) return 0
  const result = a > b ? 1 : -1
  return direction === 'asc' ? result : result * -1
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [queueSearch, setQueueSearch] = useState('')
  const [queueSortBy, setQueueSortBy] = useState('count')
  const [queueSortOrder, setQueueSortOrder] = useState('desc')
  const [queuePage, setQueuePage] = useState(1)
  const [activitySearch, setActivitySearch] = useState('')
  const [activitySortBy, setActivitySortBy] = useState('time')
  const [activitySortOrder, setActivitySortOrder] = useState('desc')
  const [activityPage, setActivityPage] = useState(1)

  const barangayChartRef = useRef(null)
  const schoolsChartRef = useRef(null)
  const coursesChartRef = useRef(null)

  const fetchDashboard = () => {
    setLoading(true)
    adminService.getStats()
      .then((response) => {
        setStats(response.data.stats)
        setActivity(response.data.recentActivity || [])
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

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
        `<style>body{margin:0;padding:28px 32px;font-family:DM Sans,sans-serif}` +
        `h2{font-size:15px;font-weight:600;margin:0 0 14px;color:#1e293b}` +
        `img{max-width:100%;display:block;border:1px solid #e2e8f0;border-radius:6px}` +
        `p{font-size:11px;color:#94a3b8;margin:10px 0 0}` +
        `@media print{body{padding:16px}}</style></head>` +
        `<body><h2>${title}</h2><img src="${dataUrl}"/>` +
        `<p>Vigan City Scholarship System | Generated ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` +
        `<script>window.onload=function(){window.print()}<\/script></body></html>`
      )
      win.document.close()
    })
  }

  const chartData = stats
    ? Object.entries(stats.byStatus || {}).map(([status, count]) => ({
        name: formatStatus(status),
        count,
        status,
      }))
    : []

  const urgentStatuses = ['PENDING_REVIEW', 'ELIGIBILITY_SCREENING', 'COR_SUBMITTED']
  const urgentCounts = stats
    ? urgentStatuses
        .map((status) => ({ status, count: stats.byStatus?.[status] || 0 }))
        .filter((item) => item.count > 0)
    : []

  const statCards = [
    { label: 'Total Applications', value: stats?.total || 0, Icon: FileTextIcon, tone: 'bg-blue-50 text-blue-700', link: '/admin/applicants' },
    { label: 'Pending Review', value: stats?.pendingReview || 0, Icon: ClockIcon, tone: 'bg-amber-50 text-amber-700', link: '/admin/applicants?status=PENDING_REVIEW' },
    { label: 'Approved', value: stats?.approved || 0, Icon: CheckCircleIcon, tone: 'bg-teal-50 text-teal-700', link: '/admin/applicants?status=APPROVED' },
    { label: 'Accepted Scholars', value: stats?.accepted || 0, Icon: GraduationCapIcon, tone: 'bg-emerald-50 text-emerald-700', link: '/admin/masterlist' },
  ]

  const quickLinks = [
    { to: '/admin/eligibility', label: 'Eligibility', Icon: ShieldCheckIcon },
    { to: '/admin/exam', label: 'Exam / Interview', Icon: ClipboardIcon },
    { to: '/admin/cor', label: 'COR Review', Icon: DocumentIcon },
    { to: '/admin/scholar-posts', label: 'Scholar Posts', Icon: FileTextIcon },
    { to: '/admin/applicants', label: 'All Applicants', Icon: UsersIcon },
  ]

  const queueRows = Object.entries(stats?.byStatus || {})
    .map(([status, count]) => ({
      status,
      label: formatStatus(status),
      count,
      priority: getPriority(status, count),
      link: STATUS_LINKS[status] || '/admin/applicants',
    }))
    .filter((row) => row.count > 0)

  const filteredQueueRows = queueRows
    .filter((row) => row.label.toLowerCase().includes(queueSearch.trim().toLowerCase()))
    .sort((left, right) => {
      if (queueSortBy === 'priority') {
        return compareValues(PRIORITY_RANK[left.priority], PRIORITY_RANK[right.priority], queueSortOrder)
      }
      return compareValues(left[queueSortBy], right[queueSortBy], queueSortOrder)
    })

  const queuePageSize = 5
  const queuePages = Math.max(1, Math.ceil(filteredQueueRows.length / queuePageSize))
  const visibleQueueRows = filteredQueueRows.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize)

  const filteredActivity = activity
    .map((item) => ({
      ...item,
      actor: item.performedBy?.fullName || 'System',
      applicant: item.application?.applicant?.fullName || 'System event',
      time: new Date(item.createdAt).getTime(),
    }))
    .filter((item) => {
      const haystack = `${item.actor} ${item.action} ${item.applicant}`.toLowerCase()
      return haystack.includes(activitySearch.trim().toLowerCase())
    })
    .sort((left, right) => compareValues(left[activitySortBy], right[activitySortBy], activitySortOrder))

  const activityPageSize = 5
  const activityPages = Math.max(1, Math.ceil(filteredActivity.length / activityPageSize))
  const visibleActivity = filteredActivity.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize)

  const toggleQueueSort = (field) => {
    if (!SORTABLE_QUEUE_FIELDS.includes(field)) return
    if (queueSortBy === field) {
      setQueueSortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setQueueSortBy(field)
      setQueueSortOrder(field === 'status' ? 'asc' : 'desc')
    }
    setQueuePage(1)
  }

  const toggleActivitySort = (field) => {
    if (!SORTABLE_ACTIVITY_FIELDS.includes(field)) return
    if (activitySortBy === field) {
      setActivitySortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setActivitySortBy(field)
      setActivitySortOrder(field === 'time' ? 'desc' : 'asc')
    }
    setActivityPage(1)
  }

  const sortIcon = (field, activeField, order) => {
    if (field !== activeField) return <ChevronUpIcon className="h-3.5 w-3.5 text-slate-300" />
    return order === 'asc'
      ? <ChevronUpIcon className="h-3.5 w-3.5 text-emerald-600" />
      : <ChevronDownIcon className="h-3.5 w-3.5 text-emerald-600" />
  }

  const exportAnalyticsCSV = () => {
    const headers = ['Metric', 'Value']
    const metricRows = statCards.map((item) => [item.label, item.value || 0])
    const statusRows = chartData.map((item) => [`Status: ${item.name}`, item.count])
    const csv = [headers, ...metricRows, ...statusRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dashboard-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportAnalyticsPDF = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    const statusRows = chartData.map((item) => `<tr><td>${item.name}</td><td>${item.count}</td></tr>`).join('')
    win.document.write(`
      <html><head><title>Dashboard Analytics</title></head><body>
      <h2>Dashboard Analytics Report</h2>
      <h3>Core Metrics</h3>
      <ul>${statCards.map((item) => `<li>${item.label}: ${item.value || 0}</li>`).join('')}</ul>
      <h3>Status Funnel</h3>
      <table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${statusRows}</tbody></table>
      <script>window.print();</script></body></html>
    `)
    win.document.close()
  }

  return (
    <div className="flex flex-col gap-6">
      {loadError && (
        <div className="card border-red-200 bg-red-50 text-red-700">
          <div className="card-body flex items-center justify-between gap-4">
            <div>
              <div className="subheader text-red-600">Data unavailable</div>
              <p className="mt-1 text-sm">Could not load dashboard statistics. Check the connection and try again.</p>
            </div>
            <button type="button" onClick={fetchDashboard} className="btn border-red-200 bg-white text-red-700 hover:bg-red-100">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="page-pretitle">Overview</div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Tabler-style command view for scholarship operations, approvals, and daily queues.</p>
          </div>
          <div className="btn-list">
            <button type="button" onClick={exportAnalyticsCSV} className="btn">Export CSV</button>
            <button type="button" onClick={exportAnalyticsPDF} className="btn">Export PDF</button>
            <button type="button" onClick={fetchDashboard} className="btn btn-primary">Refresh data</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, Icon, tone, link }) => (
          <Link key={label} to={link} className="card transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="subheader">KPI</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{loading ? '-' : value}</div>
                </div>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <ArrowRightIcon className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Pipeline</div>
              <div className="card-title">Applications by status</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
            ) : chartData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No status data available yet.</div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(240px,340px)_minmax(0,1fr)] lg:items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value) => [value, 'Count']} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 12 }} />
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={108}
                        paddingAngle={2}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {chartData.map((entry) => (
                    <Link
                      key={entry.status}
                      to={STATUS_LINKS[entry.status] || '/admin/applicants'}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#6B7280' }} />
                        <span className="truncate text-sm font-medium text-slate-700">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{entry.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Daily focus</div>
              <div className="card-title">Urgent actions</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : urgentCounts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                No urgent actions require immediate review.
              </div>
            ) : (
              <div className="space-y-3">
                {urgentCounts.map(({ status, count }) => (
                  <Link key={status} to={STATUS_LINKS[status]} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                    <div>
                      <StatusBadge status={status} size="sm" />
                      <p className="mt-2 text-sm text-slate-500">Needs reviewer attention</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">{count}</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">items</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="subheader mb-3">Quick links</div>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map(({ to, label, Icon }) => (
                  <Link key={to} to={to} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900">
                    <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Conversion</div>
              <div className="card-title">Funnel snapshot</div>
            </div>
          </div>
          <div className="card-body space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Submitted</span><strong>{stats?.funnel?.submitted || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Screened</span><strong>{stats?.funnel?.screened || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Exam stage</span><strong>{stats?.funnel?.exam || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Approved</span><strong>{stats?.funnel?.approved || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Accepted</span><strong>{stats?.funnel?.accepted || 0}</strong></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Risk signals</div>
              <div className="card-title">Top rejection reasons</div>
            </div>
          </div>
          <div className="card-body">
            {!stats?.rejectionReasons?.length ? (
              <p className="text-sm text-slate-500">No rejection reasons available yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.rejectionReasons.map((item) => (
                  <div key={item.reason} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-slate-600">{item.reason}</span>
                    <span className="badge bg-danger-lt">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Appeals</div>
              <div className="card-title">Appeals overview</div>
            </div>
          </div>
          <div className="card-body space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Pending</span><strong>{stats?.appeals?.PENDING || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Approved</span><strong>{stats?.appeals?.APPROVED || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Denied</span><strong>{stats?.appeals?.DENIED || 0}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {[
          { title: 'Top Barangays', ref: barangayChartRef, data: stats?.trends?.barangays || [], fill: '#10b981', empty: 'No barangay data yet.', png: 'top-barangays.png' },
          { title: 'Top Schools', ref: schoolsChartRef, data: stats?.trends?.schools || [], fill: '#3b82f6', empty: 'No school trend data.', png: 'top-schools.png' },
          { title: 'Top Preferred Courses', ref: coursesChartRef, data: stats?.trends?.courses || [], fill: '#8b5cf6', empty: 'No college preference data yet.', png: 'top-preferred-courses.png' },
        ].map((card) => (
          <div key={card.title} className="card">
            <div className="card-header">
              <div>
                <div className="subheader">Trends</div>
                <div className="card-title">{card.title}</div>
              </div>
              {card.data.length > 0 && (
                <div className="btn-list">
                  <button type="button" onClick={() => downloadChartAsPng(card.ref, card.png)} className="btn px-3 py-2 text-xs">PNG</button>
                  <button type="button" onClick={() => downloadChartAsPdf(card.ref, card.title)} className="btn px-3 py-2 text-xs">PDF</button>
                </div>
              )}
            </div>
            <div className="card-body">
              {loading ? (
                <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />
              ) : card.data.length ? (
                <div ref={card.ref}>
                  <ResponsiveContainer width="100%" height={Math.max(card.data.length * 38, 220)}>
                    <BarChart data={card.data} layout="vertical" margin={{ left: 0, right: 12, top: 2, bottom: 2 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={120} />
                      <Tooltip formatter={(value) => [value, 'Applicants']} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 12 }} />
                      <Bar dataKey="count" fill={card.fill} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{card.empty}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Workload</div>
              <div className="card-title">Operations queue</div>
            </div>
            <div className="input-icon w-full max-w-xs">
              <input
                type="search"
                className="form-control"
                placeholder="Filter statuses"
                value={queueSearch}
                onChange={(event) => {
                  setQueueSearch(event.target.value)
                  setQueuePage(1)
                }}
              />
              <span className="input-icon-addon">
                <SearchIcon className="h-4 w-4" />
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" onClick={() => toggleQueueSort('status')} className="inline-flex items-center gap-1">
                      Workflow {sortIcon('status', queueSortBy, queueSortOrder)}
                    </button>
                  </th>
                  <th>
                    <button type="button" onClick={() => toggleQueueSort('count')} className="inline-flex items-center gap-1">
                      Count {sortIcon('count', queueSortBy, queueSortOrder)}
                    </button>
                  </th>
                  <th>
                    <button type="button" onClick={() => toggleQueueSort('priority')} className="inline-flex items-center gap-1">
                      Priority {sortIcon('priority', queueSortBy, queueSortOrder)}
                    </button>
                  </th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td colSpan={4}><div className="h-8 animate-pulse rounded-xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleQueueRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-slate-500">No queue rows match your filter.</td>
                  </tr>
                ) : (
                  visibleQueueRows.map((row) => (
                    <tr key={row.status}>
                      <td>
                        <div className="font-medium text-slate-900">{row.label}</div>
                        <div className="mt-1 text-xs text-slate-500">Status route</div>
                      </td>
                      <td>
                        <span className="text-base font-semibold text-slate-900">{row.count}</span>
                      </td>
                      <td>
                        <span className={`badge ${getPriorityBadgeClass(row.priority)}`}>{row.priority}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link to={row.link} className="btn px-3 py-2 text-xs">Open queue</Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="card-body border-t border-slate-200 py-4">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>Page {queuePage} of {queuePages}</span>
              <div className="btn-list">
                <button type="button" className="btn px-3 py-2 text-xs" disabled={queuePage === 1} onClick={() => setQueuePage((current) => Math.max(1, current - 1))}>Prev</button>
                <button type="button" className="btn px-3 py-2 text-xs" disabled={queuePage >= queuePages} onClick={() => setQueuePage((current) => Math.min(queuePages, current + 1))}>Next</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="subheader">Activity feed</div>
              <div className="card-title">Recent actions</div>
            </div>
            <div className="input-icon w-full max-w-xs">
              <input
                type="search"
                className="form-control"
                placeholder="Search activity"
                value={activitySearch}
                onChange={(event) => {
                  setActivitySearch(event.target.value)
                  setActivityPage(1)
                }}
              />
              <span className="input-icon-addon">
                <SearchIcon className="h-4 w-4" />
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" onClick={() => toggleActivitySort('actor')} className="inline-flex items-center gap-1">
                      Actor {sortIcon('actor', activitySortBy, activitySortOrder)}
                    </button>
                  </th>
                  <th>
                    <button type="button" onClick={() => toggleActivitySort('action')} className="inline-flex items-center gap-1">
                      Action {sortIcon('action', activitySortBy, activitySortOrder)}
                    </button>
                  </th>
                  <th>
                    <button type="button" onClick={() => toggleActivitySort('time')} className="inline-flex items-center gap-1">
                      Time {sortIcon('time', activitySortBy, activitySortOrder)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td colSpan={3}><div className="h-8 animate-pulse rounded-xl bg-slate-100" /></td>
                    </tr>
                  ))
                ) : visibleActivity.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-sm text-slate-500">No recent activity matches your filter.</td>
                  </tr>
                ) : (
                  visibleActivity.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="avatar h-9 w-9 bg-emerald-50 text-emerald-700">{log.actor[0] || 'S'}</span>
                          <div>
                            <div className="font-medium text-slate-900">{log.actor}</div>
                            <div className="text-xs text-slate-500">{log.applicant}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-700">{log.action}</td>
                      <td className="text-slate-500">{fromNow(log.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="card-body border-t border-slate-200 py-4">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>Page {activityPage} of {activityPages}</span>
              <div className="btn-list">
                <button type="button" className="btn px-3 py-2 text-xs" disabled={activityPage === 1} onClick={() => setActivityPage((current) => Math.max(1, current - 1))}>Prev</button>
                <button type="button" className="btn px-3 py-2 text-xs" disabled={activityPage >= activityPages} onClick={() => setActivityPage((current) => Math.min(activityPages, current + 1))}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
