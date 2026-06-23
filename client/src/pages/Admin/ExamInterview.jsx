import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import Pagination from '../../components/shared/Pagination'
import { ArrowRightIcon, CalendarIcon, ChartIcon, AlertTriangleIcon, UsersIcon, SearchIcon } from '../../components/ui/PortalIcons'

const PAGE_SIZE = 20

export default function ExamInterview() {
  const [apps, setApps] = useState([])
  const [examiners, setExaminers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scoreForm, setScoreForm] = useState({})
  const [acting, setActing] = useState({})

  // Bulk scheduling state
  const [selected, setSelected] = useState(new Set())
  const [bulkForm, setBulkForm] = useState({ scheduledAt: '', location: '', type: 'BOTH', examinerId: '' })
  const [bulkActing, setBulkActing] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
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

  useEffect(() => { fetchData() }, [fetchData])


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
    setSelected(prev => prev.size === apps.length ? new Set() : new Set(apps.map(a => a.id)))
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
        <p className="portal-page-subtitle">{pagination.total} applicants at this stage</p>
      </div>

      <div className="portal-surface p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="portal-input pl-10"
            placeholder="Search by name, email, or Ref. ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-36 animate-pulse bg-gray-100" />)}
        </div>
      ) : apps.length === 0 && page === 1 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-xl font-bold text-brand-primary">No applicants at this stage</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── Bulk Schedule Panel ── */}
          <div className="portal-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-brand-primary">
              <UsersIcon className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Bulk Schedule</p>
              {selected.size > 0 && (
                <span className="ml-auto rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                  {selected.size} selected
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input
                type="datetime-local"
                className="portal-input text-sm"
                value={bulkForm.scheduledAt}
                onChange={e => setBulkForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
              <input
                className="portal-input text-sm"
                placeholder="Location (optional)"
                value={bulkForm.location}
                onChange={e => setBulkForm(f => ({ ...f, location: e.target.value }))}
              />
              <select
                className="portal-input text-sm"
                value={bulkForm.type}
                onChange={e => setBulkForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="EXAM">Exam only</option>
                <option value="INTERVIEW">Interview only</option>
                <option value="BOTH">Exam + Interview</option>
              </select>
              <select
                className="portal-input text-sm"
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
                className="portal-button-primary text-xs disabled:opacity-50"
              >
                {bulkActing ? 'Scheduling…' : `Schedule ${selected.size > 0 ? `(${selected.size})` : 'Selected'}`}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Check applicants below to include them in the bulk schedule. All selected applicants receive the same date, location, type, and assigned examiner.
            </p>
          </div>

          {/* ── Select-all bar ── */}
          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2">
            <input
              type="checkbox"
              id="select-all"
              className="h-4 w-4 cursor-pointer accent-brand-primary"
              checked={selected.size === apps.length && apps.length > 0}
              onChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="cursor-pointer text-xs font-medium text-slate-600">
              {selected.size === apps.length && apps.length > 0 ? 'Deselect all on this page' : `Select all ${apps.length} on this page`}
            </label>
            {pagination.pages > 1 && (
              <span className="ml-auto text-xs text-slate-400">Page {page} of {pagination.pages}</span>
            )}
          </div>

          {/* ── Applicant cards ── */}
          {apps.map(app => {
            const scf = scoreForm[app.id] || {}
            const isSelected = selected.has(app.id)
            return (
              <div
                key={app.id}
                className={`portal-surface p-6 transition-all ${isSelected ? 'ring-2 ring-brand-primary' : ''}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 cursor-pointer accent-brand-primary"
                      checked={isSelected}
                      onChange={() => toggleSelect(app.id)}
                    />
                    <div>
                      <p className="font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                      <p className="text-xs text-slate-500">{app.school} • GWA: <span className="font-mono font-bold">{app.generalAverage ? `${parseFloat(app.generalAverage).toFixed(2)}%` : '-'}</span></p>
                    </div>
                  </div>
                  <Link to={`/admin/applicants/${app.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                    View <ArrowRightIcon className="h-4 w-4" />
                  </Link>
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
            )
          })}

          <div className="portal-surface overflow-hidden">
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
