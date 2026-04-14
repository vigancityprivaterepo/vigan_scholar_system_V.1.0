import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'
import { ArrowRightIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

const DEFAULT_GWA_THRESHOLD = 2.0

export default function EligibilityScreening() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})
  const [remarks, setRemarks] = useState({})
  const [threshold, setThreshold] = useState(DEFAULT_GWA_THRESHOLD)

  const fetchData = () => {
    Promise.all([
      adminService.listApplications({ status: 'ELIGIBILITY_SCREENING', limit: 50 }),
      adminService.getSiteSettings(),
    ])
      .then(([appsRes, settingsRes]) => {
        setApps(appsRes.data.applications)
        const t = parseFloat(settingsRes.data.settings?.gwaThreshold)
        if (!isNaN(t)) setThreshold(t)
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load applicants.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const act = async (id, status, extra = {}) => {
    // Enforce remarks when disqualifying
    if (status === 'NOT_QUALIFIED' && !remarks[id]?.trim()) {
      toast.error('Remarks are required when disqualifying.')
      return
    }
    setActing(a => ({ ...a, [id]: true }))
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
        <p className="portal-page-subtitle">GWA threshold: ≤ {threshold.toFixed(1)} • {apps.length} pending</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-emerald-700">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-brand-primary">All clear</h2>
          <p className="mt-1 text-sm text-slate-500">No applications pending eligibility review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {apps.map(app => {
            const gwa = parseFloat(app.gwa)
            const qualified = !isNaN(gwa) && gwa <= threshold
            return (
              <div key={app.id} className="portal-surface p-5">
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
                      {isNaN(gwa) ? '-' : gwa.toFixed(2)}
                    </p>
                    <p className={clsx('text-xs font-medium', qualified ? 'text-green-600' : 'text-red-500')}>
                      {isNaN(gwa) ? 'No GWA' : qualified ? 'Meets threshold' : 'Below threshold'}
                    </p>
                  </div>

                  <div className="flex min-w-56 flex-col gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Remarks
                        <span className="ml-1 text-red-500" title="Required when disqualifying">*</span>
                        <span className="ml-1 text-slate-400 font-normal">(required to disqualify)</span>
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
                      <button onClick={() => act(app.id, 'EXAM_INTERVIEW')} disabled={acting[app.id]} className="portal-button-primary flex-1 !px-3 !py-2 text-xs">
                        Qualify
                      </button>
                      <button
                        onClick={() => act(app.id, 'NOT_QUALIFIED', { rejectionReason: remarks[app.id] || 'Does not meet eligibility requirements.' })}
                        disabled={acting[app.id]}
                        className="portal-button-secondary flex-1 !border-red-300 !px-3 !py-2 text-xs !text-red-700 hover:!border-red-500 hover:!text-red-800"
                      >
                        Disqualify
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
      )}
    </div>
  )
}
