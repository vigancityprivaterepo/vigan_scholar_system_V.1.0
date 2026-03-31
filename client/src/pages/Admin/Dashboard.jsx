import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

  useEffect(() => {
    adminService.getStats()
      .then((r) => {
        setStats(r.data.stats)
        setActivity(r.data.recentActivity || [])
      })
      .catch(() => {})
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">Administrative Overview</p>
        <h1 className="portal-page-title mt-2">Admin Dashboard</h1>
        <p className="portal-page-subtitle">Scholarship management summary and current workload.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, Icon, accent, link }) => (
          <div key={label} className={`portal-surface p-5 ${link ? 'transition-shadow hover:shadow-md' : ''}`}>
            {link ? (
              <Link to={link} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-md border ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-5 font-display text-3xl font-bold text-brand-primary">{loading ? '-' : value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
              </Link>
            ) : (
              <>
                <div className={`flex h-12 w-12 items-center justify-center rounded-md border ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 font-display text-3xl font-bold text-brand-primary">{loading ? '-' : value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="portal-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-brand-primary">Applications by Status</h2>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(val) => [val, 'Count']} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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
                <Link key={to} to={to} className="portal-panel flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-primary transition-colors hover:bg-slate-100">
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
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
