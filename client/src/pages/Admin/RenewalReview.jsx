import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { openProtectedFile } from '../../utils/openProtectedFile'
import { DocumentIcon, ChevronLeftIcon } from '../../components/ui/PortalIcons'

const STATUS_BADGE = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const STATUS_LABEL = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const DOC_LABEL = {
  COR: 'Certificate of Registration (COR)',
  GRADES: 'Latest Grade Report / Transcript',
}

export default function RenewalReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [renewal, setRenewal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [remarks, setRemarks] = useState('')

  const fetchRenewal = () => {
    adminService.getRenewal(id)
      .then((res) => setRenewal(res.data.renewal))
      .catch(() => toast.error('Failed to load renewal.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRenewal() }, [id])

  const handleApprove = async () => {
    try {
      setActionLoading(true)
      await adminService.updateRenewalStatus(id, { status: 'APPROVED' })
      toast.success('Renewal approved.')
      fetchRenewal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve renewal.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast.error('Please provide rejection remarks.')
      return
    }
    try {
      setActionLoading(true)
      await adminService.updateRenewalStatus(id, { status: 'REJECTED', adminRemarks: remarks.trim() })
      toast.success('Renewal rejected.')
      setShowRejectForm(false)
      setRemarks('')
      fetchRenewal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject renewal.')
    } finally {
      setActionLoading(false)
    }
  }

  const openFile = async (fileId) => {
    try {
      await openProtectedFile(`/files/renewals/${fileId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open file.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
      </div>
    )
  }

  if (!renewal) {
    return (
      <div className="portal-surface p-12 text-center">
        <p className="text-slate-500">Renewal not found.</p>
        <button onClick={() => navigate('/admin/renewals')} className="portal-button-outline mt-4 text-sm">
          Back to Renewals
        </button>
      </div>
    )
  }

  const app = renewal.application || {}
  const scholar = renewal.applicant || {}
  const isPending = renewal.status === 'PENDING_REVIEW'

  const corFile = renewal.renewalFiles?.find((f) => f.docType === 'COR')
  const gradesFile = renewal.renewalFiles?.find((f) => f.docType === 'GRADES')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/renewals')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-primary"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Back to Renewals
      </button>

      {/* Header */}
      <div className="portal-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="portal-kicker">Renewal Application</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary">
              {scholar.fullName || 'Unknown Scholar'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ref: #{renewal.id.slice(0, 8).toUpperCase()}
              {renewal.academicYear ? ` · ${renewal.academicYear}` : ''}
              {' · '}Submitted {formatDate(renewal.submittedAt)}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${STATUS_BADGE[renewal.status]}`}>
            {STATUS_LABEL[renewal.status]}
          </span>
        </div>

        {renewal.adminRemarks && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <strong>Admin Remarks:</strong> {renewal.adminRemarks}
          </div>
        )}
      </div>

      {/* Scholar Info */}
      <div className="portal-surface p-6">
        <h2 className="mb-4 font-semibold text-brand-primary">Scholar Information</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ['Email', scholar.email],
            ['Full Name', app.lastName ? `${app.lastName}, ${app.firstName}${app.middleName ? ' ' + app.middleName : ''}` : scholar.fullName],
            ['Contact', app.contact],
            ['Address', app.address],
            ['School', app.school],
            ['General Average', app.generalAverage ? `${Number(app.generalAverage).toFixed(2)}%` : null],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <span className="font-medium text-slate-800">{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="portal-surface p-6">
        <h2 className="mb-4 font-semibold text-brand-primary">Submitted Documents</h2>
        <div className="flex flex-col gap-3">
          {[corFile, gradesFile].map((file, i) => {
            const docKey = i === 0 ? 'COR' : 'GRADES'
            return (
              <div key={docKey} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${file ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                  <DocumentIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700">{DOC_LABEL[docKey]}</p>
                  {file ? (
                    <p className="truncate text-xs text-slate-500">{file.fileName}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Not submitted</p>
                  )}
                </div>
                {file && (
                  <button
                    onClick={() => openFile(file.id)}
                    className="shrink-0 rounded-md border border-brand-teal px-3 py-1.5 text-xs font-medium text-brand-teal hover:bg-teal-50 transition-colors"
                  >
                    View
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin Action */}
      {isPending && (
        <div className="portal-surface p-6">
          <h2 className="mb-4 font-semibold text-brand-primary">Review Action</h2>

          {!showRejectForm ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? 'Processing…' : 'Approve Renewal'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
              >
                Reject Renewal
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Rejection Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="portal-input"
                  rows={3}
                  placeholder="Explain why the renewal is being rejected…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !remarks.trim()}
                  className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => { setShowRejectForm(false); setRemarks('') }}
                  className="portal-button-outline text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
