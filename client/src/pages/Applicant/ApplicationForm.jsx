import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { applicationService } from '../../services/applicationService'
import api from '../../services/api'
import { UploadIcon, DocumentIcon, XIcon, ArrowRightIcon } from '../../components/ui/PortalIcons'

const STEPS = ['Personal Info', 'Family Info', 'Academic', 'Documents', 'Review']

const REQUIRED_DOCS = [
  'Personal Letter of Application addressed to City Mayor',
  'Certificate of Residency from the Punong Barangay (certifying that the applicant is a bonafide resident of the barangay for at least one (1) year and has no derogatory records)',
  'Form 138 (General Average of at least 83% and no grade lower than 80% for the 1st and 2nd Semester)',
  'Certification from High School Principal that the applicant is eligible for college education and of Good Moral Character',
  'Result of College Admission Test (CAT)',
  'Picture (Passport Size with Printed Name)',
  'Affidavit executed by one of the applicant\'s parents or legal guardian that their combined annual income is less than Eighty Four Thousand Two Hundred Four Pesos (P 84,204.00) and they do not have any real estate property with fair value of not more than Two Hundred Fifty Thousand Pesos (P 250,000.00)',
]

const INCOME_SOURCES = ['Salary', 'Pension', 'Business', 'Government Grants', 'Others']
const GENDER_OPTIONS = ['Cis Gender/Straight', 'Lesbian', 'Gay', 'Bisexual', 'Transgender', 'Prefer not to Say']

const VIGAN_BARANGAYS = [
  'Ayusan Norte', 'Ayusan Sur',
  'Barangay I (Pob.)', 'Barangay II (Pob.)', 'Barangay III (Pob.)',
  'Barangay IV (Pob.)', 'Barangay V (Pob.)', 'Barangay VI (Pob.)',
  'Barangay VII (Pob.)', 'Barangay VIII (Pob.)', 'Barangay IX (Pob.)',
  'Barriocanao', 'Bical Norte', 'Bical Sur', 'Bongtolan', 'Bulala',
  'Cabalangegan', 'Cabaroan Daya', 'Cabaroan Laud', 'Camangaan',
  'Capangpangan', 'Cristina', 'Dapdap', 'Florentina', 'GG-Farolan',
  'Iloilo', 'Indiego', 'Iraray', 'Iyac', 'Josefina', 'Lacub',
  'Laguit Centro', 'Laguit Padpad', 'Lantiplang', 'Magsaysay',
  'Mindoro', 'Nagsangalan', 'Paoa', 'Pantay Daya', 'Pantay Fatima',
  'Pantay Laud', 'Pariok', 'Payao', 'Paypayno', 'Plaridel', 'Pong-ol',
  'Purok-a-Barriocanao', 'Raggac', 'Rugsuanan', 'Salindeg', 'San Jose',
  'San Julian Norte', 'San Julian Sur', 'San Pedro', 'Santa Catalina',
  'Santo Tomas', 'Tamag',
]

const BLANK_PREFS = [
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
  { name: '', location: '', course: '', accepted: '' },
]

const SAVED_KEY = 'scholarship_form_draft_v2'

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
  school: '', schoolAddress: '', yearGraduated: '', generalAverage: '',
  collegePreferences: BLANK_PREFS,
  priorScholarship: '', scholarshipType: '',
}

export default function ApplicationForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [docSlots, setDocSlots] = useState(Array(REQUIRED_DOCS.length).fill(null))
  const [docSubStep, setDocSubStep] = useState(0)
  const [serverSlots, setServerSlots] = useState(Array(REQUIRED_DOCS.length).fill(null))
  const [existingApplication, setExistingApplication] = useState(null)
  const [checkingApplication, setCheckingApplication] = useState(true)
  const [settings, setSettings] = useState({ applicationOpen: true, applicationDeadline: null })
  const [countdownNow, setCountdownNow] = useState(Date.now())
  const [qualityWarnings, setQualityWarnings] = useState([])
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      return saved ? { ...INITIAL_FORM, ...JSON.parse(saved) } : INITIAL_FORM
    } catch {
      return INITIAL_FORM
    }
  })
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
            school: application.school || '',
            schoolAddress: application.schoolAddress || '',
            yearGraduated: application.yearGraduated?.toString() || '',
            generalAverage: application.generalAverage?.toString() || '',
            collegePreferences: application.collegePreferences || BLANK_PREFS,
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
        })
      })
      .catch(() => setSettings({ applicationOpen: true, applicationDeadline: null }))
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

  const isSlotFilled = (i) => docSlots[i] !== null || serverSlots[i] !== null

  const nextDocSlot = () => {
    if (!isSlotFilled(docSubStep)) {
      setErrors(e => ({ ...e, files: 'Please upload this document before continuing.' }))
      return
    }
    setErrors(e => { const n = { ...e }; delete n.files; return n })
    if (docSubStep < REQUIRED_DOCS.length - 1) setDocSubStep(s => s + 1)
  }

  const prevDocSlot = () => {
    setErrors(e => { const n = { ...e }; delete n.files; return n })
    if (docSubStep > 0) setDocSubStep(s => s - 1)
  }

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

  const onDrop = useCallback(async (acceptedFiles) => {
    const [picked] = acceptedFiles
    if (!picked) return
    if (picked.size > 5 * 1024 * 1024) { toast.error('File exceeds 5MB limit'); return }
    setDocSlots(prev => { const n = [...prev]; n[docSubStep] = picked; return n })
    const result = await analyzeImageQuality(picked)
    if (result) {
      setQualityWarnings(prev => [{ ...result, slotIndex: docSubStep }, ...prev].slice(0, 12))
      toast.error('Uploaded image may be blurry or low-resolution.')
    }
  }, [docSubStep])

  const deadlineDate = settings.applicationDeadline ? new Date(settings.applicationDeadline) : null
  const hasPassedDeadline = deadlineDate ? countdownNow > deadlineDate.getTime() : false
  const submissionsBlocked = !settings.applicationOpen || hasPassedDeadline
  const canEditForm = !submissionsBlocked

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    multiple: false,
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
      if (!form.school.trim()) e.school = 'Required'
      if (!form.yearGraduated || parseInt(form.yearGraduated) < 2000 || parseInt(form.yearGraduated) > new Date().getFullYear() + 1) e.yearGraduated = 'Enter a valid graduation year'
      const avg = roundToTwoDecimals(form.generalAverage)
      if (!form.generalAverage || isNaN(avg) || avg < 75 || avg > 100) e.generalAverage = 'General average must be between 75 and 100'
      const hasOnePref = form.collegePreferences.some(p => p.name.trim())
      if (!hasOnePref) e.collegePreferences = 'Please list at least one college preference'
      if (!form.priorScholarship) e.priorScholarship = 'Required'
      if (form.priorScholarship === 'true' && !form.scholarshipType) e.scholarshipType = 'Please specify the scholarship type'
    }

    if (step === 3) {
      const allFilled = REQUIRED_DOCS.every((_, i) => isSlotFilled(i))
      if (!allFilled) {
        const firstMissing = REQUIRED_DOCS.findIndex((_, i) => !isSlotFilled(i))
        setDocSubStep(firstMissing)
        e.files = `Document ${firstMissing + 1} of ${REQUIRED_DOCS.length} is missing. Please upload it before proceeding.`
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
      fd.append('school', form.school)
      fd.append('schoolAddress', form.schoolAddress)
      fd.append('yearGraduated', form.yearGraduated)
      fd.append('generalAverage', normalizedGeneralAverage?.toFixed(2) || form.generalAverage)
      fd.append('collegePreferences', JSON.stringify(form.collegePreferences.filter(p => p.name.trim())))
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
            {[1, 2, 3].map(item => <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />)}
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

      {/* Step Indicator */}
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

        {/* ── Step 0: Personal Info ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Personal Information</h2>

            {/* Name row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
                <input className={inputClass('lastName')} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="dela Cruz" />
                {err('lastName')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
                <input className={inputClass('firstName')} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Juan" />
                {err('firstName')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Middle Name</label>
                <input className="portal-input" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Santos" />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Barangay <span className="text-red-500">*</span></label>
                <select className={inputClass('barangay')} value={form.barangay} onChange={e => set('barangay', e.target.value)}>
                  <option value="">Select barangay</option>
                  {VIGAN_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {err('barangay')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">House No. / Street</label>
                <input className="portal-input" value={form.streetNo} onChange={e => set('streetNo', e.target.value)} placeholder="e.g. 12 Burgos St." />
              </div>
            </div>
            <div className="portal-panel px-4 py-2 text-xs text-slate-500">
              City / Province is locked to <span className="font-medium text-brand-primary">Vigan City, Ilocos Sur</span>
            </div>

            {/* Place of Birth / Birthdate / Age */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Place of Birth <span className="text-red-500">*</span></label>
                <input className={inputClass('placeOfBirth')} value={form.placeOfBirth} onChange={e => set('placeOfBirth', e.target.value)} placeholder="Vigan City, Ilocos Sur" />
                {err('placeOfBirth')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Birthdate <span className="text-red-500">*</span></label>
                <input type="date" className={inputClass('birthdate')} value={form.birthdate} onChange={e => set('birthdate', e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                {err('birthdate')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
                <input type="number" className="portal-input bg-slate-50" value={form.age} readOnly placeholder="Auto-calculated" />
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Gender <span className="text-red-500">*</span></label>
                <select className={inputClass('gender')} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select gender identity</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {err('gender')}
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact No. <span className="text-red-500">*</span></label>
              <input className={inputClass('contact')} value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="09XX XXX XXXX" />
              {err('contact')}
            </div>
          </div>
        )}

        {/* ── Step 1: Family Info ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Family Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name of Father <span className="text-red-500">*</span></label>
                <input className={inputClass('fatherName')} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="Full name" />
                {err('fatherName')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
                <input className="portal-input" value={form.fatherOccupation} onChange={e => set('fatherOccupation', e.target.value)} placeholder="e.g. Farmer, OFW" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name of Mother <span className="text-red-500">*</span></label>
                <input className={inputClass('motherName')} value={form.motherName} onChange={e => set('motherName', e.target.value)} placeholder="Full name" />
                {err('motherName')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Occupation</label>
                <input className="portal-input" value={form.motherOccupation} onChange={e => set('motherOccupation', e.target.value)} placeholder="e.g. Housewife, Teacher" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">No. of Dependents in the Family <span className="text-red-500">*</span></label>
                <input type="number" min="0" className={inputClass('numDependents')} value={form.numDependents} onChange={e => set('numDependents', e.target.value)} placeholder="e.g. 4" />
                {err('numDependents')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Combined Monthly Family Income (₱) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" className={inputClass('familyIncome')} value={form.familyIncome} onChange={e => set('familyIncome', e.target.value)} placeholder="e.g. 7000" />
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
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Academic Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">School Attended (SHS) <span className="text-red-500">*</span></label>
                <input className={inputClass('school')} value={form.school} onChange={e => set('school', e.target.value)} placeholder="Name of high school" />
                {err('school')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">School Address</label>
                <input className="portal-input" value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} placeholder="City / Municipality, Province" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Year Graduated (SHS) <span className="text-red-500">*</span></label>
                <input type="number" className={inputClass('yearGraduated')} value={form.yearGraduated} onChange={e => set('yearGraduated', e.target.value)} placeholder={String(new Date().getFullYear())} min="2000" max={new Date().getFullYear() + 1} />
                {err('yearGraduated')}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">General Average (SHS) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="75"
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
                <p className="mt-1 text-xs text-slate-500">Minimum of 83% required (no grade lower than 80% per semester)</p>
                {err('generalAverage')}
              </div>
            </div>

            {/* College Preferences Table */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                List of Colleges/Universities in Order of Preference <span className="text-red-500">*</span>
              </label>
              <div className="overflow-x-auto rounded-md border border-slate-200">
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
                          <input className="portal-input !py-1 text-sm" value={pref.name} onChange={e => setPref(i, 'name', e.target.value)} placeholder="e.g. University of the Philippines" />
                        </td>
                        <td className="px-3 py-2">
                          <input className="portal-input !py-1 text-sm" value={pref.location} onChange={e => setPref(i, 'location', e.target.value)} placeholder="City, Province" />
                        </td>
                        <td className="px-3 py-2">
                          <input className="portal-input !py-1 text-sm" value={pref.course} onChange={e => setPref(i, 'course', e.target.value)} placeholder="e.g. BS Computer Science" />
                        </td>
                        <td className="px-3 py-2">
                          <select className="portal-input !py-1 text-sm" value={pref.accepted} onChange={e => setPref(i, 'accepted', e.target.value)}>
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

        {/* ── Step 3: Documents (per-slot) ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Upload Requirements</h2>

            {/* Progress dots + bar */}
            <div>
              <div className="flex items-center gap-1.5">
                {REQUIRED_DOCS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (i < docSubStep || isSlotFilled(i - 1) || i === 0) {
                        setDocSubStep(i)
                        setErrors(e => { const n = { ...e }; delete n.files; return n })
                      }
                    }}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      isSlotFilled(i)
                        ? 'bg-brand-teal'
                        : i === docSubStep
                          ? 'bg-brand-primary ring-2 ring-brand-primary ring-offset-1'
                          : 'bg-slate-300'
                    }`}
                    aria-label={`Document ${i + 1}`}
                  />
                ))}
                <span className="ml-2 text-xs text-slate-500">
                  Document {docSubStep + 1} of {REQUIRED_DOCS.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-teal transition-all duration-300"
                  style={{ width: `${(REQUIRED_DOCS.filter((_, i) => isSlotFilled(i)).length / REQUIRED_DOCS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current document card */}
            <div className="portal-panel rounded-md p-4">
              <p className="portal-kicker">Document {docSubStep + 1} of {REQUIRED_DOCS.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{REQUIRED_DOCS[docSubStep]}</p>
            </div>

            {/* Dropzone — shown when slot is empty or user wants to replace */}
            {!isSlotFilled(docSubStep) || docSlots[docSubStep] === null ? (
              <div {...getRootProps()} className={`rounded-md border-2 border-dashed p-8 text-center transition-all ${isDragActive ? 'border-brand-teal bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-brand-teal hover:bg-white'}`}>
                <input {...getInputProps()} />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
                  <UploadIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-medium text-brand-primary">
                  {isDragActive ? 'Drop file here...' : 'Drag and drop, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG • Max 5MB</p>
              </div>
            ) : null}

            {/* New file uploaded this session */}
            {docSlots[docSubStep] && (
              <div className="portal-panel flex items-center justify-between px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DocumentIcon className="h-4 w-4 text-brand-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{docSlots[docSubStep].name}</p>
                    <p className="text-xs text-slate-500">{(docSlots[docSubStep].size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDocSlots(prev => { const n = [...prev]; n[docSubStep] = null; return n })}
                  className="text-red-500 hover:text-red-700"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Server-prefilled file (INCOMPLETE reload) */}
            {!docSlots[docSubStep] && serverSlots[docSubStep] && (
              <div className="portal-panel flex items-center justify-between border-l-2 border-brand-teal px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <DocumentIcon className="h-4 w-4 text-brand-teal" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{serverSlots[docSubStep].fileName}</p>
                    <p className="text-xs text-brand-teal">Previously submitted — drag a new file above to replace</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quality warning for this slot only */}
            {qualityWarnings.filter(w => w.slotIndex === docSubStep).map((w, idx) => (
              <div key={idx} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {w.fileName}: {w.warnings.join(', ')} ({w.width}×{w.height})
              </div>
            ))}

            {err('files')}

            {/* Sub-step navigation */}
            <div className="flex justify-between border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={prevDocSlot}
                disabled={docSubStep === 0}
                className="portal-button-secondary disabled:opacity-40"
              >
                Previous document
              </button>
              <button
                type="button"
                onClick={nextDocSlot}
                disabled={docSubStep === REQUIRED_DOCS.length - 1}
                className="portal-button-primary disabled:opacity-40"
              >
                Next document
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-brand-primary">Review and Submit</h2>
            <div className="portal-panel divide-y divide-slate-100 p-4">

              <div className="pb-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Personal Information</p>
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
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Family Information</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-500">Father:</span> <span className="font-medium text-brand-primary">{form.fatherName}{form.fatherOccupation && ` (${form.fatherOccupation})`}</span></div>
                  <div><span className="text-slate-500">Mother:</span> <span className="font-medium text-brand-primary">{form.motherName}{form.motherOccupation && ` (${form.motherOccupation})`}</span></div>
                  <div><span className="text-slate-500">No. of Dependents:</span> <span className="font-medium text-brand-primary">{form.numDependents}</span></div>
                  <div><span className="text-slate-500">Monthly Family Income:</span> <span className="font-medium text-brand-primary">₱{parseFloat(form.familyIncome || 0).toLocaleString()}</span></div>
                  <div className="sm:col-span-2"><span className="text-slate-500">Income Source:</span> <span className="font-medium text-brand-primary">{form.incomeSource === 'Others' ? `Others - ${form.incomeSourceOther}` : form.incomeSource}</span></div>
                </div>
              </div>

              <div className="py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Academic Information</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-500">SHS Attended:</span> <span className="font-medium text-brand-primary">{form.school}</span></div>
                  {form.schoolAddress && <div><span className="text-slate-500">School Address:</span> <span className="font-medium text-brand-primary">{form.schoolAddress}</span></div>}
                  <div><span className="text-slate-500">Year Graduated:</span> <span className="font-medium text-brand-primary">{form.yearGraduated}</span></div>
                  <div><span className="text-slate-500">General Average:</span> <span className="font-medium text-brand-primary">{form.generalAverage}%</span></div>
                  <div><span className="text-slate-500">Prior Scholarship:</span> <span className="font-medium text-brand-primary">{form.priorScholarship === 'true' ? `Yes (${form.scholarshipType})` : 'No'}</span></div>
                </div>
                <p className="mb-1 mt-3 text-xs font-medium text-slate-500">College Preferences:</p>
                {form.collegePreferences.filter(p => p.name.trim()).map((p, i) => (
                  <p key={i} className="text-sm text-slate-700">{i + 1}. {p.name}{p.location && `, ${p.location}`} — {p.course}{p.accepted && ` [Accepted: ${p.accepted}]`}</p>
                ))}
              </div>

              <div className="pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
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

            <div className="portal-panel p-4 text-sm leading-7 text-slate-600">
              <p className="font-semibold text-brand-primary">Data Privacy Consent</p>
              <p className="mt-1">By submitting this application, you grant consent to the City Government of Vigan to collect, store, process and use the personal and sensitive information provided herein in accordance with the Data Privacy Act of 2012. You also acknowledge that submission of this form does not guarantee the granting or approval of the benefit being applied for.</p>
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
            <button onClick={handleSubmit} disabled={loading || !canEditForm} className="portal-button-primary disabled:opacity-40">
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
