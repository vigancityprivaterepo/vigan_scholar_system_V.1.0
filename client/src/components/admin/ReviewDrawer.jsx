import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { formatDate } from '../../utils/formatDate'
import { getStatusBadge } from '../../utils/statusConfig'
import { openProtectedFile } from '../../utils/openProtectedFile'
import { REQUIREMENT_CHECKLIST_ITEMS, REQUIREMENT_SHORT_NAMES, pairRequirementFiles, barangayOf, firstCollegeOf, formatPeso } from '../../utils/requirements'
import { RemarkField } from '../ui/Motion'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '../ui/PortalIcons'

const CheckGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

const typingInField = (event) => {
  const tag = event.target?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable
}

// 600px side panel for reviewing one application without leaving the list.
// J / K move through `ids`, Esc closes. Verified toggles are saved to the application's requirement checklist
// when an action is taken, the same as on the full review page.
export default function ReviewDrawer({ id, ids, threshold = 83, onClose, onNavigate, onDecided }) {
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState({})
  const [remark, setRemark] = useState('')
  const [remarkError, setRemarkError] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [blockedShake, setBlockedShake] = useState(0)
  const [saving, setSaving] = useState(false)
  const closeRef = useRef(null)
  const lastFocus = useRef(null)

  const index = ids.indexOf(id)
  const prevId = index > 0 ? ids[index - 1] : null
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null

  useEffect(() => {
    lastFocus.current = document.activeElement
    closeRef.current?.focus()
    const restore = lastFocus.current
    return () => restore?.focus?.()
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setRemark('')
    setRemarkError(false)
    adminService.getApplication(id)
      .then((r) => {
        if (!active) return
        setApp(r.data.application)
        setChecklist(r.data.application?.requirementChecklist || {})
      })
      .catch((err) => {
        if (active) toast.error(err.response?.data?.message || 'Could not load this application.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (typingInField(event) || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'j' && nextId) onNavigate(nextId)
      if (event.key === 'k' && prevId) onNavigate(prevId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextId, prevId, onClose, onNavigate])

  const entry = (item) => checklist[item] || { checked: false, notes: '' }
  const setEntry = (item, patch) => setChecklist((current) => ({ ...current, [item]: { ...entry(item), ...patch } }))
  const verifiedCount = REQUIREMENT_CHECKLIST_ITEMS.filter((item) => entry(item).checked).length
  const flagged = REQUIREMENT_CHECKLIST_ITEMS.filter((item) => entry(item).flagged)
  const allVerified = verifiedCount === REQUIREMENT_CHECKLIST_ITEMS.length
  const canDecide = app?.status === 'PENDING_REVIEW'
  const pairedFiles = pairRequirementFiles(app?.requirementFiles || [])

  const avg = parseFloat(app?.generalAverage ?? app?.gwa)
  const hasAvg = !Number.isNaN(avg)
  const meets = hasAvg && avg >= threshold
  // Bar runs from 75% to 100% so the threshold sits in a readable place.
  const toBar = (value) => `${Math.min(100, Math.max(0, ((value - 75) / 25) * 100))}%`

  const fullChecklist = () => Object.fromEntries(REQUIREMENT_CHECKLIST_ITEMS.map((item) => [item, entry(item)]))

  const submit = async (status, extra = {}) => {
    setSaving(true)
    try {
      await adminService.updateStatus(id, { status, requirementChecklist: fullChecklist(), ...extra })
      onDecided?.(id, status)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update this application.')
    } finally {
      setSaving(false)
    }
  }

  const advance = () => {
    if (!allVerified) {
      setBlockedShake((n) => n + 1)
      return
    }
    submit('ELIGIBILITY_SCREENING', remark.trim() ? { remarks: remark.trim() } : {})
  }

  const markIncomplete = () => {
    const text = remark.trim() || (flagged.length ? `Please resubmit: ${flagged.join('; ')}.` : '')
    if (!text) {
      setRemarkError(true)
      setShakeKey((n) => n + 1)
      return
    }
    submit('INCOMPLETE', { remarks: text })
  }

  const openFile = async (fileId) => {
    try {
      await openProtectedFile(`/files/requirements/${fileId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open file.')
    }
  }

  const badge = app ? getStatusBadge(app.status) : null

  return (
    <>
      <div className="fixed inset-0 z-[49] animate-fade-in bg-brand-primary/35" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Application review"
        className="fixed inset-y-0 right-0 z-50 flex w-[600px] max-w-full animate-slide-in-right flex-col bg-[#f0f7f3] shadow-[-20px_0_48px_rgba(12,35,64,.18)]"
      >
        <header className="flex items-center gap-3 bg-brand-dark px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate font-display text-[22px] font-semibold text-white">{app?.applicant?.fullName || (loading ? 'Loading…' : 'Applicant')}</h2>
              {badge && <span key={app.status} className={`badge badge-dot animate-pop-in ${badge.color}`}>{badge.label}</span>}
            </div>
            <p className="text-sm tabular-nums text-emerald-200">
              #{id.slice(0, 8).toUpperCase()}
              {app?.submittedAt && ` · submitted ${formatDate(app.submittedAt)}`}
              {index >= 0 && ` · ${index + 1} of ${ids.length}`}
            </p>
          </div>
          <button type="button" onClick={() => prevId && onNavigate(prevId)} disabled={!prevId} aria-label="Previous applicant (K)" className="press flex h-[38px] w-[38px] items-center justify-center rounded-control bg-white text-brand-primary disabled:opacity-40">
            <ChevronLeftIcon className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={() => nextId && onNavigate(nextId)} disabled={!nextId} aria-label="Next applicant (J)" className="press flex h-[38px] w-[38px] items-center justify-center rounded-control bg-white text-brand-primary disabled:opacity-40">
            <ChevronRightIcon className="h-[18px] w-[18px]" />
          </button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close (Esc)" className="press flex h-[38px] w-[38px] items-center justify-center rounded-control bg-white text-brand-primary">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        {loading || !app ? (
          <div className="flex flex-1 flex-col gap-4 p-5">
            {[1, 2, 3].map((n) => <div key={n} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div key={id} className="flex flex-1 animate-slide-up flex-col gap-4 overflow-y-auto p-5">
            <section className="grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-2xl border border-slate-200 bg-white p-4">
              {[
                ['High school', app.school],
                ['College', firstCollegeOf(app)],
                ['Course', app.course],
                ['Barangay', barangayOf(app.address)],
                ['Mobile', app.contact],
                ['Household income', formatPeso(app.familyIncome)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="text-[13px] text-slate-500">{label}</p>
                  <p className="truncate text-[15px] font-semibold text-brand-primary">{value || '—'}</p>
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-brand-primary">Grade check</span>
                <span className={`text-sm font-semibold ${!hasAvg ? 'text-slate-500' : meets ? 'text-emerald-700' : 'text-red-700'}`}>
                  {!hasAvg ? 'No average on file' : `${avg.toFixed(1)}% · ${meets ? 'meets threshold' : 'below threshold'}`}
                </span>
              </div>
              <div className="relative h-3 rounded-md bg-slate-100" aria-hidden="true">
                <div className={`h-full rounded-md transition-[width] duration-slow ease-spring ${meets ? 'bg-emerald-700' : 'bg-red-600'}`} style={{ width: hasAvg ? toBar(avg) : 0 }} />
                <div className="absolute -top-[5px] h-[22px] w-0.5 bg-brand-primary" style={{ left: toBar(threshold) }} />
              </div>
              <div className="flex justify-between text-[13px] text-slate-500">
                <span>75%</span><span>Threshold {threshold}%</span><span>100%</span>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5">
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-semibold text-brand-primary">Requirements</span>
                <span key={verifiedCount} className="animate-pop-in text-sm tabular-nums text-slate-500">{verifiedCount} of {REQUIREMENT_CHECKLIST_ITEMS.length} verified</span>
              </div>
              {REQUIREMENT_CHECKLIST_ITEMS.map((item, i) => {
                const current = entry(item)
                const file = pairedFiles?.[i] || null
                return (
                  <div key={item} className={`flex items-center gap-3 border-t border-slate-100 py-2.5 transition-colors duration-med ${current.checked ? 'bg-emerald-50/60' : current.flagged ? 'bg-amber-50/60' : ''}`}>
                    <button
                      type="button"
                      onClick={() => file && openFile(file.id)}
                      disabled={!file}
                      aria-label={file ? `View ${REQUIREMENT_SHORT_NAMES[i]}` : undefined}
                      className="press h-[52px] w-11 shrink-0 rounded-md border border-slate-200 bg-[repeating-linear-gradient(0deg,#fff_0_6px,#f1f5f9_6px_7px)] hover:border-brand-teal disabled:cursor-default disabled:hover:border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug text-brand-primary" title={item}>{REQUIREMENT_SHORT_NAMES[i]}</p>
                      {file ? (
                        <button type="button" onClick={() => openFile(file.id)} className="max-w-full truncate text-left text-[13px] text-slate-500 hover:text-brand-teal">{file.fileName || 'View file'}</button>
                      ) : (
                        <p className="text-[13px] text-slate-500">{pairedFiles ? 'No file' : 'See the files below'}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-pressed={Boolean(current.flagged)}
                      disabled={!canDecide}
                      onClick={() => setEntry(item, { flagged: !current.flagged, checked: false })}
                      className={`press h-9 shrink-0 rounded-control border-[1.5px] px-3 text-sm font-semibold transition-colors duration-fast disabled:opacity-50 ${current.flagged ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-300 bg-white text-slate-600'}`}
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      aria-pressed={Boolean(current.checked)}
                      disabled={!canDecide}
                      onClick={() => setEntry(item, { checked: !current.checked, flagged: false })}
                      className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-control border-[1.5px] px-3 text-sm font-semibold transition-colors duration-fast disabled:opacity-50 ${current.checked ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-600'}`}
                    >
                      {current.checked && <span className="animate-pop-in"><CheckGlyph /></span>} Verified
                    </button>
                  </div>
                )
              })}
            </section>

            {!pairedFiles && (
              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5">
                <p className="py-2.5 font-semibold text-brand-primary">Uploaded files ({app.requirementFiles?.length || 0})</p>
                {!app.requirementFiles?.length ? (
                  <p className="border-t border-slate-100 py-3 text-sm text-slate-500">No files uploaded.</p>
                ) : app.requirementFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5">
                    <div className="h-[52px] w-11 shrink-0 rounded-md border border-slate-200 bg-[repeating-linear-gradient(0deg,#fff_0_6px,#f1f5f9_6px_7px)]" aria-hidden="true" />
                    <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.fileName || 'File'}</p>
                    <button type="button" onClick={() => openFile(file.id)} className="btn min-h-9 px-3 text-sm">View</button>
                  </div>
                ))}
              </section>
            )}

            {canDecide ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-brand-primary">Remarks to applicant</span>
                <RemarkField
                  multiline
                  rows={3}
                  value={remark}
                  onChange={(e) => { setRemark(e.target.value); setRemarkError(false) }}
                  placeholder={flagged.length ? 'Leave empty to list the flagged documents.' : 'Shown to the applicant if you mark the application incomplete.'}
                  error={remarkError}
                  shakeKey={shakeKey}
                  helper="Flag a document or write what the applicant needs to fix."
                />
              </label>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                This application is past document review. Use the full review page for its next step.
              </p>
            )}

            <Link to={`/admin/applicants/${id}`} className="self-start text-sm font-semibold text-brand-teal hover:text-brand-dark">
              Open full review →
            </Link>
          </div>
        )}

        {canDecide && !loading && (
          <footer className="flex gap-2.5 border-t border-slate-200 bg-white px-5 py-3.5">
            <button type="button" onClick={markIncomplete} disabled={saving} className="press h-[46px] rounded-button border-[1.5px] border-amber-300 bg-amber-50 px-4 text-[15px] font-semibold text-amber-800">
              Mark incomplete
            </button>
            <button
              key={blockedShake}
              type="button"
              onClick={advance}
              disabled={saving}
              aria-disabled={!allVerified}
              className={`press flex h-[46px] flex-1 items-center justify-center gap-2 rounded-button text-[15px] font-semibold text-white transition-colors duration-fast ${allVerified ? 'bg-brand-teal' : 'bg-slate-400'} ${blockedShake ? 'animate-shake' : ''}`}
            >
              {saving ? 'Saving…' : allVerified ? 'Send to eligibility screening' : `Verify all documents (${verifiedCount}/${REQUIREMENT_CHECKLIST_ITEMS.length})`}
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
