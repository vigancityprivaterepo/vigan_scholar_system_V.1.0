import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import Pagination from '../../components/shared/Pagination'
import { SearchIcon } from '../../components/ui/PortalIcons'
import { CollapseOut, EmptyQueue } from '../../components/ui/Motion'
import { useUndoableActions } from '../../hooks/useUndoableActions'

const PAGE_SIZE = 20

export default function ExamInterview() {
  const [apps, setApps] = useState([])
  const [examiners, setExaminers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scoreForm, setScoreForm] = useState({})
  const { schedule, isHidden } = useUndoableActions()

  // Bulk scheduling state
  const [selected, setSelected] = useState(new Set())
  const [bulkForm, setBulkForm] = useState({ scheduledAt: '', location: '', type: 'BOTH', examinerId: '' })
  const [bulkActing, setBulkActing] = useState(false)

  const fetchData = useCallback(() => {
    const params = { status: 'EXAM_INTERVIEW', limit: PAGE_SIZE, page }
    if (search.trim()) params.search = search.trim()
    adminService.listApplications(params)
      .then(r => {
        setApps(r.data.applications)
        setPagination(r.data.pagination || { total: 0, pages: 1 })
        setSelected(new Set())
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load applicants.'))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])


  useEffect(() => {
    adminService.listAssignableExaminers()
      .then((res) => setExaminers(res.data.examiners || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load examiners.'))
  }, [])

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(prev => (prev.size === visibleApps.length ? new Set() : new Set(visibleApps.map(a => a.id))))
  }

  const bulkSchedule = async () => {
    if (selected.size === 0) { toast.error('Select at least one applicant.'); return }
    if (!bulkForm.scheduledAt) { toast.error('Please select a date/time for the bulk schedule.'); return }
    if (new Date(bulkForm.scheduledAt) <= new Date()) { toast.error('Scheduled date must be in the future.'); return }
    setBulkActing(true)
    try {
      const res = await adminService.bulkScheduleExam({
        applicationIds: [...selected],
        scheduledAt: bulkForm.scheduledAt,
        location: bulkForm.location || '',
        type: bulkForm.type || 'BOTH',
        examinerId: bulkForm.examinerId || undefined,
      })
      const { scheduled, skipped } = res.data.summary
      toast.success(`Scheduled ${scheduled} applicant${scheduled !== 1 ? 's' : ''}.${skipped > 0 ? ` ${skipped} skipped.` : ''}`)
      setBulkForm({ scheduledAt: '', location: '', type: 'BOTH', examinerId: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk schedule failed.')
    } finally {
      setBulkActing(false)
    }
  }

  const markResult = (app, passed) => {
    const form = scoreForm[app.id] || {}
    const name = app.applicant?.fullName || 'Applicant'
    schedule({
      id: app.id,
      message: passed ? `${name} passed · approved` : `${name} marked as failed`,
      commit: () => adminService.updateStatus(app.id, {
        status: passed ? 'APPROVED' : 'FAILED_EXAM',
        examScore: form.examScore ? parseFloat(form.examScore) : undefined,
        rejectionReason: !passed ? (form.notes || 'Did not pass the exam/interview.') : undefined,
        interviewNotes: form.notes || undefined,
      }),
      onDone: fetchData,
    })
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(app.id)
      return next
    })
  }

  const visibleApps = apps.filter(a => !isHidden(a.id))
  const allSelected = selected.size > 0 && selected.size === visibleApps.length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="portal-page-title">Exam / interview</h1>
        <p className="portal-page-subtitle">{Math.max(0, pagination.total - (apps.length - visibleApps.length))} applicants at this stage</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Search applicants"
            className="form-control pl-10"
            placeholder="Search by name, email, or Ref. ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-36 rounded-card" />)}
        </div>
      ) : apps.length === 0 || (visibleApps.length === 0 && pagination.pages <= 1) ? (
        <EmptyQueue title="No applicants at this stage">Applicants appear here once they are qualified on the Eligibility page.</EmptyQueue>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Bulk Schedule Panel ── */}
          <section className="card flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] font-semibold text-brand-primary">Schedule selected applicants</h2>
              {selected.size > 0 && (
                <span key={selected.size} className="animate-pop-in rounded-full bg-brand-teal px-2.5 py-0.5 text-[13px] font-bold text-white">
                  {selected.size} selected
                </span>
              )}
            </div>

            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <input
                type="datetime-local"
                aria-label="Date and time"
                className="form-control"
                value={bulkForm.scheduledAt}
                onChange={e => setBulkForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
              <input
                aria-label="Location"
                className="form-control"
                placeholder="Location (optional)"
                value={bulkForm.location}
                onChange={e => setBulkForm(f => ({ ...f, location: e.target.value }))}
              />
              <select
                aria-label="Assessment type"
                className="form-control"
                value={bulkForm.type}
                onChange={e => setBulkForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="EXAM">Exam only</option>
                <option value="INTERVIEW">Interview only</option>
                <option value="BOTH">Exam + Interview</option>
              </select>
              <select
                aria-label="Examiner"
                className="form-control"
                value={bulkForm.examinerId}
                onChange={e => setBulkForm(f => ({ ...f, examinerId: e.target.value }))}
              >
                <option value="">No examiner assigned</option>
                {examiners.map(examiner => (
                  <option key={examiner.id} value={examiner.id}>
                    {examiner.fullName} ({examiner.role})
                  </option>
                ))}
              </select>
              <button
                onClick={bulkSchedule}
                disabled={bulkActing || selected.size === 0}
                className="btn btn-primary"
              >
                {bulkActing ? 'Scheduling…' : `Schedule ${selected.size > 0 ? `(${selected.size})` : 'Selected'}`}
              </button>
            </div>

            <p className="text-sm text-slate-500">
              Everyone selected gets the same date, place, type and examiner.
            </p>
          </section>

          {/* ── Select-all bar ── */}
          <div className="flex min-h-[52px] items-center gap-3 rounded-button border border-brand-line bg-emerald-50 px-4 py-2">
            <input
              type="checkbox"
              id="select-all"
              className="h-5 w-5 cursor-pointer accent-emerald-700"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="cursor-pointer text-sm font-semibold text-emerald-800">
              {allSelected ? 'Deselect all on this page' : `Select all ${visibleApps.length} on this page`}
            </label>
            {pagination.pages > 1 && (
              <span className="ml-auto text-sm text-slate-500">Page {page} of {pagination.pages}</span>
            )}
          </div>

          {/* ── Applicant cards ── */}
          {apps.map((app, index) => {
            const scf = scoreForm[app.id] || {}
            const isSelected = selected.has(app.id)
            return (
              <CollapseOut key={app.id} leaving={isHidden(app.id)}>
                <div className="animate-slide-up p-0.5" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className={`card grid items-start gap-4 p-5 transition-[box-shadow,border-color] duration-med md:grid-cols-[44px_minmax(0,1fr)_minmax(300px,1fr)] ${isSelected ? 'border-emerald-500 shadow-[0_0_0_3px_#a7f3d0]' : ''}`}>
                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 cursor-pointer accent-emerald-700"
                        checked={isSelected}
                        onChange={() => toggleSelect(app.id)}
                        aria-label={`Select ${app.applicant?.fullName || 'applicant'} for scheduling`}
                      />
                    </label>
                    <div className="flex min-w-0 flex-col gap-1 pt-1">
                      <p className="text-[17px] font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                      <p className="text-sm text-slate-500">{app.school} · GWA <strong className="tabular-nums text-brand-primary">{app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '—'}</strong></p>
                      <Link to={`/admin/applicants/${app.id}`} className="mt-1 self-start py-1 text-sm font-semibold text-brand-teal hover:text-brand-dark">
                        Open full review →
                      </Link>
                    </div>
                    <div className="flex flex-col gap-2 rounded-[14px] border border-brand-divider bg-brand-bg p-3.5">
                      <h3 className="text-sm font-semibold text-emerald-800">Record result</h3>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          aria-label="General score"
                          className="form-control tabular-nums"
                          placeholder="Score"
                          value={scf.examScore || ''}
                          onChange={e => setScoreForm(f => ({ ...f, [app.id]: { ...scf, examScore: e.target.value } }))}
                        />
                        <input
                          aria-label="Interview notes"
                          className="form-control"
                          placeholder="Interview notes (optional)"
                          value={scf.notes || ''}
                          onChange={e => setScoreForm(f => ({ ...f, [app.id]: { ...scf, notes: e.target.value } }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => markResult(app, true)} className="btn btn-primary">Pass · approve</button>
                        <button type="button" onClick={() => markResult(app, false)} className="btn btn-danger">Fail</button>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapseOut>
            )
          })}

          <div className="card">
            <Pagination
              page={page}
              pages={pagination.pages}
              total={pagination.total}
              label="applicants"
              onPrev={() => setPage(p => p - 1)}
              onNext={() => setPage(p => p + 1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
