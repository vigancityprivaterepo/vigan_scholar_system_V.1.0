import React, { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { DocumentIcon, UploadIcon, XIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

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

  if (loading) return <div className="card h-48 animate-pulse bg-gray-100" />

  if (!application) return (
    <div className="portal-empty">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
        <DocumentIcon className="h-6 w-6" />
      </div>
      <p className="mt-4 font-semibold text-brand-primary">No application found</p>
    </div>
  )

  const canSubmit = ['APPROVED', 'COR_REJECTED'].includes(application.status)
  const latestCOR = application.corFiles?.[0]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="portal-kicker">Certificate of Registration</p>
          <h1 className="portal-page-title mt-2">COR Submission</h1>
          <p className="portal-page-subtitle">Upload the official Certificate of Registration from your school registrar.</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {application.status === 'COR_REJECTED' && (
        <div className="portal-surface mb-6 border-l-4 border-red-300 bg-red-50 p-5">
          <div className="mb-2 flex items-center gap-2 text-red-700">
            <AlertTriangleIcon className="h-5 w-5" />
            <p className="font-semibold">COR Rejected</p>
          </div>
          <p className="text-sm text-red-700">{application.rejectionReason || 'Your COR was rejected. Please review and resubmit a corrected copy.'}</p>
        </div>
      )}

      {latestCOR && (
        <div className="portal-surface mb-6 p-6">
          <h3 className="mb-3 text-lg font-semibold text-brand-primary">Previously Submitted COR</h3>
          <div className="portal-panel flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <DocumentIcon className="h-5 w-5 text-brand-primary" />
              <div>
                <p className="text-sm font-medium text-brand-primary">{latestCOR.fileName}</p>
                <p className="text-xs text-slate-500">Uploaded {formatDate(latestCOR.uploadedAt)}</p>
              </div>
            </div>
            <span className={`badge ${latestCOR.isApproved === null ? 'bg-gray-100 text-gray-600' : latestCOR.isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {latestCOR.isApproved === null ? 'Pending' : latestCOR.isApproved ? 'Approved' : 'Rejected'}
            </span>
          </div>
        </div>
      )}

      {!canSubmit ? (
        <div className="portal-empty bg-slate-50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-brand-primary">COR Submission Not Available</p>
          <p className="mt-2 text-sm text-slate-600">
            COR submission is only available after your application is approved.
            {application.status === 'COR_SUBMITTED' && ' Your COR is currently under review.'}
            {application.status === 'ACCEPTED' && ' Your COR has been accepted and you are a confirmed scholar.'}
          </p>
        </div>
      ) : (
        <div className="portal-surface p-6">
          <h3 className="mb-4 text-lg font-semibold text-brand-primary">{application.status === 'COR_REJECTED' ? 'Resubmit COR' : 'Upload Your COR'}</h3>
          <div className="portal-panel mb-4 p-3 text-xs text-slate-700">
            <strong className="text-brand-primary">Requirements:</strong> PDF format only • Max file size: 10MB • Must be the official COR from your school registrar
          </div>

          <div
            {...getRootProps()}
            className={`rounded-md border-2 border-dashed p-10 text-center transition-all ${
              isDragActive ? 'border-brand-teal bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-brand-teal hover:bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
              <UploadIcon className="h-5 w-5" />
            </div>
            <p className="mt-4 font-medium text-brand-primary">
              {isDragActive ? 'Drop COR here...' : 'Drag and drop your COR (PDF), or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF only • Max 10MB</p>
          </div>

          {file && (
            <div className="portal-panel mt-4 flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <DocumentIcon className="h-5 w-5 text-brand-primary" />
                <div>
                  <p className="text-sm font-medium text-brand-primary">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!file || submitting} className="portal-button-primary mt-4 w-full disabled:opacity-50">
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {submitting ? 'Submitting...' : 'Submit COR'}
          </button>
        </div>
      )}
    </div>
  )
}
