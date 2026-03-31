import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import Stepper from '../../components/ui/Stepper'
import { fromNow, formatDate } from '../../utils/formatDate'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  GraduationCapIcon,
  InfoIcon,
  AlertTriangleIcon,
  DocumentIcon,
} from '../../components/ui/PortalIcons'

const ACTION_MAP = {
  PENDING_REVIEW: { msg: 'Your application is under review. We will notify you of any updates.', cta: null },
  INCOMPLETE: { msg: 'Your application is incomplete. Please review admin remarks and resubmit.', cta: { to: '/applicant/status', label: 'View & Resubmit' } },
  ELIGIBILITY_SCREENING: { msg: 'Your application is being reviewed for eligibility. Hang tight!', cta: null },
  NOT_QUALIFIED: { msg: 'Unfortunately, your application did not meet eligibility requirements.', cta: null },
  EXAM_INTERVIEW: { msg: 'Congratulations. You are invited for exam/interview. Watch for your schedule.', cta: { to: '/applicant/status', label: 'View Schedule' } },
  FAILED_EXAM: { msg: 'We regret that you did not pass the exam/interview.', cta: null },
  APPROVED: { msg: 'Your application is approved. Please submit your Certificate of Registration.', cta: { to: '/applicant/cor', label: 'Submit COR Now' } },
  COR_SUBMITTED: { msg: 'Your COR is submitted and under review.', cta: null },
  COR_REJECTED: { msg: 'Your COR was rejected. Please review the reason and resubmit.', cta: { to: '/applicant/cor', label: 'Resubmit COR' } },
  ACCEPTED: { msg: 'Congratulations. Your scholarship has been confirmed. Welcome to the program.', cta: null },
  REJECTED: { msg: 'Your application was not accepted this cycle.', cta: null },
}

export default function ApplicantDashboard() {
  const { user } = useAuthStore()
  const { notifications } = useAppStore()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applicationService.getMine()
      .then(r => setApplication(r.data.application))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadNotifs = notifications.filter(n => !n.isRead).slice(0, 5)
  const action = application ? ACTION_MAP[application.status] : null
  const summaryCards = application ? [
    { label: 'Submitted', value: formatDate(application.submittedAt), note: fromNow(application.submittedAt), Icon: ClockIcon, accent: 'border-blue-100 bg-blue-50 text-blue-700' },
    { label: 'Reference ID', value: `#${application.id.slice(0, 8).toUpperCase()}`, note: 'Use this ID for scholarship inquiries.', Icon: FileTextIcon, accent: 'border-teal-100 bg-teal-50 text-teal-700' },
    { label: 'School', value: application.school || '-', note: application.course || 'No course listed', Icon: GraduationCapIcon, accent: 'border-violet-100 bg-violet-50 text-violet-700' },
  ] : []

  const notificationIcon = (type) => {
    if (type === 'SUCCESS') return CheckCircleIcon
    if (type === 'WARNING') return AlertTriangleIcon
    if (type === 'ERROR') return AlertTriangleIcon
    return InfoIcon
  }

  const actionTone =
    ['INCOMPLETE', 'COR_REJECTED'].includes(application?.status)
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : ['APPROVED', 'ACCEPTED'].includes(application?.status)
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
        : ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM'].includes(application?.status)
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-blue-300 bg-blue-50 text-blue-800'

  return (
    <div className="flex flex-col gap-6">
      <div className="portal-surface overflow-hidden">
        <div className="border-b border-slate-300 bg-gradient-to-r from-[#0f3d6d] via-[#164f8c] to-[#0f3d6d] px-6 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Applicant Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-100">Track your scholarship application progress and review the latest updates below.</p>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
          <div className="portal-panel p-4">
            <p className="portal-kicker">Portal Access</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">Submit forms, upload requirements, and monitor status from a single applicant account.</p>
          </div>
          <div className="portal-panel p-4">
            <p className="portal-kicker">Current Cycle</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">All updates are posted according to the official scholarship review process.</p>
          </div>
          <div className="portal-panel p-4">
            <p className="portal-kicker">Notifications</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">Unread portal notices appear here and in the notifications section.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
        </div>
      ) : !application ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
            <DocumentIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-brand-primary">No Application Yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">Start your scholarship application to create an official applicant record in the portal.</p>
          <Link to="/applicant/apply" className="portal-button-primary mt-6 inline-flex">Apply Now</Link>
        </div>
      ) : (
        <>
          <div className="portal-surface overflow-x-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-primary">Application Progress</h2>
              <StatusBadge status={application.status} />
            </div>
            <Stepper currentStatus={application.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {summaryCards.map(({ label, value, note, Icon, accent }) => (
              <div key={label} className="portal-surface p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-md border ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-1 font-semibold text-brand-primary">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{note}</p>
              </div>
            ))}
          </div>

          {action && (
            <div className={`portal-surface border-l-4 p-5 ${actionTone}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.16em]">Current Guidance</p>
              <p className="mt-2 text-sm leading-7">{action.msg}</p>
              {action.cta && (
                <Link to={action.cta.to} className="portal-button-primary mt-4 inline-flex text-sm">
                  {action.cta.label}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          {unreadNotifs.length > 0 && (
            <div className="portal-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-primary">Recent Notifications</h3>
                <Link to="/applicant/notifications" className="text-sm font-medium text-brand-primary hover:underline">View all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {unreadNotifs.map(n => {
                  const Icon = notificationIcon(n.type)
                  return (
                    <div key={n.id} className="portal-panel flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-primary">{n.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{n.message}</p>
                      </div>
                      <p className="flex-shrink-0 text-xs text-slate-400">{fromNow(n.createdAt)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
