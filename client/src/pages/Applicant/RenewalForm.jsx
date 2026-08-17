import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import {
  UploadIcon,
  XIcon,
  DocumentIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/ui/PortalIcons'

const SLOTS = [
  {
    key: 'cor',
    label: 'Certificate of Registration (COR)',
    description: 'Upload your current Certificate of Registration from your college/university. Must be for the current semester/term.',
  },
  {
    key: 'grades',
    label: 'Latest Grade Report / Transcript',
    description: 'Upload your latest official grade report or transcript of records. This will be used to verify your academic standing.',
  },
]

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Under Review', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  APPROVED: { label: 'Approved', color: 'teal', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
  REJECTED: { label: 'Rejected', color: 'red', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
}

function DropSlot({ slot, file, onDrop, onClear }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const [f] = accepted
      if (!f) return
      if (f.size > 5 * 1024 * 1024) { toast.error('File exceeds 5 MB limit'); return }
      onDrop(f)
    },
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? 'border-brand-teal bg-teal-50'
            : 'border-slate-300 bg-slate-50 hover:border-brand-teal hover:bg-teal-50/30'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-teal">
          <UploadIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG — max 5 MB</p>
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
          <DocumentIcon className="h-5 w-5 shrink-0 text-brand-teal" />
          <span className="flex-1 truncate text-sm text-slate-700">{file.name}</span>
          <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
          <button
            type="button"
            onClick={onClear}
            className="ml-1 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
            aria-label="Remove file"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function RenewalForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [existingRenewal, setExistingRenewal] = useState(null)
  const [subStep, setSubStep] = useState(0)  // 0=COR, 1=grades, 2=review
  const [files, setFiles] = useState([null, null])  // [corFile, gradesFile]
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    applicationService.getMyRenewal()
      .then((res) => {
        const { renewal: r, currentAcademicYear } = res.data
        const isCurrentCycle = !!r && r.academicYear === currentAcademicYear
        if (r && isCurrentCycle && r.status !== 'REJECTED') {
          setExistingRenewal(r)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setFile = useCallback((idx, f) => {
    setFiles((prev) => { const n = [...prev]; n[idx] = f; return n })
    setError(null)
  }, [])

  const clearFile = useCallback((idx) => {
    setFiles((prev) => { const n = [...prev]; n[idx] = null; return n })
  }, [])

  const goNext = () => {
    if (subStep < 2) {
      if (!files[subStep]) {
        setError('Please upload this document before continuing.')
        return
      }
      setError(null)
      setSubStep((s) => s + 1)
    }
  }

  const goPrev = () => {
    setError(null)
    if (subStep > 0) setSubStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    if (!files[0] || !files[1]) {
      setError('Both documents are required.')
      return
    }
    try {
      setSubmitting(true)
      const fd = new FormData()
      fd.append('cor', files[0])
      fd.append('grades', files[1])
      await applicationService.submitRenewal(fd)
      toast.success('Renewal submitted successfully!')
      navigate('/applicant/status')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit renewal.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
      </div>
    )
  }

  // Existing pending/approved renewal — show status card
  if (existingRenewal) {
    const cfg = STATUS_CONFIG[existingRenewal.status] || STATUS_CONFIG.PENDING_REVIEW
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <p className="portal-kicker">Scholarship Renewal</p>
          <h1 className="portal-page-title mt-2">Renewal Status</h1>
        </div>

        <div className={`portal-surface border-l-4 p-6 ${cfg.border} ${cfg.bg}`}>
          <div className="mb-3 flex items-center gap-3">
            {existingRenewal.status === 'APPROVED'
              ? <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
              : <AlertTriangleIcon className="h-6 w-6 text-amber-600" />}
            <div>
              <p className={`font-semibold ${cfg.text}`}>{cfg.label}</p>
              <p className="text-xs text-slate-500">
                Ref: #{existingRenewal.id.slice(0, 8).toUpperCase()}
                {existingRenewal.academicYear ? ` · ${existingRenewal.academicYear}` : ''}
              </p>
            </div>
          </div>

          {existingRenewal.status === 'PENDING_REVIEW' && (
            <p className="text-sm text-slate-700">Your renewal application is being reviewed by the scholarship office. We will notify you once a decision has been made.</p>
          )}
          {existingRenewal.status === 'APPROVED' && (
            <p className="text-sm text-slate-700">Your scholarship renewal has been approved. Congratulations and continue your academic excellence!</p>
          )}
          {existingRenewal.adminRemarks && (
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <strong>Remarks:</strong> {existingRenewal.adminRemarks}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link to="/applicant/status" className="portal-button-outline text-sm">Back to Status</Link>
        </div>
      </div>
    )
  }

  // Step indicators
  const steps = ['Upload COR', 'Upload Grades', 'Review & Submit']
  const filled = [!!files[0], !!files[1]]

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="portal-kicker">Scholarship Renewal</p>
        <h1 className="portal-page-title mt-2">Submit Renewal Application</h1>
        <p className="portal-page-subtitle">Upload your COR and latest grades to renew your scholarship for the next academic period.</p>
      </div>

      {/* Progress dots */}
      <div className="portal-surface p-4">
        <div className="flex items-center gap-2">
          {steps.map((label, i) => {
            const isCurrent = subStep === i
            const isDone = i < 2 ? filled[i] && subStep > i : false
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                    isDone
                      ? 'border-brand-teal bg-brand-teal text-white'
                      : isCurrent
                      ? 'border-brand-primary bg-white text-brand-primary'
                      : 'border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircleIcon className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-center text-[11px] font-medium ${isCurrent ? 'text-brand-primary' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full bg-brand-teal transition-all"
            style={{ width: `${Math.round(((filled.filter(Boolean).length) / 2) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-400">{filled.filter(Boolean).length} / 2 documents ready</p>
      </div>

      {/* Step content */}
      <div className="portal-surface p-6">
        {subStep < 2 ? (
          <>
            <div className="mb-5">
              <p className="portal-kicker">Document {subStep + 1} of 2</p>
              <h2 className="mt-1 text-lg font-semibold text-brand-primary">{SLOTS[subStep].label}</h2>
              <p className="mt-1 text-sm text-slate-600">{SLOTS[subStep].description}</p>
            </div>

            <DropSlot
              slot={SLOTS[subStep]}
              file={files[subStep]}
              onDrop={(f) => setFile(subStep, f)}
              onClear={() => clearFile(subStep)}
            />

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goPrev}
                disabled={subStep === 0}
                className="portal-button-outline flex items-center gap-2 text-sm disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                className="portal-button-primary flex items-center gap-2 text-sm"
              >
                Next <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          /* Review step */
          <>
            <div className="mb-5">
              <p className="portal-kicker">Review & Submit</p>
              <h2 className="mt-1 text-lg font-semibold text-brand-primary">Confirm Your Documents</h2>
              <p className="mt-1 text-sm text-slate-600">Please verify the files below before submitting your renewal.</p>
            </div>

            <div className="flex flex-col gap-3">
              {SLOTS.map((slot, i) => (
                <div key={slot.key} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${files[i] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {files[i] ? <CheckCircleIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700">{slot.label}</p>
                    {files[i] ? (
                      <p className="truncate text-xs text-slate-500">{files[i].name} · {(files[i].size / 1024).toFixed(0)} KB</p>
                    ) : (
                      <p className="text-xs text-red-500">Missing — go back to upload</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubStep(i)}
                    className="shrink-0 text-xs text-brand-teal hover:underline"
                  >
                    Replace
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goPrev}
                className="portal-button-outline flex items-center gap-2 text-sm"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !files[0] || !files[1]}
                className="portal-button-primary text-sm disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Renewal'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Link to="/applicant/status" className="text-sm text-slate-500 hover:text-brand-primary">
          ← Cancel and return to status
        </Link>
      </div>
    </div>
  )
}
