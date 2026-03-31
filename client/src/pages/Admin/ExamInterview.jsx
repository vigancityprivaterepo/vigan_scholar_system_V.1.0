import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { ArrowRightIcon, CalendarIcon, ChartIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

export default function ExamInterview() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [scheduleForm, setScheduleForm] = useState({})
  const [scoreForm, setScoreForm] = useState({})
  const [acting, setActing] = useState({})

  const fetchData = () => {
    adminService.listApplications({ status: 'EXAM_INTERVIEW', limit: 50 })
      .then(r => setApps(r.data.applications))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const scheduleExam = async (id) => {
    const form = scheduleForm[id] || {}
    if (!form.scheduledAt) { toast.error('Please select a date/time'); return }
    setActing(a => ({ ...a, [`sched_${id}`]: true }))
    try {
      await adminService.scheduleExam(id, {
        scheduledAt: form.scheduledAt,
        location: form.location || '',
        type: form.type || 'BOTH',
      })
      toast.success('Exam/interview scheduled.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActing(a => ({ ...a, [`sched_${id}`]: false }))
    }
  }

  const markResult = async (id, passed) => {
    const form = scoreForm[id] || {}
    setActing(a => ({ ...a, [`result_${id}`]: true }))
    try {
      await adminService.updateStatus(id, {
        status: passed ? 'APPROVED' : 'FAILED_EXAM',
        examScore: form.score ? parseFloat(form.score) : undefined,
        rejectionReason: !passed ? (form.notes || 'Did not pass the exam/interview.') : undefined,
        interviewNotes: form.notes || undefined,
      })
      toast.success(passed ? 'Marked as passed and approved.' : 'Marked as failed.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setActing(a => ({ ...a, [`result_${id}`]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">Assessment Stage</p>
        <h1 className="portal-page-title mt-2">Exam / Interview</h1>
        <p className="portal-page-subtitle">{apps.length} applicants at this stage</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-36 animate-pulse bg-gray-100" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-xl font-bold text-brand-primary">No applicants at this stage</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {apps.map(app => {
            const sf = scheduleForm[app.id] || {}
            const scf = scoreForm[app.id] || {}
            return (
              <div key={app.id} className="portal-surface p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                    <p className="text-xs text-slate-500">{app.school} • GWA: <span className="font-mono font-bold">{app.gwa ? parseFloat(app.gwa).toFixed(2) : '-'}</span></p>
                  </div>
                  <Link to={`/admin/applicants/${app.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                    View <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="portal-panel p-4">
                    <div className="mb-3 flex items-center gap-2 text-brand-primary">
                      <CalendarIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">Schedule Exam/Interview</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input type="datetime-local" className="portal-input text-sm" value={sf.scheduledAt || ''} onChange={e => setScheduleForm(f => ({ ...f, [app.id]: { ...sf, scheduledAt: e.target.value } }))} />
                      <input className="portal-input text-sm" placeholder="Location (optional)" value={sf.location || ''} onChange={e => setScheduleForm(f => ({ ...f, [app.id]: { ...sf, location: e.target.value } }))} />
                      <select className="portal-input text-sm" value={sf.type || 'BOTH'} onChange={e => setScheduleForm(f => ({ ...f, [app.id]: { ...sf, type: e.target.value } }))}>
                        <option value="EXAM">Exam only</option>
                        <option value="INTERVIEW">Interview only</option>
                        <option value="BOTH">Exam + Interview</option>
                      </select>
                      <button onClick={() => scheduleExam(app.id)} disabled={acting[`sched_${app.id}`]} className="portal-button-primary text-xs">
                        Send Schedule
                      </button>
                    </div>
                  </div>

                  <div className="portal-panel p-4">
                    <div className="mb-3 flex items-center gap-2 text-brand-primary">
                      <ChartIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">Record Result</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input type="number" className="portal-input text-sm" placeholder="Exam Score (e.g. 87.5)" value={scf.score || ''} onChange={e => setScoreForm(f => ({ ...f, [app.id]: { ...scf, score: e.target.value } }))} />
                      <textarea className="portal-input text-sm" rows={2} placeholder="Interview notes (optional)" value={scf.notes || ''} onChange={e => setScoreForm(f => ({ ...f, [app.id]: { ...scf, notes: e.target.value } }))} />
                      <div className="flex gap-2">
                        <button onClick={() => markResult(app.id, true)} disabled={acting[`result_${app.id}`]} className="portal-button-primary flex-1 text-xs">
                          Pass
                        </button>
                        <button onClick={() => markResult(app.id, false)} disabled={acting[`result_${app.id}`]} className="portal-button-secondary flex-1 !border-red-300 text-xs !text-red-700 hover:!border-red-500 hover:!text-red-800">
                          <AlertTriangleIcon className="h-4 w-4" />
                          Fail
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
