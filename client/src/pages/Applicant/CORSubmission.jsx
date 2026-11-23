import React, { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { DocumentIcon, UploadIcon, XIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

export default function CORSubmission() {
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    applicationService.getMine()
      .then(r => setApplication(r.data.application))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load application data.'))
      .finally(() => setLoading(false))
  }, [])

  const onDrop = useCallback((accepted) => {
    if (accepted[0]?.size > 10 * 1024 * 1024) {
      toast.error('COR file must be under 10MB')
      return
    }
    setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  const handleSubmit = async () => {
    if (!file) { toast.error('Please select a COR file'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('cor', file)
      await applicationService.submitCOR(fd)
      toast.success('COR submitted successfully!')
      const r = await applicationService.getMine()
      setApplication(r.data.application)
      setFile(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="skeleton h-48 rounded-card" />

  if (!application) return (
    <div className="portal-empty">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-control border border-slate-300 bg-slate-50 text-brand-primary">
        <DocumentIcon className="h-6 w-6" />
      </div>
      <p className="mt-4 font-semibold text-brand-primary">No application found</p>
    </div>
  )

  const canSubmit = ['APPROVED', 'COR_REJECTED'].includes(application.status)
  const latestCOR = application.corFiles?.[0]

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">Submit your COR</h1>
          <p className="portal-page-subtitle">Upload the official Certificate of Registration from your school registrar.</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {application.status === 'COR_REJECTED' && (
        <div className="mb-6 animate-slide-up rounded-card border border-amber-300 bg-status-warn-bg p-5">
          <div className="mb-2 flex items-center gap-2 text-status-warn-fg">
            <AlertTriangleIcon className="h-5 w-5" />
            <p className="font-semibold">Returned by the office</p>
          </div>
          <p className="text-[15px] text-status-warn-fg">{application.rejectionReason || 'Please review your COR and upload a corrected copy.'}</p>
        </div>
      )}

      {latestCOR && (
        <div className="card mb-6 p-6">
          <h3 className="mb-3 text-lg font-semibold text-brand-primary">Previously Submitted COR</h3>
          <div className="rounded-[14px] border border-brand-divider bg-brand-bg flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <DocumentIcon className="h-5 w-5 text-brand-primary" />
              <div>
                <p className="text-sm font-medium text-brand-primary">{latestCOR.fileName}</p>
                <p className="text-xs text-slate-500">Uploaded {formatDate(latestCOR.uploadedAt)}</p>
              </div>
            </div>
            <span className={`badge ${latestCOR.isApproved === null ? 'bg-slate-100 text-slate-600' : latestCOR.isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {latestCOR.isApproved === null ? 'Pending' : latestCOR.isApproved ? 'Approved' : 'Rejected'}
            </span>
          </div>
        </div>
      )}

      {!canSubmit ? (
        <div className="portal-empty bg-slate-50">
          <p className="font-semibold text-brand-primary">
            {application.status === 'COR_SUBMITTED' ? 'Your COR is under review'
              : application.status === 'ACCEPTED' ? 'Your COR has been approved'
              : 'COR upload opens after approval'}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {application.status === 'COR_SUBMITTED' && 'The office is checking the COR you uploaded. You will be notified of the result.'}
            {application.status === 'ACCEPTED' && 'You are a confirmed scholar.'}
            {application.status === 'ACCEPTED' && !application.corHardCopyReceivedAt && ' Please also bring the original COR to the Scholarship Office in person to complete your record.'}
            {!['COR_SUBMITTED', 'ACCEPTED'].includes(application.status) && 'You can upload your Certificate of Registration once your application is approved after the exam and interview.'}
          </p>
        </div>
      ) : (
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-brand-primary">{application.status === 'COR_REJECTED' ? 'Resubmit COR' : 'Upload Your COR'}</h3>
          <ul className="mb-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: 'PDF file', ok: Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) },
              { label: 'Under 10 MB', ok: Boolean(file) && file.size <= 10 * 1024 * 1024 },
              { label: 'Official COR from your registrar', ok: Boolean(file) },
            ].map((tip) => (
              <li
                key={tip.label}
                className={`flex items-center gap-2 rounded-button border px-3 py-2.5 text-[15px] font-semibold transition-colors duration-med ${
                  tip.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <span key={String(tip.ok)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tip.ok ? 'animate-pop-in bg-brand-teal text-white' : 'bg-slate-200 text-slate-500'}`} aria-hidden="true">
                  {tip.ok ? '✓' : '•'}
                </span>
                {tip.label}
              </li>
            ))}
          </ul>

          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-card border-2 p-10 text-center transition-colors duration-med ${
              file ? 'border-solid border-brand-teal bg-emerald-50'
                : isDragActive ? 'border-dashed border-brand-teal bg-emerald-50' : 'border-dashed border-slate-300 bg-brand-bg hover:border-brand-teal hover:bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div key={file ? 'done' : 'empty'} className={`mx-auto flex h-14 w-14 animate-pop-in items-center justify-center rounded-full ${file ? 'bg-brand-teal text-white' : 'bg-white text-brand-primary ring-1 ring-slate-300'}`}>
              {file ? <span className="text-2xl font-bold" aria-hidden="true">✓</span> : <UploadIcon className="h-6 w-6" />}
            </div>
            <p className="mt-4 font-semibold text-brand-primary">
              {file ? 'COR ready to submit' : isDragActive ? 'Drop your COR here' : 'Tap to choose your COR (PDF)'}
            </p>
            <p className="mt-1 text-sm text-slate-500">{file ? 'Tap to choose a different file' : 'PDF only · max 10 MB'}</p>
          </div>

          {file && (
            <div className="rounded-[14px] border border-brand-divider bg-brand-bg mt-4 flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <DocumentIcon className="h-5 w-5 text-brand-primary" />
                <div>
                  <p className="text-sm font-medium text-brand-primary">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} aria-label="Remove selected file" className="text-red-500 hover:text-red-700">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!file || submitting} className="btn-cta mt-4 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none">
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {submitting ? 'Submitting…' : 'Submit COR'}
          </button>
        </div>
      )}
    </div>
  )
}
