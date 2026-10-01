import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import Stepper from '../../components/ui/Stepper'
import { formatDate, formatDateTime, formatScheduleDateTime } from '../../utils/formatDate'
import { AlertTriangleIcon, CalendarIcon, CheckCircleIcon, DocumentIcon, InfoIcon } from '../../components/ui/PortalIcons'

export default function StatusTracker() {
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [communications, setCommunications] = useState([])
  const [appeals, setAppeals] = useState([])
  const [renewal, setRenewal] = useState(null)
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null)
  const [appealReason, setAppealReason] = useState('')
  const [appealLoading, setAppealLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      applicationService.getMine(),
      applicationService.getCommunications(),
      applicationService.getAppeals(),
      applicationService.getMyRenewal().catch(() => ({ data: { renewal: null, currentAcademicYear: null } })),
    ])
      .then(([appRes, commRes, appealRes, renewalRes]) => {
        setApplication(appRes.data.application)
        setCommunications(commRes.data.timeline || [])
        setAppeals(appealRes.data.appeals || [])
        setRenewal(renewalRes.data.renewal || null)
        setCurrentAcademicYear(renewalRes.data.currentAcademicYear || null)
      })
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
  const pendingAppeal = appeals.find((appeal) => appeal.status === 'PENDING')
  const isCurrentCycleRenewal = !!renewal && renewal.academicYear === currentAcademicYear

  const submitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error('Please provide appeal reason.')
      return
    }
    try {
      setAppealLoading(true)
      const response = await applicationService.submitAppeal({ reason: appealReason.trim() })
      toast.success(response.data.message || 'Appeal submitted.')
      const refreshed = await applicationService.getAppeals()
      setAppeals(refreshed.data.appeals || [])
      setAppealReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal.')
    } finally {
      setAppealLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">Application Status</h1>
          <p className="portal-page-subtitle">Reference ID: <span className="font-mono font-bold">#{application.id.slice(0, 8).toUpperCase()}</span></p>
        </div>
        <StatusBadge status={application.status} />
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
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Ask for reconsideration</h4>
              {pendingAppeal ? (
                <p className="text-sm text-amber-700">You already have a pending appeal under review.</p>
              ) : (
                <>
                  <textarea
                    aria-label="Reason for reconsideration"
                    className="portal-input"
                    rows={3}
                    placeholder="Explain why the decision should be reviewed, and mention any document that supports it."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                  />
                  <button onClick={submitAppeal} disabled={appealLoading} className="portal-button-primary mt-2 text-sm">
                    {appealLoading ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {application.status === 'EXAM_INTERVIEW' && application.examSchedules?.[0] && (
          <div className="portal-panel p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 text-brand-primary">
              <CalendarIcon className="h-4 w-4" />
              <p className="font-semibold">Exam/Interview Schedule</p>
            </div>
            <p className="text-slate-700">Date: <strong>{formatScheduleDateTime(application.examSchedules[0].scheduledAt)}</strong></p>
            {application.examSchedules[0].location && <p className="text-slate-700">Location: <strong>{application.examSchedules[0].location}</strong></p>}
            {application.examSchedules[0].examiner?.fullName && <p className="text-slate-700">Examiner: <strong>{application.examSchedules[0].examiner.fullName}</strong></p>}
            <p className="text-slate-700">Type: <strong>{{ EXAM: 'Exam', INTERVIEW: 'Interview', BOTH: 'Exam and interview' }[application.examSchedules[0].type] || application.examSchedules[0].type}</strong></p>
          </div>
        )}

        {application.status === 'APPROVED' && (
          <>
            <p className="mb-3 text-sm text-slate-700">Your application has been approved. Please submit your Certificate of Registration (COR) to complete the process.</p>
            <Link to="/applicant/cor" className="portal-button-primary inline-flex text-sm">Submit COR Now</Link>
          </>
        )}

        {application.status === 'ACCEPTED' && (
          <>
            <p className="mb-4 text-sm text-slate-700">Your scholarship has been fully confirmed. Welcome to the program. You may submit a renewal application for the next academic year below.</p>
            {!application.corHardCopyReceivedAt && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4">
                <div className="mb-1 flex items-center gap-2 text-amber-800">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <p className="text-sm font-semibold">Bring Your Original COR to the Office</p>
                </div>
                <p className="text-sm text-amber-800">Your acceptance is confirmed, but you still need to bring the original (physical) Certificate of Registration to the Scholarship Office in person to complete your enrollment record.</p>
              </div>
            )}
            {/* Renewal status card */}
            {!isCurrentCycleRenewal ? (
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-medium text-brand-primary">Scholarship Renewal</p>
                <p className="mb-3 text-sm text-slate-600">Ready to renew? Submit your COR and latest grades to continue your scholarship.</p>
                {renewal?.academicYear && (
                  <p className="mb-3 text-xs text-slate-500">
                    Last renewed: {renewal.academicYear} · {renewal.status === 'APPROVED' ? 'Approved' : renewal.status === 'REJECTED' ? 'Rejected' : renewal.status.replace(/_/g, ' ')}
                  </p>
                )}
                <Link to="/applicant/renewal" className="portal-button-primary inline-flex text-sm">
                  Submit Renewal Application
                </Link>
              </div>
            ) : renewal.status === 'PENDING_REVIEW' ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Renewal Under Review</p>
                <p className="mt-1 text-xs text-amber-700">Ref: #{renewal.id.slice(0, 8).toUpperCase()}{renewal.academicYear ? ` · ${renewal.academicYear}` : ''}</p>
                <p className="mt-2 text-sm text-slate-700">Your renewal application is being reviewed by the scholarship office.</p>
              </div>
            ) : renewal.status === 'APPROVED' ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Renewal Approved</p>
                <p className="mt-1 text-xs text-emerald-700">Ref: #{renewal.id.slice(0, 8).toUpperCase()}{renewal.academicYear ? ` · ${renewal.academicYear}` : ''}</p>
                <p className="mt-2 text-sm text-slate-700">Your scholarship renewal has been approved. Congratulations!</p>
              </div>
            ) : renewal.status === 'REJECTED' ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Renewal Rejected</p>
                {renewal.adminRemarks && (
                  <div className="mt-2 rounded border border-slate-200 bg-white p-2 text-sm text-slate-700">
                    <strong>Remarks:</strong> {renewal.adminRemarks}
                  </div>
                )}
                <Link to="/applicant/renewal" className="portal-button-primary mt-3 inline-flex text-sm">
                  Submit New Renewal
                </Link>
              </div>
            ) : null}
          </>
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

      <div className="portal-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-brand-primary">Communication Timeline</h3>
        {communications.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Emails and notices the office sends you will be listed here.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {communications.slice(0, 50).map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-primary">{item.title || item.source}</p>
                  <span className="text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{{ EMAIL: 'Email', NOTIFICATION: 'Portal notice', ACTIVITY: 'Status update' }[item.source] || item.source}</p>
                <p className="mt-2 text-sm text-slate-700">{item.message || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

