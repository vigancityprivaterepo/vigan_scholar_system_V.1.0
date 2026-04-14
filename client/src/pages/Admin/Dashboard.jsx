import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    adminService.getStats()
      .then((r) => {
        setStats(r.data.stats)
        setActivity(r.data.recentActivity || [])
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const chartData = stats ? Object.entries(stats.byStatus || {}).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    count,
    status,
  })) : []

  const urgentStatuses = ['PENDING_REVIEW', 'ELIGIBILITY_SCREENING', 'COR_SUBMITTED']
  const urgentCounts = stats ? urgentStatuses.map((s) => ({ status: s, count: stats.byStatus?.[s] || 0 })).filter((x) => x.count > 0) : []
  const statCards = [
    { label: 'Total Applications', value: stats?.total || 0, Icon: FileTextIcon, accent: 'border-blue-100 bg-blue-50 text-blue-700' },
    { label: 'Pending Review', value: stats?.pendingReview || 0, Icon: ClockIcon, accent: 'border-amber-100 bg-amber-50 text-amber-700', link: '/admin/applicants?status=PENDING_REVIEW' },
    { label: 'Approved', value: stats?.approved || 0, Icon: CheckCircleIcon, accent: 'border-teal-100 bg-teal-50 text-teal-700' },
    { label: 'Accepted Scholars', value: stats?.accepted || 0, Icon: GraduationCapIcon, accent: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  ]
  const quickLinks = [
    { to: '/admin/eligibility', label: 'Eligibility', Icon: ShieldCheckIcon },
    { to: '/admin/exam', label: 'Exam / Interview', Icon: ClipboardIcon },
    { to: '/admin/cor', label: 'COR Review', Icon: DocumentIcon },
    { to: '/admin/scholar-posts', label: 'Scholar Posts', Icon: FileTextIcon },
    { to: '/admin/applicants', label: 'All Applicants', Icon: UsersIcon },
  ]

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
        <div className="flex items-center gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0"><path d="M12 4.5 20 19H4l8-14.5Z"/><path d="M12 9.5v4"/><path d="M12 16h.01"/></svg>
          Could not load statistics. Check your connection and{' '}
          <button onClick={() => { setLoading(true); setLoadError(false); adminService.getStats().then(r => { setStats(r.data.stats); setActivity(r.data.recentActivity || []); setLoadError(false) }).catch(() => setLoadError(true)).finally(() => setLoading(false)) }} className="underline font-medium">
            try again
          </button>.
        </div>
      )}
      <div>
        <p className="portal-kicker">Administrative Overview</p>
        <h1 className="portal-page-title mt-2">Admin Dashboard</h1>
        <p className="portal-page-subtitle">Scholarship management summary and current workload.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={exportAnalyticsCSV} className="portal-button-secondary text-sm">Export Analytics CSV</button>
          <button onClick={exportAnalyticsPDF} className="portal-button-secondary text-sm">Export Analytics PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, Icon, accent, link }) => (
          <div key={label} className={`portal-surface p-4 ${link ? 'transition-shadow hover:shadow-md' : ''}`}>
            {link ? (
              <Link to={link} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md border sm:h-12 sm:w-12 ${accent}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-brand-primary sm:mt-5 sm:text-3xl">{loading ? '-' : value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.14em]">{label}</p>
              </Link>
            ) : (
              <>
                <div className={`flex h-9 w-9 items-center justify-center rounded-md border sm:h-12 sm:w-12 ${accent}`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-brand-primary sm:mt-5 sm:text-3xl">{loading ? '-' : value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.14em]">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="portal-surface overflow-hidden p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-brand-primary">Applications by Status</h2>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 80)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 2, bottom: 2 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={100} />
                <Tooltip formatter={(val) => [val, 'Count']} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="portal-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-brand-primary">Urgent Actions</h2>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
            </div>
          ) : urgentCounts.length === 0 ? (
            <div className="portal-panel flex items-center gap-3 p-4 text-slate-600">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              <p className="text-sm">No urgent actions require immediate review.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {urgentCounts.map(({ status, count }) => (
                <Link key={status} to={`/admin/applicants?status=${status}`} className="portal-panel flex items-center justify-between p-3 transition-colors hover:bg-slate-100">
                  <StatusBadge status={status} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-primary">{count}</span>
                    <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(({ to, label, Icon }) => (
                <Link key={to} to={to} className="portal-panel flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2 text-xs font-medium text-brand-primary transition-colors hover:bg-slate-100">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="portal-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-primary">Funnel Conversion</h2>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <div className="flex justify-between"><span>Submitted</span><strong>{stats?.funnel?.submitted || 0}</strong></div>
            <div className="flex justify-between"><span>Screened</span><strong>{stats?.funnel?.screened || 0}</strong></div>
            <div className="flex justify-between"><span>Exam Stage</span><strong>{stats?.funnel?.exam || 0}</strong></div>
            <div className="flex justify-between"><span>Approved</span><strong>{stats?.funnel?.approved || 0}</strong></div>
            <div className="flex justify-between"><span>Accepted</span><strong>{stats?.funnel?.accepted || 0}</strong></div>
          </div>
        </div>

        <div className="portal-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-primary">Top Rejection Reasons</h2>
          {!stats?.rejectionReasons?.length ? (
            <p className="text-sm text-slate-500">No rejection reasons available yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.rejectionReasons.map((item) => (
                <div key={item.reason} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-slate-600">{item.reason}</span>
                  <strong className="text-brand-primary">{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="portal-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-primary">Appeals Overview</h2>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            <div className="flex justify-between"><span>Pending</span><strong>{stats?.appeals?.PENDING || 0}</strong></div>
            <div className="flex justify-between"><span>Approved</span><strong>{stats?.appeals?.APPROVED || 0}</strong></div>
            <div className="flex justify-between"><span>Denied</span><strong>{stats?.appeals?.DENIED || 0}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="portal-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-primary">Top Schools</h2>
          {stats?.trends?.schools?.length ? (
            <div className="flex flex-col gap-2">
              {stats.trends.schools.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="truncate text-slate-600">{item.label}</span>
                  <strong className="text-brand-primary">{item.count}</strong>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No school trend data.</p>}
        </div>
        <div className="portal-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-brand-primary">Top Courses</h2>
          {stats?.trends?.courses?.length ? (
            <div className="flex flex-col gap-2">
              {stats.trends.courses.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="truncate text-slate-600">{item.label}</span>
                  <strong className="text-brand-primary">{item.count}</strong>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No course trend data.</p>}
        </div>
      </div>

      <div className="portal-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary">Recent Activity</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No recent activity</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activity.map((log) => (
              <div key={log.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                  {log.performedBy?.fullName?.[0] || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.performedBy?.fullName || 'System'}</span>
                    {' - '}{log.action}
                    {log.application?.applicant?.fullName && (
                      <> for <span className="font-medium">{log.application.applicant.fullName}</span></>
                    )}
                  </p>
                </div>
                <p className="flex-shrink-0 text-xs text-slate-400">{fromNow(log.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
