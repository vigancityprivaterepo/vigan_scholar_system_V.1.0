import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import Stepper from '../../components/ui/Stepper'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { AlertTriangleIcon, CalendarIcon, CheckCircleIcon, DocumentIcon, InfoIcon } from '../../components/ui/PortalIcons'

export default function StatusTracker() {
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applicationService.getMine()
      .then(r => setApplication(r.data.application))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load status data.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
    </div>
  )

  if (!application) return (
    <div className="portal-empty">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
        <DocumentIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold text-brand-primary">No Application Found</h2>
      <p className="mt-3 text-sm text-slate-600">You have not submitted an application yet.</p>
      <Link to="/applicant/apply" className="portal-button-primary mt-6 inline-flex">Apply Now</Link>
    </div>
  )

  const isIncomplete = application.status === 'INCOMPLETE'
  const isCORRejected = application.status === 'COR_REJECTED'
  const isRejected = ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM'].includes(application.status)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="portal-kicker">Application Tracking</p>
          <h1 className="portal-page-title mt-2">Application Status</h1>
          <p className="portal-page-subtitle">Reference ID: <span className="font-mono font-bold">#{application.id.slice(0, 8).toUpperCase()}</span></p>
        </div>
        <StatusBadge status={application.status} size="lg" />
      </div>

      <div className="portal-surface overflow-x-auto p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary">Your Progress</h2>
        <Stepper currentStatus={application.status} />
      </div>

      <div className={`portal-surface border-l-4 p-5 ${
        isRejected ? 'border-red-300 bg-red-50' :
        isIncomplete || isCORRejected ? 'border-amber-300 bg-amber-50' :
        application.status === 'ACCEPTED' ? 'border-emerald-300 bg-emerald-50' :
        'border-blue-300 bg-blue-50'
      }`}>
        <div className="mb-3 flex items-center gap-2">
          {isIncomplete || isCORRejected ? <AlertTriangleIcon className="h-5 w-5 text-amber-700" /> :
           isRejected ? <AlertTriangleIcon className="h-5 w-5 text-red-700" /> :
           application.status === 'ACCEPTED' ? <CheckCircleIcon className="h-5 w-5 text-emerald-700" /> :
           <InfoIcon className="h-5 w-5 text-blue-700" />}
          <h3 className="font-semibold text-brand-primary">
            {isIncomplete ? 'Action Required' :
             isCORRejected ? 'COR Rejected' :
             isRejected ? 'Application Result' :
             application.status === 'ACCEPTED' ? 'Scholarship Confirmed' :
             'Current Stage'}
          </h3>
        </div>

        {isIncomplete && (
          <>
            <p className="mb-2 text-sm text-slate-700">Your requirements are incomplete. Please review the admin remarks below and resubmit.</p>
            {application.adminRemarks && <div className="portal-panel mb-3 p-3 text-sm text-slate-700"><strong>Remarks:</strong> {application.adminRemarks}</div>}
            <Link to="/applicant/apply" className="portal-button-primary inline-flex text-sm">Resubmit Application</Link>
          </>
        )}

        {isCORRejected && (
          <>
            <p className="mb-2 text-sm text-slate-700">Your Certificate of Registration was rejected.</p>
            {application.rejectionReason && <div className="portal-panel mb-3 p-3 text-sm text-slate-700"><strong>Reason:</strong> {application.rejectionReason}</div>}
            <Link to="/applicant/cor" className="portal-button-primary inline-flex text-sm">Resubmit COR</Link>
          </>
        )}

        {isRejected && (
          <>
            <p className="mb-2 text-sm text-slate-700">Unfortunately, your application was not successful.</p>
            {application.rejectionReason && <div className="portal-panel p-3 text-sm text-slate-700"><strong>Reason:</strong> {application.rejectionReason}</div>}
          </>
        )}

        {application.status === 'EXAM_INTERVIEW' && application.examSchedules?.[0] && (
          <div className="portal-panel p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 text-brand-primary">
              <CalendarIcon className="h-4 w-4" />
              <p className="font-semibold">Exam/Interview Schedule</p>
            </div>
            <p className="text-slate-700">Date: <strong>{formatDateTime(application.examSchedules[0].scheduledAt)}</strong></p>
            {application.examSchedules[0].location && <p className="text-slate-700">Location: <strong>{application.examSchedules[0].location}</strong></p>}
            <p className="text-slate-700">Type: <strong>{application.examSchedules[0].type}</strong></p>
          </div>
        )}

        {application.status === 'APPROVED' && (
          <>
            <p className="mb-3 text-sm text-slate-700">Your application has been approved. Please submit your Certificate of Registration (COR) to complete the process.</p>
            <Link to="/applicant/cor" className="portal-button-primary inline-flex text-sm">Submit COR Now</Link>
          </>
        )}

        {application.status === 'ACCEPTED' && (
          <p className="text-sm text-slate-700">Your scholarship has been fully confirmed. Welcome to the program. You will receive further instructions via email.</p>
        )}

        {['PENDING_REVIEW', 'ELIGIBILITY_SCREENING', 'COR_SUBMITTED'].includes(application.status) && (
          <p className="text-sm text-slate-700">Your application is currently under review. We will notify you of any updates.</p>
        )}
      </div>

      <div className="portal-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-brand-primary">Application Details</h3>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['School', application.school],
            ['Course', application.course],
            ['Year Level', application.yearLevel ? `Year ${application.yearLevel}` : '-'],
            ['GWA', application.gwa],
            ['Submitted', formatDate(application.submittedAt)],
            ['Last Updated', formatDate(application.updatedAt)],
          ].map(([l, v]) => (
            <div key={l} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-slate-500">{l}</span>
              <span className="font-medium text-brand-primary">{v || '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {application.activityLogs?.length > 0 && (
        <div className="portal-surface p-6">
          <h3 className="mb-4 text-lg font-semibold text-brand-primary">Activity Timeline</h3>
          <div className="flex flex-col gap-3">
            {application.activityLogs.map((log, i) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-brand-teal" />
                  {i < application.activityLogs.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-slate-200" />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm font-medium text-brand-primary">{log.action}</p>
                  {log.notes && <p className="mt-0.5 text-xs text-slate-500">{log.notes}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
