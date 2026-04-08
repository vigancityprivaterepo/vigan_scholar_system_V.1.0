import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import api from '../../services/api'
import { UploadIcon, DocumentIcon, XIcon, ArrowRightIcon } from '../../components/ui/PortalIcons'

const STEPS = ['Personal Info', 'Academic', 'Documents', 'Review']
const REQUIRED_DOCS = [
  'Personal Letter of Application addressed to City Mayor',
  'Certificated of Residency from the Punong Barangay (certifying that the applicant is a bonafide resident of the barangay for at least one (1) year and has no derogatory records)',
  'Form 138 (General Average of at least 83% and no grade lower than 80% for the 1st and 2nd Semester)',
  'Certification from High School Prncipal that the applicant is eligible for college education and of Good Moral Character.',
  'Result of College Admission Test(CAT)',
  'Picture (Passport Size with Printed Name).',
  'Affidavit executed by one of the applicants parents or legal guardian that their combined annual income is less than eighty Four Thousand Two Hundred Four Pesos (P 84, 204.00) and they do not have any real estate property with fair value of not more than Two Hundred Fifty thousand Peses (P 250, 000.00)',
]

const SAVED_KEY = 'scholarship_form_draft'

export default function ApplicationForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [existingApplication, setExistingApplication] = useState(null)
  const [checkingApplication, setCheckingApplication] = useState(true)
  const [settings, setSettings] = useState({ applicationOpen: true, applicationDeadline: null })
  const [countdownNow, setCountdownNow] = useState(Date.now())
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      return saved ? JSON.parse(saved) : {
        fullName: '', age: '', address: '', contact: '', school: '',
        course: '', yearLevel: '', gwa: '', achievements: '',
      }
    } catch {
      return { fullName: '', age: '', address: '', contact: '', school: '', course: '', yearLevel: '', gwa: '', achievements: '' }
    }
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    applicationService.getMine()
      .then(r => {
        const application = r.data.application
        if (!application) return

        if (application.status === 'INCOMPLETE') {
          setExistingApplication(application)
          setForm(current => ({
            ...current,
            age: application.age?.toString() || '',
            address: application.address || '',
            contact: application.contact || '',
            school: application.school || '',
            course: application.course || '',
            yearLevel: application.yearLevel?.toString() || '',
            gwa: application.gwa?.toString() || '',
            achievements: application.achievements || '',
          }))
          return
        }

        navigate('/applicant/status')
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load application data.'))
      .finally(() => setCheckingApplication(false))
  }, [navigate])

  useEffect(() => {
    api.get('/settings')
      .then((response) => {
        setSettings({
          applicationOpen: response.data?.settings?.applicationOpen !== false,
          applicationDeadline: response.data?.settings?.applicationDeadline || null,
        })
      })
      .catch(() => {
        setSettings({ applicationOpen: true, applicationDeadline: null })
      })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCountdownNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(form))
  }, [form])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const err = (k) => errors[k] ? <p className="mt-1 text-xs text-red-500">{errors[k]}</p> : null

  const onDrop = useCallback((acceptedFiles) => {
    const valid = acceptedFiles.filter(f => f.size <= 5 * 1024 * 1024)
    const oversized = acceptedFiles.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length) toast.error(`${oversized.length} file(s) exceed 5MB limit`)
    setFiles(prev => [...prev, ...valid])
  }, [])

  const deadlineDate = settings.applicationDeadline ? new Date(settings.applicationDeadline) : null
  const hasPassedDeadline = deadlineDate ? countdownNow > deadlineDate.getTime() : false
  const submissionsBlocked = !settings.applicationOpen || hasPassedDeadline
  const canEditForm = !submissionsBlocked

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    multiple: true,
    disabled: !canEditForm,
  })

  const formatCountdown = () => {
    if (!deadlineDate) return null
    const diff = deadlineDate.getTime() - countdownNow
    if (diff <= 0) return 'Deadline passed'
    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${days}d ${hours}h ${minutes}m ${seconds}s`
  }

  const validateStep = () => {
    const e = {}
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = 'Required'
      if (!form.age || form.age < 15 || form.age > 40) e.age = 'Enter a valid age (15-40)'
      if (!form.address.trim()) e.address = 'Required'
      if (!form.contact.trim()) e.contact = 'Required'
      else if (!/^(09|\+639)\d{9}$/.test(form.contact.trim().replace(/\s/g, ''))) e.contact = 'Enter a valid Philippine number (e.g. 09XX XXX XXXX)'
      if (!form.school.trim()) e.school = 'Required'
      if (!form.course.trim()) e.course = 'Required'
      if (!form.yearLevel || form.yearLevel < 1 || form.yearLevel > 6) e.yearLevel = 'Enter year level (1-6)'
    }
    if (step === 1) {
      const gwa = parseFloat(form.gwa)
      if (!form.gwa || isNaN(gwa) || gwa < 1.0 || gwa > 5.0) e.gwa = 'GWA must be between 1.00 and 5.00'
    }
    if (step === 2 && files.length === 0) e.files = 'Please upload at least one requirement document'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!canEditForm) {
      toast.error('Submissions are currently closed.')
      return
    }
    if (validateStep()) setStep(s => s + 1)
  }
  const back = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    if (!canEditForm) {
      toast.error('Submissions are currently closed.')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      files.forEach(f => fd.append('files', f))
      if (existingApplication?.status === 'INCOMPLETE') {
        await applicationService.resubmit(fd)
        toast.success('Application resubmitted successfully!')
      } else {
        await applicationService.submit(fd)
        toast.success('Application submitted successfully!')
      }
      localStorage.removeItem(SAVED_KEY)
      navigate('/applicant/status')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (k) => `portal-input ${errors[k] ? '!border-red-400' : ''}`

  if (checkingApplication) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="portal-surface p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(item => (
              <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="portal-kicker">Scholarship Application</p>
        <h1 className="portal-page-title mt-2">
          {existingApplication?.status === 'INCOMPLETE' ? 'Resubmit your application' : 'Submit your application'}
        </h1>
        <p className="portal-page-subtitle">
          {existingApplication?.status === 'INCOMPLETE'
            ? 'Update the flagged details, attach corrected documents, and send your application back for review.'
            : 'Complete all steps and upload the required documents for review.'}
        </p>
      </div>

      {(settings.applicationDeadline || !settings.applicationOpen) && (
        <div className={`portal-surface mb-6 border-l-4 p-5 ${submissionsBlocked ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
          <p className={`portal-kicker ${submissionsBlocked ? 'text-red-700' : 'text-blue-700'}`}>Application Window</p>
          {!settings.applicationOpen ? (
            <p className="mt-2 text-sm text-red-700">Application submissions are currently closed by the administrator.</p>
          ) : (
            <p className="mt-2 text-sm text-slate-700">
              {submissionsBlocked
                ? `Deadline has passed (${deadlineDate?.toLocaleString()}). New submissions are blocked.`
                : `Deadline: ${deadlineDate?.toLocaleString()} (${formatCountdown()} remaining)`}
            </p>
          )}
        </div>
      )}

      {existingApplication?.status === 'INCOMPLETE' && existingApplication.adminRemarks && (
        <div className="portal-surface mb-6 border-l-4 border-amber-300 bg-amber-50 p-5">
          <p className="portal-kicker text-amber-800">Admin Remarks</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{existingApplication.adminRemarks}</p>
        </div>
      )}

      <div className="portal-surface mb-6 p-5">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-brand-primary' : 'text-slate-400'}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  i < step ? 'border-brand-teal bg-brand-teal text-white' :
                  i === step ? 'border-brand-primary bg-brand-primary text-white' :
                  'border-slate-300 bg-white text-slate-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`hidden text-sm font-medium sm:block ${i === step ? 'text-brand-primary' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? 'bg-brand-teal' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="portal-surface p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Personal Information</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
              <input className={inputClass('fullName')} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Juan dela Cruz" />
              {err('fullName')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Age <span className="text-red-500">*</span></label>
                <input type="number" className={inputClass('age')} value={form.age} onChange={e => set('age', e.target.value)} placeholder="20" min="15" max="40" />
                {err('age')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number <span className="text-red-500">*</span></label>
                <input className={inputClass('contact')} value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="09XX XXX XXXX" />
                {err('contact')}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Complete Address <span className="text-red-500">*</span></label>
              <textarea className={inputClass('address')} rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Barangay, City, Province" />
              {err('address')}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">School / University <span className="text-red-500">*</span></label>
              <input className={inputClass('school')} value={form.school} onChange={e => set('school', e.target.value)} placeholder="University of the Philippines" />
              {err('school')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Course / Program <span className="text-red-500">*</span></label>
                <input className={inputClass('course')} value={form.course} onChange={e => set('course', e.target.value)} placeholder="Bachelor of Science in CS" />
                {err('course')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Year Level <span className="text-red-500">*</span></label>
                <select className={inputClass('yearLevel')} value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)}>
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                {err('yearLevel')}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Academic Records</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">General Weighted Average (GWA) <span className="text-red-500">*</span></label>
              <input type="number" className={inputClass('gwa')} value={form.gwa} onChange={e => set('gwa', e.target.value)} placeholder="e.g. 1.50" step="0.01" min="1.00" max="5.00" />
              <p className="mt-1 text-xs text-slate-500">Enter on a 1.0-5.0 scale (1.0 = Excellent)</p>
              {err('gwa')}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Academic Achievements (Optional)</label>
              <textarea className="portal-input" rows={4} value={form.achievements} onChange={e => set('achievements', e.target.value)} placeholder="List honors, awards, academic distinctions, leadership roles..." />
            </div>
            <div className="portal-panel p-4 text-sm leading-7 text-slate-600">
              <strong className="text-brand-primary">GWA Requirement:</strong> Applicants must have a minimum GWA of 2.0 (85% equivalent) to qualify for eligibility screening.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Upload Requirements</h2>
            <div className="portal-panel p-4">
              <p className="mb-2 text-sm font-semibold text-brand-primary">Required Documents</p>
              <ul className="flex flex-col gap-1">
                {REQUIRED_DOCS.map(d => <li key={d} className="text-xs leading-6 text-slate-600">• {d}</li>)}
              </ul>
            </div>

            <div {...getRootProps()} className={`rounded-md border-2 border-dashed p-8 text-center transition-all ${isDragActive ? 'border-brand-teal bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-brand-teal hover:bg-white'}`}>
              <input {...getInputProps()} />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
                <UploadIcon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-medium text-brand-primary">{isDragActive ? 'Drop files here...' : 'Drag and drop files, or click to browse'}</p>
              <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG • Max 5MB per file</p>
            </div>

            {err('files')}

            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-700">{files.length} file(s) selected:</p>
                {files.map((f, i) => (
                  <div key={i} className="portal-panel flex items-center justify-between px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DocumentIcon className="h-4 w-4 text-brand-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">{f.name}</p>
                        <p className="text-xs text-slate-500">{(f.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Review and Submit</h2>
            <div className="portal-panel p-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">PERSONAL INFORMATION</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {[['Full Name', form.fullName], ['Age', form.age], ['Contact', form.contact], ['Year Level', form.yearLevel ? `Year ${form.yearLevel}` : '']].map(([l, v]) => (
                    <div key={l}><span className="text-slate-500">{l}:</span> <span className="font-medium text-brand-primary">{v}</span></div>
                  ))}
                  <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium text-brand-primary">{form.address}</span></div>
                </div>
              </div>
              <hr className="my-4 border-slate-200" />
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">ACADEMIC</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {[['School', form.school], ['Course', form.course], ['GWA', form.gwa]].map(([l, v]) => (
                    <div key={l}><span className="text-slate-500">{l}:</span> <span className="font-medium text-brand-primary">{v}</span></div>
                  ))}
                </div>
              </div>
              <hr className="my-4 border-slate-200" />
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">DOCUMENTS ({files.length} files)</p>
                {files.map((f, i) => <p key={i} className="text-sm text-slate-700">• {f.name}</p>)}
              </div>
            </div>

            <div className="portal-panel p-4 text-sm leading-7 text-slate-600">
              <strong className="text-brand-primary">Important:</strong> By submitting, you confirm that all information is true and accurate. Falsification of any document is grounds for immediate disqualification.
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <button onClick={back} disabled={step === 0} className="portal-button-secondary disabled:opacity-40">Back</button>
          {step < 3 ? (
            <button onClick={next} disabled={!canEditForm} className="portal-button-primary disabled:opacity-40">
              Next
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !canEditForm} className="portal-button-primary disabled:opacity-40">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {loading ? (existingApplication?.status === 'INCOMPLETE' ? 'Resubmitting...' : 'Submitting...') : !canEditForm ? 'Submissions Closed' : (existingApplication?.status === 'INCOMPLETE' ? 'Resubmit Application' : 'Submit Application')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
