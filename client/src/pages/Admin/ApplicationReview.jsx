import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { openProtectedFile } from '../../utils/openProtectedFile'
import { ArrowRightIcon, DocumentIcon, AlertTriangleIcon, CheckCircleIcon } from '../../components/ui/PortalIcons'

const CONFIRM_REQUIRED = ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM']

export default function ApplicationReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [examScore, setExamScore] = useState('')

  useEffect(() => {
    adminService.getApplication(id)
      .then(r => setApp(r.data.application))
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoading(false))
  }, [id])

  const doAction = async (newStatus, extra = {}) => {
    if (CONFIRM_REQUIRED.includes(newStatus) && confirmText !== 'CONFIRM') {
      toast.error('Type CONFIRM to proceed')
      return
    }
    setActionLoading(true)
    try {
      await adminService.updateStatus(id, {
        status: newStatus,
        remarks: remarks || undefined,
        rejectionReason: rejectionReason || extra.rejectionReason || undefined,
        examScore: examScore ? parseFloat(examScore) : undefined,
        ...extra,
      })
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      const r = await adminService.getApplication(id)
      setApp(r.data.application)
      setShowConfirm(false)
      setConfirmText('')
      setRemarks('')
      setRejectionReason('')
      setExamScore('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const requestAction = (action) => {
    setPendingAction(action)
    if (CONFIRM_REQUIRED.includes(action.status)) setShowConfirm(true)
    else doAction(action.status, action.extra || {})
  }

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
    </div>
  )

  if (!app) return <div className="portal-empty"><p className="text-slate-500">Application not found</p></div>

  const ACTIONS = {
    PENDING_REVIEW: [
      { label: 'Mark Complete to Eligibility', status: 'ELIGIBILITY_SCREENING', color: 'portal-button-primary', hint: 'All requirements are complete' },
      { label: 'Mark Incomplete', status: 'INCOMPLETE', color: 'portal-button-secondary !border-amber-300 !text-amber-700 hover:!border-amber-500 hover:!text-amber-800', needsRemarks: true },
    ],
    ELIGIBILITY_SCREENING: [
      { label: 'Qualify to Exam/Interview', status: 'EXAM_INTERVIEW', color: 'portal-button-primary' },
      { label: 'Not Qualified to Reject', status: 'NOT_QUALIFIED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    NOT_QUALIFIED: [
      { label: 'Finalize Rejection', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    EXAM_INTERVIEW: [
      { label: 'Mark Passed to Approved', status: 'APPROVED', color: 'portal-button-primary' },
      { label: 'Mark Failed to Reject', status: 'FAILED_EXAM', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    FAILED_EXAM: [
      { label: 'Finalize Rejection', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    COR_SUBMITTED: [
      { label: 'Approve COR to Accept', status: 'ACCEPTED', color: 'portal-button-primary' },
      { label: 'Reject COR', status: 'COR_REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
  }

  const availableActions = ACTIONS[app.status] || []
  const TABS = ['personal', 'academic', 'requirements', 'history']

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={() => navigate(-1)} className="portal-button-secondary !px-3 !py-2 text-sm shrink-0">Back</button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-brand-primary sm:text-2xl">{app.applicant?.fullName}</h1>
          <p className="truncate font-mono text-xs text-slate-500">#{app.id.slice(0, 8).toUpperCase()} • {app.applicant?.email}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="portal-surface p-1">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors sm:flex-1 sm:px-4 sm:py-2 sm:text-sm',
                    activeTab === tab ? 'bg-brand-primary text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-brand-primary'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'personal' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Full Name', app.applicant?.fullName],
                  ['Email', app.applicant?.email],
                  ['Age', app.age],
                  ['Contact', app.contact],
                  ['Year Level', app.yearLevel ? `Year ${app.yearLevel}` : '-'],
                  ['Submitted', formatDate(app.submittedAt)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs font-medium text-slate-500">{l}</p>
                    <p className="mt-0.5 text-sm font-medium text-brand-primary">{v || '-'}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500">Address</p>
                  <p className="mt-0.5 text-sm font-medium text-brand-primary">{app.address || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Academic Records</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['School / University', app.school],
                  ['Course / Program', app.course],
                  ['Year Level', app.yearLevel ? `Year ${app.yearLevel}` : '-'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs font-medium text-slate-500">{l}</p>
                    <p className="mt-0.5 text-sm font-medium text-brand-primary">{v || '-'}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium text-slate-500">GWA</p>
                  <p className={clsx('mt-0.5 font-mono text-2xl font-bold', app.gwa && parseFloat(app.gwa) <= 2.0 ? 'text-green-600' : 'text-red-500')}>
                    {app.gwa ? parseFloat(app.gwa).toFixed(2) : '-'}
                  </p>
                </div>
                {app.examScore && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Exam Score</p>
                    <p className="mt-0.5 font-mono text-2xl font-bold text-brand-primary">{app.examScore}</p>
                  </div>
                )}
              </div>
              {app.achievements && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="mb-1 text-xs font-medium text-slate-500">Academic Achievements</p>
                  <p className="text-sm leading-relaxed text-slate-700">{app.achievements}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Requirement Files ({app.requirementFiles?.length || 0})</h3>
              {!app.requirementFiles?.length ? (
                <p className="py-6 text-center text-sm text-slate-500">No files uploaded</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {app.requirementFiles.map(file => (
                    <div key={file.id} className="portal-panel flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="h-5 w-5 text-brand-primary" />
                        <div>
                          <p className="text-sm font-medium text-brand-primary">{file.fileName}</p>
                          <p className="text-xs text-slate-500">{formatDate(file.uploadedAt)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await openProtectedFile(`/files/requirements/${file.id}`)
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Failed to open file.')
                          }
                        }}
                        className="text-sm font-medium text-brand-primary hover:underline"
                      >
                        View file
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {app.corFiles?.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h4 className="mb-3 font-semibold text-brand-primary">COR Files</h4>
                  {app.corFiles.map(cor => (
                    <div key={cor.id} className="portal-panel flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="h-5 w-5 text-brand-primary" />
                        <div>
                          <p className="text-sm font-medium text-brand-primary">{cor.fileName}</p>
                          <p className="text-xs text-slate-500">{formatDate(cor.uploadedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge ${cor.isApproved === null ? 'bg-gray-100 text-gray-600' : cor.isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cor.isApproved === null ? 'Pending' : cor.isApproved ? 'Approved' : 'Rejected'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await openProtectedFile(`/files/cor/${cor.id}`)
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Failed to open file.')
                            }
                          }}
                          className="text-sm font-medium text-brand-primary hover:underline"
                        >
                          View file
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Activity History</h3>
              {!app.activityLogs?.length ? (
                <p className="py-6 text-center text-sm text-slate-500">No activity yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {app.activityLogs.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-3 w-3 rounded-full bg-brand-teal" />
                        {i < app.activityLogs.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-slate-200" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium text-brand-primary">{log.action}</p>
                        {log.notes && <p className="mt-0.5 rounded p-2 text-xs text-slate-600">{log.notes}</p>}
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                          {log.performedBy && <p className="text-xs text-slate-500">by {log.performedBy.fullName}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="portal-surface p-6 lg:sticky lg:top-6">
            <h3 className="mb-4 text-lg font-semibold text-brand-primary">Actions</h3>

            {availableActions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-slate-500">No actions available</p>
                <p className="mt-1 text-xs text-slate-400">Status: {app.status.replace(/_/g, ' ')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {app.status === 'EXAM_INTERVIEW' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Exam Score (optional)</label>
                    <input type="number" className="portal-input" placeholder="e.g. 85.5" value={examScore} onChange={e => setExamScore(e.target.value)} />
                  </div>
                )}

                {availableActions.some(a => a.needsRemarks) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Admin Remarks</label>
                    <textarea className="portal-input" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Explain action to applicant..." />
                  </div>
                )}

                {availableActions.some(a => a.needsReason) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Rejection Reason</label>
                    <textarea className="portal-input" rows={2} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." />
                  </div>
                )}

                {availableActions.map(action => (
                  <button
                    key={action.status}
                    onClick={() => requestAction(action)}
                    disabled={actionLoading}
                    className={clsx(action.color || 'portal-button-primary', 'w-full justify-center py-2.5 text-sm')}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {showConfirm && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-red-700">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <p className="text-sm font-semibold">Confirm Action</p>
                </div>
                <p className="mb-3 text-xs text-red-600">This action cannot be undone. Type <strong>CONFIRM</strong> to proceed.</p>
                <input className="portal-input mb-3 text-sm" placeholder="Type CONFIRM" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => { setShowConfirm(false); setConfirmText('') }} className="portal-button-secondary flex-1 text-xs">Cancel</button>
                  <button
                    disabled={confirmText !== 'CONFIRM' || actionLoading}
                    onClick={() => doAction(pendingAction.status, pendingAction?.extra || {})}
                    className="portal-button-secondary flex-1 !border-red-300 text-xs !text-red-700 disabled:opacity-40 hover:!border-red-500 hover:!text-red-800"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="portal-surface p-6 text-sm">
            <h4 className="mb-3 font-semibold text-brand-primary">Quick Info</h4>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="flex justify-between"><span>Files</span><span className="font-medium">{app.requirementFiles?.length || 0}</span></div>
              <div className="flex justify-between"><span>GWA</span><span className={clsx('font-mono font-bold', app.gwa && parseFloat(app.gwa) <= 2.0 ? 'text-green-600' : 'text-red-500')}>{app.gwa ? parseFloat(app.gwa).toFixed(2) : '-'}</span></div>
              {app.examScore && <div className="flex justify-between"><span>Exam</span><span className="font-mono font-bold">{app.examScore}</span></div>}
              <div className="flex justify-between"><span>Submitted</span><span>{formatDate(app.submittedAt)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
