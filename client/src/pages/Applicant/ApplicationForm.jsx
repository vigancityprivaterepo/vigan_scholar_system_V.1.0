import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import api from '../../services/api'
import { UploadIcon, DocumentIcon, XIcon, ArrowRightIcon, ChevronDownIcon, PhotoIcon } from '../../components/ui/PortalIcons'
import { useAuthStore } from '../../store/authStore'
import { readDraft, writeDraft, clearDraft } from '../../utils/applicationDraft'

const STEPS = ['Personal Info', 'Family Info', 'Academic', 'Documents', 'Review']

const REQUIRED_DOCS = [
  'Personal Letter of Application addressed to City Mayor',
  'Certificate of Residency from the Punong Barangay (certifying that the applicant is a bonafide resident of the barangay for at least one (1) year and has no derogatory records)',
  'Form 138 (General Average of at least 83% and no grade lower than 80% for the 1st and 2nd Semester)',
  'Certification from High School Principal that the applicant is eligible for college education and of Good Moral Character',
  'Result of College Admission Test (CAT)',
  'Picture (Passport Size with Printed Name)',
]

const INCOME_SOURCES = ['Salary', 'Pension', 'Business', 'Government Grants', 'Others']

const SCHOOLS = [
  'Ilocos Sur National High School',
  'Vigan National High School East',
  'Vigan National High School West',
  'STI College Vigan',
  'University of Northern Philippines - Laboratory School',
  'Divine World College of Vigan',
  'Saint Paul College of Vigan',
  'Lyceum de Ylocos',
  'Data Center Vigan',
  'Immaculate Conception Minor Seminary Vigan',
  'Alternative Learning System',
  'Others',
]
const GENDER_OPTIONS = ['Cis Gender/Straight', 'Lesbian', 'Gay', 'Bisexual', 'Transgender', 'Prefer not to Say']

const VIGAN_BARANGAYS = [
  'Ayusan Norte',
  'Ayusan Sur',
  'Barangay I (Poblacion)',
  'Barangay II (Poblacion)',
  'Barangay III (Poblacion)',
  'Barangay IV (Poblacion)',
  'Barangay V (Poblacion)',
  'Barangay VI (Poblacion)',
  'Barangay VII (Poblacion)',
  'Barangay VIII (Poblacion)',
  'Barangay IX (Poblacion)',
  'Barraca',
  'Beddeng Daya',
  'Beddeng Laud',
  'Bongtolan',
  'Bulala',
  'Cabalangegan',
  'Cabaroan Daya',
  'Cabaroan Laud',
  'Camangaan',
  'Capangpangan',
  'Mindoro',
  'Nagsangalan',
  'Pantay Daya',
  'Pantay Fatima',
  'Pantay Laud',
  'Paoa',
  'Paratong',
  'Pong-ol',
  'Purok-a-bassit',
  'Purok-a-dakkel',
  'Raois',
  'Rugsuanan',
  'Salindeg',
  'San Jose',
  'San Julian Norte',
  'San Julian Sur',
  'San Pedro',
  'Tamag',
]

const BLANK_PREFS = [
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
]


const roundToTwoDecimals = (value) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

const INITIAL_FORM = {
  // Personal
  lastName: '', firstName: '', middleName: '',
  barangay: '', streetNo: '', placeOfBirth: '', birthdate: '', age: '',
  sex: '', gender: '', contact: '',
  // Family
  fatherName: '', fatherOccupation: '',
  motherName: '', motherOccupation: '',
  numDependents: '', familyIncome: '',
  incomeSource: '', incomeSourceOther: '',
  // Academic
  school: '', schoolOther: '', schoolAddress: '', yearGraduated: '', generalAverage: '',
  collegePreferences: BLANK_PREFS,
  yearLevel: '',
  soloParent: '', fourPs: '',
  priorScholarship: '', scholarshipType: '',
}

export default function ApplicationForm() {
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.user?.id)
  // Draft saved on this device for this account (typed answers only, never files).
  const [initialDraft] = useState(() => readDraft(userId))
  const [step, setStep] = useState(() => Math.min(Math.max(Number(initialDraft?.step) || 0, 0), STEPS.length - 1))
  const [saveState, setSaveState] = useState('idle')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const firstSave = useRef(true)
  const [loading, setLoading] = useState(false)
  const [docSlots, setDocSlots] = useState(Array(REQUIRED_DOCS.length).fill(null))
  const [serverSlots, setServerSlots] = useState(Array(REQUIRED_DOCS.length).fill(null))
  const [existingApplication, setExistingApplication] = useState(null)
  const [checkingApplication, setCheckingApplication] = useState(true)
  const [settings, setSettings] = useState({ applicationOpen: true, applicationDeadline: null, gwaThreshold: 83 })
  const [countdownNow, setCountdownNow] = useState(Date.now())
  const [qualityWarnings, setQualityWarnings] = useState([])
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false)
  const schoolDropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target)) {
        setSchoolDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const [form, setForm] = useState(() => (initialDraft?.form ? { ...INITIAL_FORM, ...initialDraft.form } : INITIAL_FORM))
  const [errors, setErrors] = useState({})

  // Auto-calculate age from birthdate
  useEffect(() => {
    if (!form.birthdate) return
    const birth = new Date(form.birthdate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    if (age >= 0) setForm(f => ({ ...f, age: String(age) }))
  }, [form.birthdate])

  useEffect(() => {
    applicationService.getMine()
      .then(r => {
        const application = r.data.application
        if (!application) return

        if (application.status === 'INCOMPLETE') {
          setExistingApplication(application)
          // Try to parse stored address back into barangay + streetNo
          const storedAddress = application.address || ''
          const matchedBrgy = VIGAN_BARANGAYS.find(b => storedAddress.includes(b)) || ''
          const streetPart = matchedBrgy
            ? storedAddress.replace(matchedBrgy, '').replace(/^,\s*/, '').replace(/,\s*Vigan City.*$/i, '').trim()
            : storedAddress

          setForm(current => ({
            ...current,
            lastName: application.lastName || '',
            firstName: application.firstName || '',
            middleName: application.middleName || '',
            barangay: matchedBrgy,
            streetNo: streetPart,
            placeOfBirth: application.placeOfBirth || '',
            birthdate: application.birthdate ? application.birthdate.slice(0, 10) : '',
            age: application.age?.toString() || '',
            sex: application.sex || '',
            gender: application.gender || '',
            contact: application.contact || '',
            fatherName: application.fatherName || '',
            fatherOccupation: application.fatherOccupation || '',
            motherName: application.motherName || '',
            motherOccupation: application.motherOccupation || '',
            numDependents: application.numDependents?.toString() || '',
            familyIncome: application.familyIncome?.toString() || '',
            incomeSource: application.incomeSource || '',
            school: SCHOOLS.includes(application.school) ? application.school : (application.school ? 'Others' : ''),
            schoolOther: SCHOOLS.includes(application.school) ? '' : (application.school || ''),
            schoolAddress: application.schoolAddress || '',
            yearGraduated: application.yearGraduated?.toString() || '',
            generalAverage: application.generalAverage?.toString() || '',
            collegePreferences: application.collegePreferences || BLANK_PREFS,
            yearLevel: application.yearLevel || '',
            soloParent: application.soloParent === true ? 'true' : application.soloParent === false ? 'false' : '',
            fourPs: application.fourPs === true ? 'true' : application.fourPs === false ? 'false' : '',
            priorScholarship: application.priorScholarship === true ? 'true' : application.priorScholarship === false ? 'false' : '',
            scholarshipType: application.scholarshipType || '',
          }))

          const reqFiles = application.requirementFiles || []
          const prefilled = Array(REQUIRED_DOCS.length).fill(null)
          reqFiles.forEach((rf, i) => {
            if (i < REQUIRED_DOCS.length) prefilled[i] = { fileName: rf.fileName, fileUrl: rf.fileUrl }
          })
          setServerSlots(prefilled)
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
          gwaThreshold: response.data?.settings?.gwaThreshold != null ? Number(response.data.settings.gwaThreshold) : 83,
        })
      })
      .catch(() => setSettings({ applicationOpen: true, applicationDeadline: null, gwaThreshold: 83 }))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCountdownNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Autosave: "Saving…" while typing, "Saved" 800ms after the last change.
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
      return undefined
    }
    if (submitted) return undefined
    setSaveState('saving')
    const timer = setTimeout(() => {
      writeDraft(userId, { form, step })
      setSaveState('saved')
    }, 800)
    return () => clearTimeout(timer)
  }, [form, step, userId, submitted])

  const saveAndExit = () => {
    writeDraft(userId, { form, step })
    toast.success('Saved on this device. Pick up where you left off from your dashboard.')
    navigate('/applicant/dashboard')
  }

  // Inline check for the mobile number as soon as the field loses focus.
  const checkContact = () => {
    const value = form.contact.trim().replace(/\s/g, '')
    setErrors((current) => {
      const next = { ...current }
      if (value && !/^(09|\+639)\d{9}$/.test(value)) next.contact = 'Use 09 followed by 9 digits, e.g. 0917 123 4567'
      else delete next.contact
      return next
    })
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const err = (k) => errors[k] ? <p className="field-error animate-fade-in">{errors[k]}</p> : null

  const isSlotFilled = (i) => docSlots[i] !== null || serverSlots[i] !== null

  const setPref = (index, field, value) => {
    setForm(f => {
      const prefs = [...f.collegePreferences]
      prefs[index] = { ...prefs[index], [field]: value }
      return { ...f, collegePreferences: prefs }
    })
  }

  const analyzeImageQuality = async (file) => {
    if (!file.type.startsWith('image/')) return null
    const imageUrl = URL.createObjectURL(file)
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = imageUrl
      })
      const canvas = document.createElement('canvas')
      const maxDim = 300
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      canvas.width = Math.max(1, Math.floor(img.width * scale))
      canvas.height = Math.max(1, Math.floor(img.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let edgeSum = 0, edgeCount = 0
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const i = (y * canvas.width + x) * 4
          const left = (y * canvas.width + (x - 1)) * 4
          const right = (y * canvas.width + (x + 1)) * 4
          const top = ((y - 1) * canvas.width + x) * 4
          const bottom = ((y + 1) * canvas.width + x) * 4
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
          const gx = Math.abs(gray - (data[left] + data[left + 1] + data[left + 2]) / 3) + Math.abs(gray - (data[right] + data[right + 1] + data[right + 2]) / 3)
          const gy = Math.abs(gray - (data[top] + data[top + 1] + data[top + 2]) / 3) + Math.abs(gray - (data[bottom] + data[bottom + 1] + data[bottom + 2]) / 3)
          edgeSum += gx + gy
          edgeCount++
        }
      }
      const sharpnessScore = edgeCount ? edgeSum / edgeCount : 0
      const warnings = []
      if (img.width < 1000 || img.height < 1000) warnings.push('Low resolution')
      if (sharpnessScore < 20) warnings.push('Potentially blurry')
      if (!warnings.length) return null
      return { fileName: file.name, warnings, width: img.width, height: img.height }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  const setSlotFile = async (index, picked) => {
    if (!picked) return
    if (picked.size > 5 * 1024 * 1024) { toast.error('File exceeds 5MB limit'); return }
    setDocSlots(prev => { const n = [...prev]; n[index] = picked; return n })
    setErrors(current => { const next = { ...current }; delete next.files; return next })
    const result = await analyzeImageQuality(picked)
    if (result) {
      setQualityWarnings(prev => [{ ...result, slotIndex: index }, ...prev.filter(w => w.slotIndex !== index)].slice(0, 12))
      toast.error('Uploaded image may be blurry or low-resolution.')
    }
  }

  const deadlineDate = settings.applicationDeadline ? new Date(settings.applicationDeadline) : null
  const hasPassedDeadline = deadlineDate ? countdownNow > deadlineDate.getTime() : false
  const submissionsBlocked = !settings.applicationOpen || hasPassedDeadline
  const canEditForm = !submissionsBlocked

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
      if (!form.lastName.trim()) e.lastName = 'Required'
      if (!form.firstName.trim()) e.firstName = 'Required'
      if (!form.barangay) e.barangay = 'Please select your barangay'
      if (!form.placeOfBirth.trim()) e.placeOfBirth = 'Required'
      if (!form.birthdate) e.birthdate = 'Required'
      if (!form.sex) e.sex = 'Required'
      if (!form.gender) e.gender = 'Required'
      if (!form.contact.trim()) e.contact = 'Required'
      else if (!/^(09|\+639)\d{9}$/.test(form.contact.trim().replace(/\s/g, ''))) e.contact = 'Enter a valid Philippine number (e.g. 09XX XXX XXXX)'
    }

    if (step === 1) {
      if (!form.fatherName.trim()) e.fatherName = 'Required'
      if (!form.motherName.trim()) e.motherName = 'Required'
      if (form.numDependents === '' || form.numDependents < 0) e.numDependents = 'Enter number of dependents'
      if (!form.familyIncome || parseFloat(form.familyIncome) <= 0) e.familyIncome = 'Enter a valid income amount'
      if (!form.incomeSource) e.incomeSource = 'Required'
      if (form.incomeSource === 'Others' && !form.incomeSourceOther.trim()) e.incomeSourceOther = 'Please specify'
    }

    if (step === 2) {
      if (!form.school) e.school = 'Required'
      if (form.school === 'Others' && !form.schoolOther.trim()) e.schoolOther = 'Please specify your school'
      if (!form.yearGraduated || parseInt(form.yearGraduated) < 2000 || parseInt(form.yearGraduated) > new Date().getFullYear() + 1) e.yearGraduated = 'Enter a valid graduation year'
      const avg = roundToTwoDecimals(form.generalAverage)
      if (!form.generalAverage || isNaN(avg) || avg < settings.gwaThreshold || avg > 100) e.generalAverage = `General average must be at least ${settings.gwaThreshold}% (and no more than 100%)`
      const hasOnePref = form.collegePreferences.some(p => p.name.trim())
      if (!hasOnePref) e.collegePreferences = 'Please list at least one college preference'
      if (!form.yearLevel) e.yearLevel = 'Please select a year level'
      if (!form.soloParent) e.soloParent = 'Required'
      if (!form.fourPs) e.fourPs = 'Required'
      if (!form.priorScholarship) e.priorScholarship = 'Required'
      if (form.priorScholarship === 'true' && !form.scholarshipType) e.scholarshipType = 'Please specify the scholarship type'
    }

    if (step === 3) {
      const allFilled = REQUIRED_DOCS.every((_, i) => isSlotFilled(i))
      if (!allFilled) {
        const missing = REQUIRED_DOCS.filter((_, i) => !isSlotFilled(i)).length
        e.files = `${missing} ${missing === 1 ? 'document is' : 'documents are'} still missing. Add ${missing === 1 ? 'it' : 'them'} before continuing.`
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!canEditForm) { toast.error('Submissions are currently closed.'); return }
    if (validateStep()) setStep(s => s + 1)
  }
  const back = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    if (!canEditForm) { toast.error('Submissions are currently closed.'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      // Personal
      fd.append('lastName', form.lastName)
      fd.append('firstName', form.firstName)
      fd.append('middleName', form.middleName)
      const fullAddress = [form.streetNo?.trim(), form.barangay, 'Vigan City, Ilocos Sur'].filter(Boolean).join(', ')
      fd.append('address', fullAddress)
      fd.append('placeOfBirth', form.placeOfBirth)
      fd.append('birthdate', form.birthdate)
      fd.append('age', form.age)
      fd.append('sex', form.sex)
      fd.append('gender', form.gender)
      fd.append('contact', form.contact)
      // Family
      fd.append('fatherName', form.fatherName)
      fd.append('fatherOccupation', form.fatherOccupation)
      fd.append('motherName', form.motherName)
      fd.append('motherOccupation', form.motherOccupation)
      fd.append('numDependents', form.numDependents)
      fd.append('familyIncome', form.familyIncome)
      fd.append('incomeSource', form.incomeSource === 'Others' ? `Others - ${form.incomeSourceOther}` : form.incomeSource)
      // Academic
      const normalizedGeneralAverage = roundToTwoDecimals(form.generalAverage)
      fd.append('school', form.school === 'Others' ? form.schoolOther : form.school)
      fd.append('schoolAddress', form.schoolAddress)
      fd.append('yearGraduated', form.yearGraduated)
      fd.append('generalAverage', normalizedGeneralAverage?.toFixed(2) || form.generalAverage)
      fd.append('collegePreferences', JSON.stringify(form.collegePreferences.filter(p => p.name.trim())))
      fd.append('yearLevel', form.yearLevel)
      fd.append('soloParent', form.soloParent)
      fd.append('fourPs', form.fourPs)
      fd.append('priorScholarship', form.priorScholarship)
      if (form.priorScholarship === 'true') fd.append('scholarshipType', form.scholarshipType)
      // Files — in slot order (0→6)
      docSlots.forEach(f => { if (f) fd.append('files', f) })

      if (existingApplication?.status === 'INCOMPLETE') {
        await applicationService.resubmit(fd)
        toast.success('Application resubmitted successfully!')
      } else {
        await applicationService.submit(fd)
        toast.success('Application submitted successfully!')
      }
      clearDraft(userId)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (k) => `form-control min-h-[52px] rounded-button px-4 text-[17px] ${errors[k] ? '!border-red-500' : ''}`

  if (checkingApplication) {
    return (
      <div className="w-full">
        <div className="card p-5 sm:p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(item => <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />)}
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-xl animate-pop-in flex-col items-center gap-4 rounded-[20px] bg-white p-8 text-center shadow-card">
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-300" aria-hidden="true" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-teal text-white">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeDasharray="24" strokeDashoffset="24" style={{ animation: 'drawCheck 480ms var(--ease-out) 200ms forwards' }} />
            </svg>
          </span>
        </span>
        <h1 className="font-display text-[28px] font-semibold text-brand-primary">
          {existingApplication?.status === 'INCOMPLETE' ? 'Application resubmitted' : 'Application submitted'}
        </h1>
        <p className="text-base text-slate-600">The Scholarship Office will check your documents. You will get an update here and by email.</p>
        <ol className="w-full text-left text-[15px] text-slate-700">
          {['Document review', 'Eligibility check', 'Exam and interview', 'Result'].map((label, i) => (
            <li key={label} className="flex animate-slide-up items-center gap-3 border-t border-slate-100 py-2.5" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-700">{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => navigate('/applicant/status')} className="btn-cta">Track my application</button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="portal-page-title">
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
          <h2 className={`text-sm font-semibold ${submissionsBlocked ? 'text-red-700' : 'text-blue-800'}`}>Application window</h2>
          {!settings.applicationOpen ? (
            <p className="mt-2 text-sm text-red-700">Application submissions are currently closed by the administrator.</p>
          ) : (
            <p className="mt-2 max-w-[65ch] text-base text-slate-700">
              {submissionsBlocked
                ? `Deadline has passed (${deadlineDate?.toLocaleString()}). New submissions are blocked.`
                : `Deadline: ${deadlineDate?.toLocaleString()} (${formatCountdown()} remaining)`}
            </p>
          )}
        </div>
      )}

      {existingApplication?.status === 'INCOMPLETE' && existingApplication.adminRemarks && (
        <div className="portal-surface mb-6 border-l-4 border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-800">What the office asked you to fix</h2>
          <p className="mt-2 text-base text-slate-700">{existingApplication.adminRemarks}</p>
        </div>
      )}

      {/* Step header */}
      <div className="card mb-6 flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {canEditForm && (
            <button type="button" onClick={saveAndExit} className="press -ml-1 min-h-11 rounded-button px-1 text-[15px] font-semibold text-brand-teal hover:text-brand-dark">
              ← Save &amp; exit
            </button>
          )}
          <span className="flex-1" />
          {canEditForm && (
            <span
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-med ${
                saveState === 'saving' ? 'bg-amber-100 text-amber-800' : saveState === 'saved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span key={saveState} className="h-2 w-2 animate-pop-in rounded-full bg-current" aria-hidden="true" />
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Saves as you type'}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold text-brand-primary">{STEPS[step]}</h2>
          <span className="text-sm tabular-nums text-slate-500">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="grid grid-cols-5 gap-1" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <span
                className="block h-full origin-left bg-brand-teal transition-transform duration-slow ease-spring"
                style={{ transform: `scaleX(${i <= step ? 1 : 0})`, transitionDelay: `${i * 40}ms` }}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="card p-5 sm:p-6">

        {/* ── Step 0: Personal Info ── */}
        {step === 0 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Personal Information</h2>

            {/* Name row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="af-1" className="mb-1 block text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
                <input id="af-1" className={inputClass('lastName')} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
                {err('lastName')}
              </div>
              <div>
                <label htmlFor="af-2" className="mb-1 block text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
                <input id="af-2" className={inputClass('firstName')} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
                {err('firstName')}
              </div>
              <div>
                <label htmlFor="af-3" className="mb-1 block text-sm font-medium text-slate-700">Middle Name</label>
                <input id="af-3" className="form-control min-h-[52px] rounded-button px-4 text-[17px]" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Middle name" />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="af-4" className="mb-1 block text-sm font-medium text-slate-700">Barangay <span className="text-red-500">*</span></label>
                <select id="af-4" className={inputClass('barangay')} value={form.barangay} onChange={e => set('barangay', e.target.value)}>
                  <option value="">Select barangay</option>
                  {VIGAN_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {err('barangay')}
              </div>
              <div>
                <label htmlFor="af-5" className="mb-1 block text-sm font-medium text-slate-700">House No. / Street</label>
                <input id="af-5" className="form-control min-h-[52px] rounded-button px-4 text-[17px]" value={form.streetNo} onChange={e => set('streetNo', e.target.value)} placeholder="e.g. 12 Burgos St." />
              </div>
            </div>
            <div className="portal-panel px-4 py-2 text-xs text-slate-500">
              City / Province is locked to <span className="font-medium text-brand-primary">Vigan City, Ilocos Sur</span>
            </div>

            {/* Place of Birth / Birthdate / Age */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="af-6" className="mb-1 block text-sm font-medium text-slate-700">Place of Birth <span className="text-red-500">*</span></label>
                <input id="af-6" className={inputClass('placeOfBirth')} value={form.placeOfBirth} onChange={e => set('placeOfBirth', e.target.value)} placeholder="Vigan City, Ilocos Sur" />
                {err('placeOfBirth')}
              </div>
              <div>
                <label htmlFor="af-7" className="mb-1 block text-sm font-medium text-slate-700">Birthdate <span className="text-red-500">*</span></label>
                <input id="af-7" type="date" className={inputClass('birthdate')} value={form.birthdate} onChange={e => set('birthdate', e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                {err('birthdate')}
              </div>
              <div>
                <label htmlFor="af-8" className="mb-1 block text-sm font-medium text-slate-700">Age</label>
                <input id="af-8" type="number" className="form-control min-h-[52px] rounded-button px-4 text-[17px] bg-slate-50" value={form.age} readOnly placeholder="Auto-calculated" />
              </div>
            </div>

            {/* Sex / Gender */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sex <span className="text-red-500">*</span></label>
                <div className="flex gap-6">
                  {['Male', 'Female'].map(s => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="sex" value={s} checked={form.sex === s} onChange={() => set('sex', s)} className="accent-brand-primary" />
                      {s}
                    </label>
                  ))}
                </div>
                {err('sex')}
              </div>
              <div>
                <label htmlFor="af-9" className="mb-1 block text-sm font-medium text-slate-700">Gender <span className="text-red-500">*</span></label>
                <select id="af-9" className={inputClass('gender')} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select gender identity</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {err('gender')}
              </div>
            </div>

            {/* Contact */}
            <div>
              <label htmlFor="af-10" className="mb-1 block text-sm font-medium text-slate-700">Contact No. <span className="text-red-500">*</span></label>
              <input id="af-10" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={errors.contact ? 'true' : undefined} className={inputClass('contact')} value={form.contact} onChange={e => set('contact', e.target.value)} onBlur={checkContact} placeholder="09XX XXX XXXX" />
              {err('contact')}
            </div>
          </div>
        )}

        {/* ── Step 1: Family Info ── */}
        {step === 1 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Family Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="af-11" className="mb-1 block text-sm font-medium text-slate-700">Name of Father <span className="text-red-500">*</span></label>
                <input id="af-11" className={inputClass('fatherName')} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="Full name" />
                {err('fatherName')}
              </div>
              <div>
                <label htmlFor="af-12" className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
                <input id="af-12" className="form-control min-h-[52px] rounded-button px-4 text-[17px]" value={form.fatherOccupation} onChange={e => set('fatherOccupation', e.target.value)} placeholder="e.g. Farmer, OFW" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="af-13" className="mb-1 block text-sm font-medium text-slate-700">Name of Mother <span className="text-red-500">*</span></label>
                <input id="af-13" className={inputClass('motherName')} value={form.motherName} onChange={e => set('motherName', e.target.value)} placeholder="Full name" />
                {err('motherName')}
              </div>
              <div>
                <label htmlFor="af-14" className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
                <input id="af-14" className="form-control min-h-[52px] rounded-button px-4 text-[17px]" value={form.motherOccupation} onChange={e => set('motherOccupation', e.target.value)} placeholder="e.g. Housewife, Teacher" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="af-15" className="mb-1 block text-sm font-medium text-slate-700">No. of Dependents in the Family <span className="text-red-500">*</span></label>
                <input id="af-15" type="number" min="0" className={inputClass('numDependents')} value={form.numDependents} onChange={e => set('numDependents', e.target.value)} placeholder="e.g. 4" />
                {err('numDependents')}
              </div>
              <div>
                <label htmlFor="af-16" className="mb-1 block text-sm font-medium text-slate-700">Combined Monthly Family Income (₱) <span className="text-red-500">*</span></label>
                <input id="af-16" type="number" min="0" step="0.01" className={inputClass('familyIncome')} value={form.familyIncome} onChange={e => set('familyIncome', e.target.value)} placeholder="e.g. 7000" />
                {err('familyIncome')}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Main Source of Family Income <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-4">
                {INCOME_SOURCES.map(src => (
                  <label key={src} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="incomeSource" value={src} checked={form.incomeSource === src} onChange={() => set('incomeSource', src)} className="accent-brand-primary" />
                    {src}
                  </label>
                ))}
              </div>
              {err('incomeSource')}
              {form.incomeSource === 'Others' && (
                <div className="mt-2">
                  <input className={inputClass('incomeSourceOther')} value={form.incomeSourceOther} onChange={e => set('incomeSourceOther', e.target.value)} placeholder="Please specify" />
                  {err('incomeSourceOther')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Academic ── */}
        {step === 2 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Academic Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0" ref={schoolDropdownRef}>
                <label className="mb-1 block text-sm font-medium text-slate-700">School Attended (SHS) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    className={`${inputClass('school')} flex w-full items-center justify-between text-left`}
                    onClick={() => setSchoolDropdownOpen(o => !o)}
                  >
                    <span className="truncate">{form.school || <span className="text-slate-500">Select school</span>}</span>
                    <ChevronDownIcon className={`ml-2 h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${schoolDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {schoolDropdownOpen && (
                    <ul className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {SCHOOLS.map(s => (
                        <li key={s}>
                          <button
                            type="button"
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${form.school === s ? 'bg-slate-100 font-medium text-brand-primary' : 'text-slate-700'}`}
                            onClick={() => { set('school', s); if (s !== 'Others') set('schoolOther', ''); setSchoolDropdownOpen(false) }}
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {err('school')}
                {form.school === 'Others' && (
                  <div className="mt-2">
                    <label htmlFor="af-17" className="mb-1 block text-sm font-medium text-slate-700">Please specify <span className="text-red-500">*</span></label>
                    <input id="af-17"
                      className={inputClass('schoolOther')}
                      value={form.schoolOther}
                      onChange={e => set('schoolOther', e.target.value)}
                      placeholder="Enter your school name"
                    />
                    {err('schoolOther')}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <label htmlFor="af-18" className="mb-1 block text-sm font-medium text-slate-700">School Address</label>
                <input id="af-18" className="form-control min-h-[52px] rounded-button px-4 text-[17px]" value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} placeholder="City / Municipality, Province" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="af-19" className="mb-1 block text-sm font-medium text-slate-700">Year Graduated (SHS) <span className="text-red-500">*</span></label>
                <input id="af-19" type="number" className={inputClass('yearGraduated')} value={form.yearGraduated} onChange={e => set('yearGraduated', e.target.value)} placeholder={String(new Date().getFullYear())} min="2000" max={new Date().getFullYear() + 1} />
                {err('yearGraduated')}
              </div>
              <div>
                <label htmlFor="af-20" className="mb-1 block text-sm font-medium text-slate-700">General Average (SHS) <span className="text-red-500">*</span></label>
                <input id="af-20"
                  type="number"
                  step="0.01"
                  min={settings.gwaThreshold}
                  max="100"
                  className={inputClass('generalAverage')}
                  value={form.generalAverage}
                  onChange={e => set('generalAverage', e.target.value)}
                  onBlur={() => {
                    const normalized = roundToTwoDecimals(form.generalAverage)
                    if (normalized !== null) set('generalAverage', normalized.toFixed(2))
                  }}
                  onWheel={e => e.currentTarget.blur()}
                  onKeyDown={e => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
                  }}
                  placeholder="e.g. 87.50"
                />
                <p className="mt-1 text-xs text-slate-500">Minimum of {settings.gwaThreshold}% required (no grade lower than 80% per semester)</p>
                {err('generalAverage')}
              </div>
            </div>

            {/* College Preferences Table */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                List of Colleges/Universities in Order of Preference <span className="text-red-500">*</span>
              </label>
              {/* Mobile: stacked cards */}
              <div className="space-y-3 sm:hidden">
                {form.collegePreferences.map((pref, i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-3 space-y-2 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-500">Choice {i + 1}</p>
                    <div>
                      <label htmlFor={`af-21-${i}`} className="mb-1 block text-xs font-medium text-slate-500">Name of School</label>
                      <input id={`af-21-${i}`} className="form-control min-h-[52px] rounded-button px-4 text-[17px] text-sm" value={pref.name} onChange={e => setPref(i, 'name', e.target.value)} placeholder="e.g. University of the Philippines" />
                    </div>
                    <div>
                      <label htmlFor={`af-22-${i}`} className="mb-1 block text-xs font-medium text-slate-500">Location</label>
                      <input id={`af-22-${i}`} className="form-control min-h-[52px] rounded-button px-4 text-[17px] text-sm" value={pref.location} onChange={e => setPref(i, 'location', e.target.value)} placeholder="City, Province" />
                    </div>
                    <div>
                      <label htmlFor={`af-23-${i}`} className="mb-1 block text-xs font-medium text-slate-500">Course of Study</label>
                      <input id={`af-23-${i}`} className="form-control min-h-[52px] rounded-button px-4 text-[17px] text-sm" value={pref.course} onChange={e => setPref(i, 'course', e.target.value)} placeholder="e.g. BS Computer Science" />
                    </div>
                    <div>
                      <label htmlFor={`af-24-${i}`} className="mb-1 block text-xs font-medium text-slate-500">Accepted (Y/N)</label>
                      <select id={`af-24-${i}`} className="form-control min-h-[52px] rounded-button px-4 text-[17px] text-sm" value={pref.accepted} onChange={e => setPref(i, 'accepted', e.target.value)}>
                        <option value=""></option>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Name of School</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Location</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Course of Study</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Accepted (Y/N)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.collegePreferences.map((pref, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2">
                          <input className="form-control min-h-[52px] rounded-button px-4 text-[17px] !py-1 text-sm" value={pref.name} onChange={e => setPref(i, 'name', e.target.value)} placeholder="e.g. University of the Philippines" />
                        </td>
                        <td className="px-3 py-2">
                          <input className="form-control min-h-[52px] rounded-button px-4 text-[17px] !py-1 text-sm" value={pref.location} onChange={e => setPref(i, 'location', e.target.value)} placeholder="City, Province" />
                        </td>
                        <td className="px-3 py-2">
                          <input className="form-control min-h-[52px] rounded-button px-4 text-[17px] !py-1 text-sm" value={pref.course} onChange={e => setPref(i, 'course', e.target.value)} placeholder="e.g. BS Computer Science" />
                        </td>
                        <td className="px-3 py-2">
                          <select className="form-control min-h-[52px] rounded-button px-4 text-[17px] !py-1 text-sm" value={pref.accepted} onChange={e => setPref(i, 'accepted', e.target.value)}>
                            <option value=""></option>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {err('collegePreferences')}
            </div>

            {/* Year Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Year Level Applying For <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(level => (
                  <label key={level} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="yearLevel"
                      value={level}
                      checked={form.yearLevel === level}
                      onChange={() => set('yearLevel', level)}
                      className="accent-brand-primary"
                    />
                    {level}
                  </label>
                ))}
              </div>
              {err('yearLevel')}
            </div>

            {/* Solo Parent */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Does your Mother/Father a Solo Parent? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {[['true', 'Yes'], ['false', 'No']].map(([val, label]) => (
                  <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="soloParent" value={val} checked={form.soloParent === val} onChange={() => set('soloParent', val)} className="accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
              {err('soloParent')}
            </div>

            {/* 4Ps Membership */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Are you a member of the Pantawid Pamilyang Pilipino Program (4Ps)? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {[['true', 'Yes'], ['false', 'No']].map(([val, label]) => (
                  <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="fourPs" value={val} checked={form.fourPs === val} onChange={() => set('fourPs', val)} className="accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
              {err('fourPs')}
            </div>

            {/* Prior Scholarship */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Have you ever received any scholarship grants from other public/private organization? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {[['true', 'Yes'], ['false', 'No']].map(([val, label]) => (
                  <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="priorScholarship" value={val} checked={form.priorScholarship === val} onChange={() => { set('priorScholarship', val); if (val === 'false') set('scholarshipType', '') }} className="accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
              {err('priorScholarship')}

              {form.priorScholarship === 'true' && (
                <div className="mt-3">
                  <label className="mb-2 block text-sm font-medium text-slate-700">If YES, what specific grant? <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-4">
                    {['Relative', 'Private Individual', 'Private Organization'].map(type => (
                      <label key={type} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="scholarshipType" value={type} checked={form.scholarshipType === type} onChange={() => set('scholarshipType', type)} className="accent-brand-primary" />
                        {type}
                      </label>
                    ))}
                  </div>
                  {err('scholarshipType')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Documents ── */}
        {step === 3 && (
          <div className="animate-slide-up flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-brand-primary">Upload requirements</h2>
            <p className="rounded-[14px] bg-blue-50 px-3.5 py-3 text-sm leading-normal text-blue-900">
              JPG, PNG or PDF, up to 5 MB each. Clear phone photos are fine. Make sure all four corners show.
            </p>

            {REQUIRED_DOCS.map((label, i) => {
              const fresh = docSlots[i]
              const onServer = !fresh && serverSlots[i]
              const filled = Boolean(fresh || onServer)
              const warning = qualityWarnings.find(w => w.slotIndex === i)
              const title = label.split(' (')[0]
              return (
                <div
                  key={label}
                  onDragOver={(e) => { if (canEditForm) e.preventDefault() }}
                  onDrop={(e) => { e.preventDefault(); if (canEditForm) setSlotFile(i, e.dataTransfer.files?.[0]) }}
                  className={`flex flex-col gap-2.5 rounded-2xl border-[1.5px] bg-white p-3.5 transition-colors duration-med ${filled ? 'border-emerald-300' : errors.files ? 'border-red-300' : 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      key={filled ? 'done' : 'empty'}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-button transition-colors duration-med ${filled ? 'animate-pop-in bg-brand-teal text-white' : 'bg-slate-100 text-slate-500'}`}
                      aria-hidden="true"
                    >
                      {filled ? <span className="text-lg font-bold">✓</span> : <DocumentIcon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug text-brand-primary">{title}</p>
                      <p className={`truncate text-sm ${filled ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {fresh ? `${fresh.name} · ${(fresh.size / 1024).toFixed(0)} KB` : onServer ? `Already submitted: ${onServer.fileName}` : label.includes('(') ? label.slice(label.indexOf('(') + 1, -1) : 'Not added yet'}
                      </p>
                    </div>
                    {fresh && (
                      <button
                        type="button"
                        onClick={() => setDocSlots(prev => { const n = [...prev]; n[i] = null; return n })}
                        aria-label={`Remove ${title}`}
                        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-red-600 hover:bg-red-50"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {warning && (
                    <p className="rounded-button border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {warning.warnings.join(', ')} ({warning.width}×{warning.height}). Consider retaking it.
                    </p>
                  )}
                  {!fresh && canEditForm && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="btn min-h-11 cursor-pointer text-[15px]">
                        <PhotoIcon className="h-5 w-5" /> {onServer ? 'Retake' : 'Take photo'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; setSlotFile(i, f) }}
                        />
                      </label>
                      <label className="btn min-h-11 cursor-pointer text-[15px]">
                        <UploadIcon className="h-5 w-5" /> {onServer ? 'Replace' : 'Choose file'}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; setSlotFile(i, f) }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )
            })}

            <p className="text-sm font-semibold text-slate-600" aria-live="polite">
              {REQUIRED_DOCS.filter((_, i) => isSlotFilled(i)).length} of {REQUIRED_DOCS.length} documents added
            </p>
            {err('files')}
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Review and Submit</h2>
            <div className="portal-panel divide-y divide-slate-100 p-4">

              <div className="pb-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Personal Information</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-500">Last Name:</span> <span className="font-medium text-brand-primary">{form.lastName}</span></div>
                  <div><span className="text-slate-500">First Name:</span> <span className="font-medium text-brand-primary">{form.firstName}</span></div>
                  {form.middleName && <div><span className="text-slate-500">Middle Name:</span> <span className="font-medium text-brand-primary">{form.middleName}</span></div>}
                  <div><span className="text-slate-500">Sex:</span> <span className="font-medium text-brand-primary">{form.sex}</span></div>
                  <div><span className="text-slate-500">Gender:</span> <span className="font-medium text-brand-primary">{form.gender}</span></div>
                  <div><span className="text-slate-500">Birthdate:</span> <span className="font-medium text-brand-primary">{form.birthdate}</span></div>
                  <div><span className="text-slate-500">Age:</span> <span className="font-medium text-brand-primary">{form.age}</span></div>
                  <div><span className="text-slate-500">Place of Birth:</span> <span className="font-medium text-brand-primary">{form.placeOfBirth}</span></div>
                  <div><span className="text-slate-500">Contact:</span> <span className="font-medium text-brand-primary">{form.contact}</span></div>
                  <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> <span className="font-medium text-brand-primary">{[form.streetNo?.trim(), form.barangay, 'Vigan City, Ilocos Sur'].filter(Boolean).join(', ')}</span></div>
                </div>
              </div>

              <div className="py-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Family Information</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-500">Father:</span> <span className="font-medium text-brand-primary">{form.fatherName}{form.fatherOccupation && ` (${form.fatherOccupation})`}</span></div>
                  <div><span className="text-slate-500">Mother:</span> <span className="font-medium text-brand-primary">{form.motherName}{form.motherOccupation && ` (${form.motherOccupation})`}</span></div>
                  <div><span className="text-slate-500">No. of Dependents:</span> <span className="font-medium text-brand-primary">{form.numDependents}</span></div>
                  <div><span className="text-slate-500">Monthly Family Income:</span> <span className="font-medium text-brand-primary">₱{parseFloat(form.familyIncome || 0).toLocaleString()}</span></div>
                  <div className="sm:col-span-2"><span className="text-slate-500">Income Source:</span> <span className="font-medium text-brand-primary">{form.incomeSource === 'Others' ? `Others - ${form.incomeSourceOther}` : form.incomeSource}</span></div>
                </div>
              </div>

              <div className="py-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Academic Information</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-500">SHS Attended:</span> <span className="font-medium text-brand-primary">{form.school}</span></div>
                  {form.schoolAddress && <div><span className="text-slate-500">School Address:</span> <span className="font-medium text-brand-primary">{form.schoolAddress}</span></div>}
                  <div><span className="text-slate-500">Year Graduated:</span> <span className="font-medium text-brand-primary">{form.yearGraduated}</span></div>
                  <div><span className="text-slate-500">General Average:</span> <span className="font-medium text-brand-primary">{form.generalAverage}%</span></div>
                  <div><span className="text-slate-500">Year Level Applying For:</span> <span className="font-medium text-brand-primary">{form.yearLevel || '—'}</span></div>
                  <div><span className="text-slate-500">Solo Parent:</span> <span className="font-medium text-brand-primary">{form.soloParent === 'true' ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-slate-500">4Ps Member:</span> <span className="font-medium text-brand-primary">{form.fourPs === 'true' ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-slate-500">Prior Scholarship:</span> <span className="font-medium text-brand-primary">{form.priorScholarship === 'true' ? `Yes (${form.scholarshipType})` : 'No'}</span></div>
                </div>
                <p className="mb-1 mt-3 text-xs font-medium text-slate-500">College Preferences:</p>
                {form.collegePreferences.filter(p => p.name.trim()).map((p, i) => (
                  <p key={i} className="text-sm text-slate-700">{i + 1}. {p.name}{p.location && `, ${p.location}`} · {p.course}{p.accepted && ` [Accepted: ${p.accepted}]`}</p>
                ))}
              </div>

              <div className="pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Documents ({REQUIRED_DOCS.filter((_, i) => isSlotFilled(i)).length} / {REQUIRED_DOCS.length} uploaded)
                </p>
                <div className="flex flex-col gap-2">
                  {REQUIRED_DOCS.map((label, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 text-base leading-none ${isSlotFilled(i) ? 'text-brand-teal' : 'text-red-400'}`}>
                        {isSlotFilled(i) ? '✓' : '✗'}
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">{label.length > 60 ? label.slice(0, 60) + '…' : label}</p>
                        <p className="text-xs font-medium text-slate-700">
                          {docSlots[i] ? docSlots[i].name : serverSlots[i] ? serverSlots[i].fileName : 'Missing'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="portal-panel p-4 text-base text-slate-600">
              <p className="font-semibold text-brand-primary">Data Privacy Consent</p>
              <p className="mt-1">By submitting this application, you grant consent to the City Government of Vigan to collect, store, process and use the personal and sensitive information provided herein in accordance with the Data Privacy Act of 2012. You also acknowledge that submission of this form does not guarantee the granting or approval of the benefit being applied for.</p>
              <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-button border border-brand-line bg-white p-3">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700" />
                <span className="text-[15px] font-semibold text-brand-primary">I have read and agree to the data privacy consent above.</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <button onClick={back} disabled={step === 0} className="portal-button-secondary disabled:opacity-40">Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={!canEditForm} className="portal-button-primary disabled:opacity-40">
              Next
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !canEditForm || !consent} title={!consent ? 'Tick the consent box first' : undefined} className="portal-button-primary disabled:opacity-40">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {loading
                ? (existingApplication?.status === 'INCOMPLETE' ? 'Resubmitting...' : 'Submitting...')
                : !canEditForm
                  ? 'Submissions Closed'
                  : (existingApplication?.status === 'INCOMPLETE' ? 'Resubmit Application' : 'Submit Application')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
