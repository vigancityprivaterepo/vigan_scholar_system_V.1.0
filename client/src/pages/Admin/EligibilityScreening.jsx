import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import Pagination from '../../components/shared/Pagination'
import { CollapseOut, EmptyQueue, RemarkField, useRequiredRemark } from '../../components/ui/Motion'
import { useUndoableActions } from '../../hooks/useUndoableActions'

const DEFAULT_GWA_THRESHOLD = 83
const PAGE_SIZE = 20

export default function EligibilityScreening() {
  const [apps, setApps] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [remarks, setRemarks] = useState({})
  const [threshold, setThreshold] = useState(DEFAULT_GWA_THRESHOLD)
  const { schedule, isHidden } = useUndoableActions()
  const remark = useRequiredRemark()

  const fetchData = useCallback(() => {
    Promise.all([
      adminService.listApplications({ status: 'ELIGIBILITY_SCREENING', limit: PAGE_SIZE, page }),
      adminService.getSiteSettings(),
    ])
      .then(([appsRes, settingsRes]) => {
        setApps(appsRes.data.applications)
        setPagination(appsRes.data.pagination || { total: 0, pages: 1 })
        const t = parseFloat(settingsRes.data.settings?.gwaThreshold)
        if (!isNaN(t)) setThreshold(t)
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load applicants.'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const decide = (app, status) => {
    const text = remarks[app.id] || ''
    if (status === 'NOT_QUALIFIED' && !remark.require(app.id, text)) return
    const name = app.applicant?.fullName || 'Applicant'
    schedule({
      id: app.id,
      message: status === 'NOT_QUALIFIED' ? `${name} disqualified` : `${name} qualified for exam / interview`,
      commit: () => adminService.updateStatus(app.id, {
        status,
        remarks: text,
        ...(status === 'NOT_QUALIFIED' ? { rejectionReason: text } : {}),
      }),
      onDone: fetchData,
    })
  }

  // Cards waiting on Undo are already counted as done.
  const waiting = Math.max(0, pagination.total - apps.filter((app) => isHidden(app.id)).length)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="portal-page-title">Eligibility screening</h1>
        <p className="portal-page-subtitle">
          Minimum general average {threshold.toFixed(0)}% · <strong className="text-brand-primary">{waiting} waiting</strong>
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-card" />)}
        </div>
      ) : apps.length === 0 || (apps.every((app) => isHidden(app.id)) && pagination.pages <= 1) ? (
        <EmptyQueue title="All clear">Nothing left to screen. Qualified applicants are now in Exam / Interview.</EmptyQueue>
      ) : (
        <>
          {apps.map((app, index) => {
            // generalAverage is a percentage; gwa is the legacy field.
            const avg = parseFloat(app.generalAverage ?? app.gwa)
            const hasAvg = !isNaN(avg)
            const qualified = hasAvg && avg >= threshold
            const tone = !hasAvg ? 'text-slate-500' : qualified ? 'text-emerald-700' : 'text-red-700'
            const bar = !hasAvg ? 'bg-slate-300' : qualified ? 'bg-emerald-700' : 'bg-red-600'
            const files = app._count?.requirementFiles ?? app.requirementFiles?.length ?? 0
            return (
              <CollapseOut key={app.id} leaving={isHidden(app.id)}>
                <div className="animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="card grid items-center gap-7 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,0.8fr)_minmax(280px,1fr)]">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[17px] font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                      <p className="text-sm text-slate-500">{app.school} · {app.course} · Year {app.yearLevel}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="badge bg-emerald-50 text-emerald-800">{files} {files === 1 ? 'document' : 'documents'} on file</span>
                      </div>
                      <Link to={`/admin/applicants/${app.id}`} className="mt-1 self-start py-1 text-sm font-semibold text-brand-teal hover:text-brand-dark">
                        Open full review →
                      </Link>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className={`font-display text-3xl font-bold leading-none tabular-nums ${tone}`}>{hasAvg ? `${avg.toFixed(1)}%` : '—'}</p>
                      <div className="relative h-2 rounded bg-slate-100" aria-hidden="true">
                        <div className={`h-full origin-left animate-grow-x rounded ${bar}`} style={{ width: `${hasAvg ? Math.min(100, Math.max(0, avg)) : 0}%` }} />
                        <div className="absolute -top-1 h-4 w-0.5 bg-brand-primary" style={{ left: `${threshold}%` }} />
                      </div>
                      <p className={`text-[13px] font-semibold ${tone}`}>
                        {!hasAvg ? 'No average on file' : qualified ? `Meets the ${threshold}% minimum` : `Below the ${threshold}% minimum`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <RemarkField
                        value={remarks[app.id] || ''}
                        onChange={(e) => {
                          setRemarks(r => ({ ...r, [app.id]: e.target.value }))
                          remark.clear(app.id)
                        }}
                        placeholder="Remarks (required to disqualify)"
                        aria-label={`Remarks for ${app.applicant?.fullName || 'applicant'}`}
                        error={remark.errorFor(app.id)}
                        shakeKey={remark.shakeKeyFor(app.id)}
                        helper="Add a short reason so the applicant knows why."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => decide(app, 'EXAM_INTERVIEW')} className="btn btn-primary">Qualify</button>
                        <button type="button" onClick={() => decide(app, 'NOT_QUALIFIED')} className="btn btn-danger">Disqualify</button>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapseOut>
            )
          })}

          {pagination.pages > 1 && (
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
          )}
        </>
      )}
    </div>
  )
}
