import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { openProtectedFile } from '../../utils/openProtectedFile'
import { STATUS_CONFIG } from '../../utils/statusConfig'
import { ArrowRightIcon, DocumentIcon, AlertTriangleIcon, CheckCircleIcon, SpinnerIcon } from '../../components/ui/PortalIcons'

const CONFIRM_REQUIRED = ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM']
const REQUIREMENT_CHECKLIST_ITEMS = [
  'Personal Letter of Application addressed to City Mayor',
  'Certificate of Residency from the Punong Barangay',
  'Form 138 (General Average at least 83%, no grade lower than 80%)',
  'Certification from High School Principal (Good Moral Character)',
  'Result of College Admission Test (CAT)',
  'Picture (Passport Size with Printed Name)',
]

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
  const [requirementChecklist, setRequirementChecklist] = useState({})
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [hardCopyLoading, setHardCopyLoading] = useState(false)
  const [gwaThreshold, setGwaThreshold] = useState(83)

  useEffect(() => {
    adminService.getApplication(id)
      .then(r => {
        setApp(r.data.application)
        setRequirementChecklist(r.data.application?.requirementChecklist || {})
      })
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    adminService.getSiteSettings()
      .then(r => {
        const threshold = r.data?.settings?.gwaThreshold
        if (threshold != null) setGwaThreshold(Number(threshold))
      })
      .catch(() => {})
  }, [])

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
        requirementChecklist,
        ...extra,
      })
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      const r = await adminService.getApplication(id)
      setApp(r.data.application)
      setRequirementChecklist(r.data.application?.requirementChecklist || {})
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

  const handleHardCopyToggle = async (received) => {
    setHardCopyLoading(true)
    try {
      const r = await adminService.markCorHardCopyReceived(id, received)
      setApp(a => ({ ...a, ...r.data.application }))
      toast.success(received ? 'Marked hard copy received' : 'Reverted hard copy status')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally {
      setHardCopyLoading(false)
    }
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
      { label: 'Reject Application', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    INCOMPLETE: [
      { label: 'Reject (Missing Documents)', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true, hint: 'Use this once the applicant can no longer submit requirements (e.g. deadline passed). This stops further reminder emails.' },
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
    APPROVED: [
      { label: 'Reject (No COR Submitted)', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true, hint: 'Use once the applicant can no longer submit a COR (e.g. deadline passed). Stops further reminder emails.' },
    ],
    COR_SUBMITTED: [
      { label: 'Approve COR to Accept', status: 'ACCEPTED', color: 'portal-button-primary' },
      { label: 'Reject COR', status: 'COR_REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true },
    ],
    COR_REJECTED: [
      { label: 'Reject (No Resubmission)', status: 'REJECTED', color: 'portal-button-secondary !border-red-300 !text-red-700 hover:!border-red-500 hover:!text-red-800', needsReason: true, hint: 'Use once the applicant can no longer resubmit a corrected COR.' },
    ],
  }

  const startEdit = () => {
    setEditData({
      lastName: app.lastName || '',
      firstName: app.firstName || '',
      middleName: app.middleName || '',
      sex: app.sex || '',
      gender: app.gender || '',
      birthdate: app.birthdate ? app.birthdate.slice(0, 10) : '',
      age: app.age?.toString() || '',
      placeOfBirth: app.placeOfBirth || '',
      contact: app.contact || '',
      address: app.address || '',
      fatherName: app.fatherName || '',
      fatherOccupation: app.fatherOccupation || '',
      motherName: app.motherName || '',
      motherOccupation: app.motherOccupation || '',
      numDependents: app.numDependents?.toString() || '',
      familyIncome: app.familyIncome?.toString() || '',
      incomeSource: app.incomeSource || '',
      school: app.school || '',
      schoolAddress: app.schoolAddress || '',
      yearGraduated: app.yearGraduated?.toString() || '',
      generalAverage: app.generalAverage?.toString() || '',
      soloParent: app.soloParent === true ? 'true' : app.soloParent === false ? 'false' : '',
      fourPs: app.fourPs === true ? 'true' : app.fourPs === false ? 'false' : '',
      priorScholarship: app.priorScholarship === true ? 'true' : app.priorScholarship === false ? 'false' : '',
      scholarshipType: app.scholarshipType || '',
      yearLevel: app.yearLevel || '',
      collegePreferences: app.collegePreferences ? JSON.parse(JSON.stringify(app.collegePreferences)) : [],
    })
    setEditMode(true)
  }

  const cancelEdit = () => { setEditMode(false); setEditData({}) }

  const ed = (k, v) => setEditData(d => ({ ...d, [k]: v }))
  const edPref = (i, field, value) => setEditData(d => {
    const prefs = [...(d.collegePreferences || [])]
    prefs[i] = { ...prefs[i], [field]: value }
    return { ...d, collegePreferences: prefs }
  })

  const saveEdit = async () => {
    setEditLoading(true)
    try {
      const payload = { ...editData }
      if (payload.soloParent !== '') payload.soloParent = payload.soloParent === 'true'
      if (payload.fourPs !== '') payload.fourPs = payload.fourPs === 'true'
      if (payload.priorScholarship !== '') payload.priorScholarship = payload.priorScholarship === 'true'
      const res = await adminService.updateApplicationFields(id, payload)
      setApp(a => ({ ...a, ...res.data.application }))
      setEditMode(false)
      setEditData({})
      toast.success('Application updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes')
    } finally {
      setEditLoading(false)
    }
  }

  const availableActions = ACTIONS[app.status] || []
  const latestStatusEntry = (app.activityLogs || []).find((log) => (
    log.toStatus === app.status &&
    log.fromStatus &&
    log.fromStatus !== log.toStatus
  ))
  const previousStatus = latestStatusEntry?.fromStatus || ''
  const previousStatusLabel = previousStatus
    ? (STATUS_CONFIG[previousStatus]?.label || previousStatus.replace(/_/g, ' '))
    : ''
  const rollbackAction = previousStatus
    ? {
        label: `Return to ${previousStatusLabel}`,
        status: previousStatus,
        color: 'portal-button-secondary',
        hint: 'Use this if the current status was selected by mistake.',
      }
    : null
  const visibleActions = rollbackAction ? [...availableActions, rollbackAction] : availableActions
  const TABS = ['personal', 'family', 'academic', 'requirements', 'history']

  const downloadApplication = () => {
    const fullName = app.lastName
      ? `${app.lastName}, ${app.firstName}${app.middleName ? ' ' + app.middleName : ''}`
      : app.applicant?.fullName || ''
    const prefs = (app.collegePreferences || []).map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name || ''}</td>
        <td>${p.location || ''}</td>
        <td>${p.course || ''}</td>
        <td>${p.accepted || ''}</td>
      </tr>`).join('')
    const docs = (app.requirementFiles || []).map(f => `<li>${f.fileName || f.originalName || 'File'}</li>`).join('')
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Application — ${fullName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; padding: 28px 36px; }
  h1 { font-size: 13pt; text-align: center; margin-bottom: 2px; }
  .subtitle { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 18px; }
  .divider { border: none; border-top: 2px solid #065f46; margin: 12px 0; }
  .section-title { font-size: 10pt; font-weight: bold; background: #f0fdf4; border-left: 4px solid #065f46; padding: 4px 8px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 4px; }
  .grid.full { grid-template-columns: 1fr; }
  .field { margin-bottom: 4px; }
  .label { font-size: 8.5pt; color: #555; }
  .value { font-size: 10.5pt; font-weight: 600; border-bottom: 1px solid #ccc; padding-bottom: 1px; min-height: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 6px; }
  th { background: #f0fdf4; border: 1px solid #aaa; padding: 4px 6px; text-align: left; font-size: 9pt; }
  td { border: 1px solid #ccc; padding: 4px 6px; }
  ul { padding-left: 18px; font-size: 10pt; }
  li { margin-bottom: 3px; }
  .status-row { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9.5pt; }
  .footer { margin-top: 30px; font-size: 8.5pt; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { padding: 16px 20px; } }
</style>
</head>
<body>
<h1>City Government of Vigan — Scholarship Application</h1>
<p class="subtitle">Vigan City, Ilocos Sur &nbsp;|&nbsp; Academic Year ${app.academicYear || new Date().getFullYear()}</p>
<hr class="divider"/>

<div class="section-title">Personal Information</div>
<div class="grid">
  <div class="field"><div class="label">Last Name</div><div class="value">${app.lastName || ''}</div></div>
  <div class="field"><div class="label">First Name</div><div class="value">${app.firstName || ''}</div></div>
  <div class="field"><div class="label">Middle Name</div><div class="value">${app.middleName || ''}</div></div>
  <div class="field"><div class="label">Sex</div><div class="value">${app.sex || ''}</div></div>
  <div class="field"><div class="label">Gender</div><div class="value">${app.gender || ''}</div></div>
  <div class="field"><div class="label">Birthdate</div><div class="value">${app.birthdate ? new Date(app.birthdate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div></div>
  <div class="field"><div class="label">Age</div><div class="value">${app.age || ''}</div></div>
  <div class="field"><div class="label">Place of Birth</div><div class="value">${app.placeOfBirth || ''}</div></div>
  <div class="field"><div class="label">Contact</div><div class="value">${app.contact || ''}</div></div>
  <div class="field"><div class="label">Email</div><div class="value">${app.applicant?.email || ''}</div></div>
</div>
<div class="field" style="margin-top:4px"><div class="label">Address</div><div class="value">${app.address || ''}</div></div>

<div class="section-title">Family Information</div>
<div class="grid">
  <div class="field"><div class="label">Name of Father</div><div class="value">${app.fatherName || ''}</div></div>
  <div class="field"><div class="label">Father's Occupation</div><div class="value">${app.fatherOccupation || ''}</div></div>
  <div class="field"><div class="label">Name of Mother</div><div class="value">${app.motherName || ''}</div></div>
  <div class="field"><div class="label">Mother's Occupation</div><div class="value">${app.motherOccupation || ''}</div></div>
  <div class="field"><div class="label">No. of Dependents</div><div class="value">${app.numDependents ?? ''}</div></div>
  <div class="field"><div class="label">Combined Monthly Family Income</div><div class="value">${app.familyIncome ? '₱' + parseFloat(app.familyIncome).toLocaleString() : ''}</div></div>
  <div class="field"><div class="label">Main Source of Income</div><div class="value">${app.incomeSource || ''}</div></div>
</div>

<div class="section-title">Academic Information</div>
<div class="grid">
  <div class="field"><div class="label">School Attended (SHS)</div><div class="value">${app.school || ''}</div></div>
  <div class="field"><div class="label">School Address</div><div class="value">${app.schoolAddress || ''}</div></div>
  <div class="field"><div class="label">Year Graduated (SHS)</div><div class="value">${app.yearGraduated || ''}</div></div>
  <div class="field"><div class="label">General Average (SHS)</div><div class="value">${app.generalAverage ? parseFloat(app.generalAverage).toFixed(2) + '%' : ''}</div></div>
  <div class="field"><div class="label">Year Level Applying For</div><div class="value">${app.yearLevel || ''}</div></div>
  <div class="field"><div class="label">Does Mother/Father a Solo Parent?</div><div class="value">${app.soloParent === true ? 'Yes' : app.soloParent === false ? 'No' : ''}</div></div>
  <div class="field"><div class="label">4Ps Member</div><div class="value">${app.fourPs === true ? 'Yes' : app.fourPs === false ? 'No' : ''}</div></div>
  <div class="field"><div class="label">Prior Scholarship</div><div class="value">${app.priorScholarship === true ? 'Yes — ' + (app.scholarshipType || '') : app.priorScholarship === false ? 'No' : ''}</div></div>
</div>

<div style="margin-top:10px"><strong style="font-size:9.5pt">List of Colleges/Universities in Order of Preference:</strong>
<table>
  <thead><tr><th>#</th><th>Name of School</th><th>Location</th><th>Course of Study</th><th>Accepted (Y/N)</th></tr></thead>
  <tbody>${prefs || '<tr><td colspan="5" style="color:#888;text-align:center">None provided</td></tr>'}</tbody>
</table></div>

<div class="section-title">Uploaded Documents</div>
${docs ? `<ul>${docs}</ul>` : '<p style="font-size:10pt;color:#888">No documents uploaded.</p>'}

<div class="status-row">
  <span>Application ID: <strong>#${app.id.slice(0, 8).toUpperCase()}</strong></span>
  <span>Status: <strong>${app.status?.replace(/_/g, ' ')}</strong></span>
  <span>Submitted: <strong>${app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-PH') : ''}</strong></span>
</div>

<div class="footer">
  City Government of Vigan — Scholarship Management System &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-PH')}
</div>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={() => navigate(-1)} className="portal-button-secondary !px-3 !py-2 text-sm shrink-0">Back</button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-brand-primary sm:text-2xl">
            {app.lastName ? `${app.lastName}, ${app.firstName}${app.middleName ? ' ' + app.middleName : ''}` : app.applicant?.fullName}
          </h1>
          <p className="truncate font-mono text-xs text-slate-500">#{app.id.slice(0, 8).toUpperCase()} • {app.applicant?.email}</p>
        </div>
        <button onClick={downloadApplication} className="portal-button-secondary !px-3 !py-2 text-sm shrink-0">⬇ Download</button>
        {!editMode
          ? <button onClick={startEdit} className="portal-button-primary !px-3 !py-2 text-sm shrink-0">✎ Edit</button>
          : <>
              <button onClick={saveEdit} disabled={editLoading} className="portal-button-primary !px-3 !py-2 text-sm shrink-0">{editLoading ? 'Saving…' : '✔ Save'}</button>
              <button onClick={cancelEdit} className="portal-button-secondary !px-3 !py-2 text-sm shrink-0">✕ Cancel</button>
            </>
        }
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="min-w-0 flex flex-col gap-4">
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
              {editMode ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[['Last Name','lastName'],['First Name','firstName'],['Middle Name','middleName'],['Place of Birth','placeOfBirth'],['Contact','contact'],['Age','age']].map(([l,k]) => (
                    <div key={k}>
                      <p className="mb-1 text-xs font-medium text-slate-500">{l}</p>
                      <input className="portal-input text-sm" value={editData[k] || ''} onChange={e => ed(k, e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Birthdate</p>
                    <input type="date" className="portal-input text-sm" value={editData.birthdate || ''} onChange={e => ed('birthdate', e.target.value)} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Sex</p>
                    <select className="portal-input text-sm" value={editData.sex || ''} onChange={e => ed('sex', e.target.value)}>
                      <option value="">—</option>
                      {['Male','Female'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Gender</p>
                    <select className="portal-input text-sm" value={editData.gender || ''} onChange={e => ed('gender', e.target.value)}>
                      <option value="">—</option>
                      {['Cis Gender/Straight','Lesbian','Gay','Bisexual','Transgender','Prefer not to Say'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">Address</p>
                    <input className="portal-input text-sm" value={editData.address || ''} onChange={e => ed('address', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-3">
                    <p className="text-xs text-slate-400">Email: {app.applicant?.email} (not editable)</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['Last Name', app.lastName], ['First Name', app.firstName], ['Middle Name', app.middleName],
                    ['Sex', app.sex], ['Gender', app.gender], ['Age', app.age],
                    ['Birthdate', app.birthdate ? formatDate(app.birthdate) : null],
                    ['Place of Birth', app.placeOfBirth], ['Contact', app.contact],
                    ['Email', app.applicant?.email], ['Submitted', formatDate(app.submittedAt)],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-medium text-slate-500">{l}</p>
                      <p className="mt-0.5 text-sm font-medium text-brand-primary">{v || '-'}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2 xl:col-span-3">
                    <p className="text-xs font-medium text-slate-500">Address</p>
                    <p className="mt-0.5 text-sm font-medium text-brand-primary">{app.address || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'family' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Family Information</h3>
              {editMode ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[['Name of Father','fatherName'],['Father\'s Occupation','fatherOccupation'],['Name of Mother','motherName'],['Mother\'s Occupation','motherOccupation'],['No. of Dependents','numDependents'],['Monthly Family Income','familyIncome']].map(([l,k]) => (
                    <div key={k}>
                      <p className="mb-1 text-xs font-medium text-slate-500">{l}</p>
                      <input className="portal-input text-sm" value={editData[k] || ''} onChange={e => ed(k, e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Main Source of Income</p>
                    <select className="portal-input text-sm" value={editData.incomeSource || ''} onChange={e => ed('incomeSource', e.target.value)}>
                      <option value="">—</option>
                      {['Salary','Pension','Business','Government Grants','Others'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['Name of Father', app.fatherName], ['Father\'s Occupation', app.fatherOccupation],
                    ['Name of Mother', app.motherName], ['Mother\'s Occupation', app.motherOccupation],
                    ['No. of Dependents', app.numDependents],
                    ['Combined Monthly Income', app.familyIncome ? `₱${parseFloat(app.familyIncome).toLocaleString()}` : null],
                    ['Main Source of Income', app.incomeSource],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-medium text-slate-500">{l}</p>
                      <p className="mt-0.5 text-sm font-medium text-brand-primary">{v ?? '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Academic Information</h3>
              {editMode ? (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[['SHS Attended','school'],['School Address','schoolAddress'],['Year Graduated','yearGraduated'],['General Average','generalAverage']].map(([l,k]) => (
                      <div key={k}>
                        <p className="mb-1 text-xs font-medium text-slate-500">{l}</p>
                        <input className="portal-input text-sm" value={editData[k] || ''} onChange={e => ed(k, e.target.value)} />
                      </div>
                    ))}
                    {[['Solo Parent','soloParent'],['4Ps Member','fourPs'],['Prior Scholarship','priorScholarship']].map(([l,k]) => (
                      <div key={k}>
                        <p className="mb-1 text-xs font-medium text-slate-500">{l}</p>
                        <select className="portal-input text-sm" value={editData[k] || ''} onChange={e => ed(k, e.target.value)}>
                          <option value="">—</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    ))}
                    {editData.priorScholarship === 'true' && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-500">Scholarship Type</p>
                        <select className="portal-input text-sm" value={editData.scholarshipType || ''} onChange={e => ed('scholarshipType', e.target.value)}>
                          <option value="">—</option>
                          {['Relative','Private Individual','Private Organization'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500">Year Level Applying For</p>
                      <select className="portal-input text-sm" value={editData.yearLevel || ''} onChange={e => ed('yearLevel', e.target.value)}>
                        <option value="">—</option>
                        {['1st Year','2nd Year','3rd Year','4th Year'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">College Preferences</p>
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                            <th className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600">School</th>
                            <th className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600">Location</th>
                            <th className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600">Course</th>
                            <th className="border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600">Accepted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editData.collegePreferences || []).map((p, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                              <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                              <td className="px-2 py-1.5"><input className="portal-input !py-1 text-xs" value={p.name || ''} onChange={e => edPref(i,'name',e.target.value)} /></td>
                              <td className="px-2 py-1.5"><input className="portal-input !py-1 text-xs" value={p.location || ''} onChange={e => edPref(i,'location',e.target.value)} /></td>
                              <td className="px-2 py-1.5"><input className="portal-input !py-1 text-xs" value={p.course || ''} onChange={e => edPref(i,'course',e.target.value)} /></td>
                              <td className="px-2 py-1.5">
                                <select className="portal-input !py-1 text-xs" value={p.accepted || ''} onChange={e => edPref(i,'accepted',e.target.value)}>
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
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      ['SHS Attended', app.school], ['School Address', app.schoolAddress],
                      ['Year Graduated (SHS)', app.yearGraduated],
                      ['Year Level Applying For', app.yearLevel],
                      ['Solo Parent', app.soloParent === true ? 'Yes' : app.soloParent === false ? 'No' : null],
                      ['4Ps Member', app.fourPs === true ? 'Yes' : app.fourPs === false ? 'No' : null],
                      ['Prior Scholarship', app.priorScholarship === true ? `Yes — ${app.scholarshipType || 'unspecified'}` : app.priorScholarship === false ? 'No' : null],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p className="text-xs font-medium text-slate-500">{l}</p>
                        <p className="mt-0.5 text-sm font-medium text-brand-primary">{v || '-'}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs font-medium text-slate-500">General Average (SHS)</p>
                      <p className={clsx('mt-0.5 font-mono text-2xl font-bold', app.generalAverage && parseFloat(app.generalAverage) >= gwaThreshold ? 'text-green-600' : 'text-red-500')}>
                        {app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '-'}
                      </p>
                    </div>
                    {app.examScore && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">General Score</p>
                        <p className="mt-0.5 font-mono text-2xl font-bold text-brand-primary">{parseFloat(app.examScore).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  {app.collegePreferences?.length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">College Preferences (in order)</p>
                      <div className="overflow-x-auto rounded-md border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">School</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Location</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Course</th>
                              <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">Accepted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {app.collegePreferences.map((p, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                <td className="px-3 py-2 text-slate-700">{p.name || '-'}</td>
                                <td className="px-3 py-2 text-slate-700">{p.location || '-'}</td>
                                <td className="px-3 py-2 text-slate-700">{p.course || '-'}</td>
                                <td className="px-3 py-2">
                                  <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', p.accepted === 'Y' ? 'bg-green-100 text-green-700' : p.accepted === 'N' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500')}>
                                    {p.accepted || '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="portal-surface p-6">
              <h3 className="mb-4 text-lg font-semibold text-brand-primary">Requirement Files ({app.requirementFiles?.length || 0})</h3>
              <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-brand-primary">Per-Requirement Checklist</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {REQUIREMENT_CHECKLIST_ITEMS.map((item) => {
                    const current = requirementChecklist[item] || { checked: false, notes: '' }
                    return (
                      <label key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(current.checked)}
                          onChange={(e) =>
                            setRequirementChecklist((prev) => ({
                              ...prev,
                              [item]: { ...current, checked: e.target.checked },
                            }))
                          }
                        />
                        <span>{item}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  All items must be checked before moving to Eligibility Screening.
                </p>
              </div>
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

            {visibleActions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-slate-500">No actions available</p>
                <p className="mt-1 text-xs text-slate-400">Status: {app.status.replace(/_/g, ' ')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {app.status === 'EXAM_INTERVIEW' && (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">General Score</label>
                      <input type="number" min="0" max="100" step="0.01" className="portal-input text-sm" placeholder="e.g. 87.50" value={examScore} onChange={e => setExamScore(e.target.value)} />
                    </div>
                  </div>
                )}

                {visibleActions.some(a => a.needsRemarks) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Admin Remarks</label>
                    <textarea className="portal-input" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Explain action to applicant..." />
                  </div>
                )}

                {visibleActions.some(a => a.needsReason) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Rejection Reason</label>
                    <textarea className="portal-input" rows={2} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." />
                  </div>
                )}

                {visibleActions.map(action => {
                  const isCurrentActionLoading = actionLoading && pendingAction?.status === action.status
                  return (
                    <div key={`${action.status}-${action.label}`} className="flex flex-col gap-1">
                      <button
                        onClick={() => requestAction(action)}
                        disabled={actionLoading}
                        className={clsx(action.color || 'portal-button-primary', 'w-full justify-center py-2.5 text-sm flex items-center justify-center gap-2')}
                      >
                        {isCurrentActionLoading && <SpinnerIcon className="h-4 w-4 text-current" />}
                        {isCurrentActionLoading ? 'Processing...' : action.label}
                      </button>
                      {action.hint && <p className="text-xs text-slate-400">{action.hint}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {app.status === 'ACCEPTED' && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-sm font-semibold text-brand-primary">Physical COR Hard Copy</p>
                {app.corHardCopyReceivedAt ? (
                  <>
                    <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                      <CheckCircleIcon className="h-4 w-4" /> Received {formatDateTime(app.corHardCopyReceivedAt)}
                    </p>
                    {app.corHardCopyReceivedBy?.fullName && (
                      <p className="mt-0.5 text-xs text-slate-500">Logged by {app.corHardCopyReceivedBy.fullName}</p>
                    )}
                    <button
                      onClick={() => handleHardCopyToggle(false)}
                      disabled={hardCopyLoading}
                      className="portal-button-secondary mt-2 w-full text-xs"
                    >
                      {hardCopyLoading ? 'Updating...' : 'Undo (mistaken entry)'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-slate-500">Not yet received. Mark this once the applicant brings the original COR to the office in person.</p>
                    <button
                      onClick={() => handleHardCopyToggle(true)}
                      disabled={hardCopyLoading}
                      className="portal-button-primary w-full text-xs"
                    >
                      {hardCopyLoading ? 'Saving...' : 'Mark Hard Copy Received'}
                    </button>
                  </>
                )}
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
                  <button onClick={() => { setShowConfirm(false); setConfirmText('') }} disabled={actionLoading} className="portal-button-secondary flex-1 text-xs">Cancel</button>
                  <button
                    disabled={confirmText !== 'CONFIRM' || actionLoading}
                    onClick={() => doAction(pendingAction.status, pendingAction?.extra || {})}
                    className="portal-button-secondary flex-1 !border-red-300 text-xs !text-red-700 disabled:opacity-40 hover:!border-red-500 hover:!text-red-800 flex items-center justify-center gap-2"
                  >
                    {actionLoading && <SpinnerIcon className="h-4 w-4 text-red-700" />}
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="portal-surface p-6 text-sm">
            <h4 className="mb-3 font-semibold text-brand-primary">Quick Info</h4>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="flex justify-between"><span>Files</span><span className="font-medium">{app.requirementFiles?.length || 0}</span></div>
              <div className="flex justify-between"><span>Gen. Ave. (SHS)</span><span className={clsx('font-mono font-bold', app.generalAverage && parseFloat(app.generalAverage) >= gwaThreshold ? 'text-green-600' : 'text-red-500')}>{app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '-'}</span></div>
              {app.examScore && <div className="flex justify-between"><span>General Score</span><span className="font-mono font-bold">{parseFloat(app.examScore).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Submitted</span><span>{formatDate(app.submittedAt)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
