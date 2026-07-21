import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import Pagination from '../../components/shared/Pagination'
import { ArrowRightIcon, CheckCircleIcon, SpinnerIcon } from '../../components/ui/PortalIcons'

const DEFAULT_GWA_THRESHOLD = 83
const PAGE_SIZE = 20

export default function EligibilityScreening() {
  const [apps, setApps] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})
  const [remarks, setRemarks] = useState({})
  const [threshold, setThreshold] = useState(DEFAULT_GWA_THRESHOLD)

  const fetchData = useCallback(() => {
    setLoading(true)
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

  useEffect(() => { fetchData() }, [fetchData])

  const act = async (id, status, extra = {}) => {
    if (status === 'NOT_QUALIFIED' && !remarks[id]?.trim()) {
      toast.error('Remarks are required when disqualifying.')
      return
    }
    setActing(a => ({ ...a, [id]: status }))
    try {
      await adminService.updateStatus(id, { status, remarks: remarks[id], ...extra })
      toast.success(`Marked as ${status.replace(/_/g, ' ')}`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActing(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="portal-kicker">Eligibility Review</p>
        <h1 className="portal-page-title mt-2">Eligibility Screening</h1>
        <p className="portal-page-subtitle">
          Min. General Average: ≥ {threshold.toFixed(0)}% &bull; {pagination.total} pending
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : apps.length === 0 && page === 1 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-emerald-700">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-brand-primary">All clear</h2>
          <p className="mt-1 text-sm text-slate-500">No applications pending eligibility review.</p>
        </div>
      ) : (
        <div className="portal-surface overflow-hidden">
          <div className="flex flex-col divide-y divide-slate-100">
            {apps.map(app => {
              // Use generalAverage (percentage) — falls back to gwa for legacy records
              const avg = parseFloat(app.generalAverage ?? app.gwa)
              const qualified = !isNaN(avg) && avg >= threshold
              return (
                <div key={app.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={clsx('mt-1.5 h-3 w-3 flex-shrink-0 rounded-full', qualified ? 'bg-green-500' : 'bg-red-500')} />
                        <div>
                          <p className="font-semibold text-brand-primary">{app.applicant?.fullName}</p>
                          <p className="text-xs text-slate-500">{app.school} • {app.course} • Year {app.yearLevel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className={clsx('font-mono text-3xl font-bold', qualified ? 'text-green-600' : 'text-red-500')}>
                        {isNaN(avg) ? '-' : `${avg.toFixed(1)}%`}
                      </p>
                      <p className={clsx('text-xs font-medium', qualified ? 'text-green-600' : 'text-red-500')}>
                        {isNaN(avg) ? 'No average on file' : qualified ? `Meets threshold (≥ ${threshold}%)` : `Below threshold (< ${threshold}%)`}
                      </p>
                    </div>

                    <div className="flex min-w-56 flex-col gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">
                          Remarks
                          <span className="ml-1 text-red-500" title="Required when disqualifying">*</span>
                          <span className="ml-1 font-normal text-slate-400">(required to disqualify)</span>
                        </label>
                        <textarea
                          className="portal-input text-xs"
                          rows={2}
                          placeholder="Enter remarks…"
                          value={remarks[app.id] || ''}
                          onChange={e => setRemarks(r => ({ ...r, [app.id]: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => act(app.id, 'EXAM_INTERVIEW')}
                          disabled={Boolean(acting[app.id])}
                          className="portal-button-primary flex-1 !px-3 !py-2 text-xs flex items-center justify-center gap-1.5"
                        >
                          {acting[app.id] === 'EXAM_INTERVIEW' && <SpinnerIcon className="h-3.5 w-3.5 text-current" />}
                          {acting[app.id] === 'EXAM_INTERVIEW' ? 'Qualifying...' : 'Qualify'}
                        </button>
                        <button
                          onClick={() => act(app.id, 'NOT_QUALIFIED', { rejectionReason: remarks[app.id] || 'Does not meet eligibility requirements.' })}
                          disabled={Boolean(acting[app.id])}
                          className="portal-button-secondary flex-1 !border-red-300 !px-3 !py-2 text-xs !text-red-700 hover:!border-red-500 hover:!text-red-800 flex items-center justify-center gap-1.5"
                        >
                          {acting[app.id] === 'NOT_QUALIFIED' && <SpinnerIcon className="h-3.5 w-3.5 text-red-700" />}
                          {acting[app.id] === 'NOT_QUALIFIED' ? 'Disqualifying...' : 'Disqualify'}
                        </button>
                      </div>
                    </div>

                    <Link to={`/admin/applicants/${app.id}`} className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
                      Full Review <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

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
    </div>
  )
}
