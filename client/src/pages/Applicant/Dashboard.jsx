import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import Stepper from '../../components/ui/Stepper'
import { fromNow, formatDate } from '../../utils/formatDate'
import {
  CheckCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  DocumentIcon,
} from '../../components/ui/PortalIcons'

const ACTION_MAP = {
  PENDING_REVIEW: { msg: 'Your application is under review. We will notify you of any updates.', cta: null },
  INCOMPLETE: { msg: 'Your application is incomplete. Please review admin remarks and resubmit.', cta: { to: '/applicant/status', label: 'View & Resubmit' } },
  ELIGIBILITY_SCREENING: { msg: 'Your requirements are complete and your application is being checked against the eligibility rules. You will be notified of the result.', cta: null },
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
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load application data.'))
      .finally(() => setLoading(false))
  }, [])

  const unreadNotifs = notifications.filter(n => !n.isRead).slice(0, 5)
  const action = application ? ACTION_MAP[application.status] : null
  const summaryCards = application ? [
    { label: 'Submitted', value: formatDate(application.submittedAt), note: fromNow(application.submittedAt) },
    { label: 'Reference ID', value: `#${application.id.slice(0, 8).toUpperCase()}`, note: 'Quote this ID when you contact the office.' },
    { label: 'School', value: application.school || '-', note: application.course || 'No course listed' },
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
      <div>
        <h1 className="portal-page-title">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <p className="portal-page-subtitle">Your application, what to do next, and the latest notices from the scholarship office.</p>
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
          <h2 className="mt-5 font-display text-2xl font-bold text-brand-primary">You haven't applied yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">The application has five steps: personal, family and academic details, then your documents and a final review. Have your Form 138 and other requirements ready as files before you start.</p>
          <Link to="/applicant/apply" className="portal-button-primary mt-6 inline-flex">Apply Now</Link>
        </div>
      ) : (
        <>
          {action && (
            <div className={`portal-surface border-l-4 p-5 ${actionTone}`}>
              <h2 className="text-base font-semibold">What to do next</h2>
              <p className="mt-2 text-sm leading-7">{action.msg}</p>
              {action.cta && (
                <Link to={action.cta.to} className="portal-button-primary mt-4 inline-flex text-sm">
                  {action.cta.label}
                </Link>
              )}
            </div>
          )}

          <div className="portal-surface overflow-x-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-primary">Application Progress</h2>
              <StatusBadge status={application.status} />
            </div>
            <Stepper currentStatus={application.status} />
          </div>

          <dl className="portal-surface grid gap-4 p-5 sm:grid-cols-3">
            {summaryCards.map(({ label, value, note }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold text-brand-primary">{value}</dd>
                <dd className="mt-0.5 text-xs text-slate-500">{note}</dd>
              </div>
            ))}
          </dl>

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
