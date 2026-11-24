import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { applicationService } from '../../services/applicationService'
import StatusBadge from '../../components/shared/StatusBadge'
import { APPLICANT_STEPS, APPLICANT_STEP_INDEX } from '../../utils/statusConfig'
import { REQUIREMENT_SHORT_NAMES } from '../../utils/requirements'
import { fromNow, formatDate, formatScheduleDateTime } from '../../utils/formatDate'
import { readDraftMeta } from '../../utils/applicationDraft'
import { CalendarIcon, CheckCircleIcon, InfoIcon, AlertTriangleIcon } from '../../components/ui/PortalIcons'

const ENDED = ['NOT_QUALIFIED', 'FAILED_EXAM', 'REJECTED']

// What the "Next step" card says for each status.
const NEXT_STEP = {
  PENDING_REVIEW: { title: 'We are checking your documents', body: 'You will get an update here and by email once the office has looked at your requirements.' },
  INCOMPLETE: { title: 'Fix what the office flagged', body: 'Read the remarks on your Status page, update the documents, then resubmit.', cta: { to: '/applicant/status', label: 'View remarks and resubmit' } },
  ELIGIBILITY_SCREENING: { title: 'Your grades are being checked', body: 'Your requirements are complete. The office is checking them against the eligibility rules.' },
  NOT_QUALIFIED: { title: 'You did not meet the eligibility rules', body: 'See the reason on your Status page. You can file an appeal there if you think it is wrong.', cta: { to: '/applicant/status', label: 'See the reason' } },
  EXAM_INTERVIEW: { title: 'Get ready for your exam and interview', body: 'Your schedule appears below as soon as the office sets it.' },
  FAILED_EXAM: { title: 'You did not pass the exam or interview', body: 'See your Status page for details and appeal options.', cta: { to: '/applicant/status', label: 'See details' } },
  APPROVED: { title: 'Submit your certificate of registration', body: 'Upload your COR for this semester. You become a scholar once the office approves it.', cta: { to: '/applicant/cor', label: 'Submit my COR' } },
  COR_SUBMITTED: { title: 'Your COR is being reviewed', body: 'Bring the original COR to the Scholarship Office at City Hall as well.' },
  COR_REJECTED: { title: 'Your COR was returned', body: 'Read the reason and upload a corrected COR.', cta: { to: '/applicant/cor', label: 'Upload a new COR' } },
  ACCEPTED: { title: 'Welcome, scholar', body: 'Your scholarship is confirmed. Renew each academic year to keep it.', cta: { to: '/applicant/renewal', label: 'Start renewal' } },
  REJECTED: { title: 'Your application was not accepted this cycle', body: 'You may apply again in the next application period if you still qualify.' },
}

const INTERVIEW_TIPS = [
  'Bring a valid ID and your reference number',
  'Bring your original Form 138',
  'Arrive 15 minutes early',
  'Wear neat, comfortable clothes',
  'Bring a pen',
]
const TIPS_KEY = 'applicantInterviewChecklist.v1'

// Builds a one-event .ics file so the applicant can add the schedule to their phone calendar.
const downloadCalendar = (schedule) => {
  const start = new Date(schedule.scheduledAt)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const escape = (v) => String(v || '').replace(/[,;\\]/g, (m) => `\\${m}`)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vigan City Scholarship//EN', 'BEGIN:VEVENT',
    `UID:${schedule.id || stamp(start)}@vigan-scholarship`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    'SUMMARY:Scholarship exam / interview', `LOCATION:${escape(schedule.location)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'scholarship-interview.ics'
  a.click()
  URL.revokeObjectURL(url)
}

function Timeline({ status }) {
  const current = APPLICANT_STEP_INDEX[status] ?? 1
  const ended = ENDED.includes(status)
  const finished = status === 'ACCEPTED'
  // The line fills to the current step; it starts at 0 and grows on mount.
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setFill(Math.max(0, current - 1) / (APPLICANT_STEPS.length - 1)))
    return () => cancelAnimationFrame(t)
  }, [current])

  return (
    <ol className="relative grid grid-cols-4" aria-label="Application progress">
      <span className="absolute left-[12.5%] right-[12.5%] top-[15px] h-[3px] rounded bg-slate-200" aria-hidden="true" />
      <span className="absolute left-[12.5%] top-[15px] h-[3px] rounded bg-brand-teal transition-[width] delay-200 duration-[900ms] ease-out" style={{ width: `${fill * 75}%` }} aria-hidden="true" />
      {APPLICANT_STEPS.map((label, i) => {
        const step = i + 1
        const done = step < current || (finished && step === current)
        const isCurrent = step === current && !finished
        const failed = isCurrent && ended
        return (
          <li key={label} className="relative flex flex-col items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
            <span className="relative h-8 w-8">
              {isCurrent && !failed && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-teal" aria-hidden="true" />}
              <span className={`relative flex h-8 w-8 animate-pop-in items-center justify-center rounded-full border-2 text-sm font-bold ${
                done ? 'border-brand-teal bg-brand-teal text-white'
                  : failed ? 'border-red-600 bg-red-600 text-white'
                    : isCurrent ? 'border-brand-teal bg-white text-brand-teal'
                      : 'border-slate-300 bg-white text-slate-400'
              }`} style={{ animationDelay: `${i * 80}ms` }}>
                {done ? '✓' : failed ? '×' : step}
              </span>
            </span>
            <span className={`text-center text-[13px] leading-tight ${isCurrent || done ? 'font-semibold text-brand-primary' : 'text-slate-500'}`}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function InterviewChecklist() {
  const [done, setDone] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(TIPS_KEY)) || [] } catch { return [] }
  })
  useEffect(() => { window.localStorage.setItem(TIPS_KEY, JSON.stringify(done)) }, [done])
  const toggle = (tip) => setDone((current) => (current.includes(tip) ? current.filter((t) => t !== tip) : [...current, tip]))
  const count = INTERVIEW_TIPS.filter((tip) => done.includes(tip)).length

  return (
    <section className="flex shrink-0 flex-col gap-3 rounded-[20px] bg-white p-[18px] shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold text-brand-primary">Interview checklist</h2>
        <span className="text-sm tabular-nums text-slate-500">{count}/{INTERVIEW_TIPS.length}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-teal transition-[width] duration-slow ease-spring" style={{ width: `${(count / INTERVIEW_TIPS.length) * 100}%` }} />
      </div>
      <p className="min-h-5 text-sm font-semibold text-emerald-700" aria-live="polite">
        {count === INTERVIEW_TIPS.length ? 'All set. Good luck!' : count > 0 ? 'Nice progress.' : ''}
      </p>
      {INTERVIEW_TIPS.map((tip) => {
        const checked = done.includes(tip)
        return (
          <button key={tip} type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(tip)} className="press flex min-h-[52px] items-center gap-3 border-t border-slate-100 px-1 py-1.5 text-left">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-med ease-spring ${checked ? 'scale-110 border-brand-teal bg-brand-teal text-white' : 'border-slate-300 bg-white'}`} aria-hidden="true">
              {checked && '✓'}
            </span>
            <span className={`text-base transition-colors duration-fast ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{tip}</span>
          </button>
        )
      })}
    </section>
  )
}

export default function ApplicantDashboard() {
  const { user } = useAuthStore()
  const { notifications } = useAppStore()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const draft = readDraftMeta()
  // Names are often stored in capitals; show "Mikael", not "MIKAEL".
  const rawFirst = user?.fullName?.trim().split(/\s+/)[0] || ''
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase() : 'applicant'

  useEffect(() => {
    applicationService.getMine()
      .then(r => setApplication(r.data.application))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load application data.'))
      .finally(() => setLoading(false))
  }, [])

  const unreadNotifs = notifications.filter(n => !n.isRead).slice(0, 5)
  const next = application ? NEXT_STEP[application.status] : null
  const schedule = application?.examSchedules?.[0] || null
  const showInterview = application?.status === 'EXAM_INTERVIEW'

  const notificationIcon = (type) => {
    if (type === 'SUCCESS') return CheckCircleIcon
    if (type === 'WARNING' || type === 'ERROR') return AlertTriangleIcon
    return InfoIcon
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-sm font-medium text-emerald-700">Hello, {firstName}</p>
        <h1 className="portal-page-title">{!application && !loading ? 'Start your application' : 'Your scholarship'}</h1>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3.5">
          {[1, 2].map(i => <div key={i} className="skeleton h-40 rounded-[20px]" />)}
        </div>
      ) : !application ? (
        <>
          {draft && (
            <Link to="/applicant/apply" className="press flex shrink-0 animate-slide-up items-center gap-3 rounded-2xl border-[1.5px] border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <span className="flex-1">
                <span className="block text-base font-semibold text-brand-dark">Resume your application</span>
                <span className="block text-sm text-emerald-800">Step {draft.step + 1} of 5 · saved on this device {fromNow(draft.savedAt)}</span>
              </span>
              <span className="text-xl text-brand-dark" aria-hidden="true">→</span>
            </Link>
          )}
          <section className="flex shrink-0 animate-slide-up flex-col gap-3 rounded-[20px] bg-white p-5 shadow-card">
            <p className="text-[15px] text-slate-600">5 short steps. Your answers save as you go.</p>
            <Link to="/applicant/apply" className="btn-cta">{draft ? 'Continue my application' : 'Start my application'}</Link>
            <Link to="/applicant/eligibility" className="btn min-h-[50px] rounded-[14px] text-base">Check eligibility first · 1 min</Link>
          </section>
          <section className="shrink-0 animate-slide-up rounded-[20px] bg-white p-[18px] shadow-card" style={{ animationDelay: '60ms' }}>
            <h2 className="mb-1 text-[17px] font-semibold text-brand-primary">Have these ready</h2>
            <ul>
              {REQUIREMENT_SHORT_NAMES.map((item, i) => (
                <li key={item} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-[15px] text-slate-800 last:border-b-0">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[13px] font-bold text-emerald-700">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className="flex shrink-0 animate-slide-up flex-col gap-4 rounded-[20px] bg-white p-[18px] shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-brand-primary">Your application</h2>
              <StatusBadge status={application.status} />
            </div>
            <Timeline status={application.status} />
            {next && (
              <div className={`flex flex-col gap-2.5 rounded-2xl border p-3.5 ${ENDED.includes(application.status) ? 'border-red-200 bg-red-50' : ['INCOMPLETE', 'COR_REJECTED'].includes(application.status) ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <p className="text-sm font-semibold text-emerald-700">Next step</p>
                <p className="text-[17px] font-semibold leading-snug text-brand-primary">{next.title}</p>
                <p className="text-[15px] text-slate-600">{next.body}</p>
                {showInterview && schedule && (
                  <div className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-primary">
                      <CalendarIcon className="h-4 w-4" /> {formatScheduleDateTime(schedule.scheduledAt)}
                    </p>
                    {schedule.location && <p className="text-[15px] text-slate-600">{schedule.location}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => downloadCalendar(schedule)} className="press flex min-h-11 items-center justify-center gap-1.5 rounded-button bg-brand-teal text-[15px] font-semibold text-white">
                        <CalendarIcon className="h-4 w-4" /> Calendar
                      </button>
                      {schedule.location ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${schedule.location}, Vigan City`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="press flex min-h-11 items-center justify-center rounded-button border-[1.5px] border-slate-300 bg-white text-[15px] font-semibold text-brand-primary"
                        >
                          Directions
                        </a>
                      ) : <span />}
                    </div>
                  </div>
                )}
                {next.cta && (
                  <Link to={next.cta.to} className="press mt-0.5 flex min-h-12 items-center justify-center gap-2 rounded-button bg-brand-teal text-base font-semibold text-white">
                    {next.cta.label} →
                  </Link>
                )}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
              <div>
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-semibold tabular-nums text-brand-primary">#{application.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="font-semibold text-brand-primary">{formatDate(application.submittedAt)}</dd>
              </div>
            </dl>
          </section>

          {showInterview && <InterviewChecklist />}

          {unreadNotifs.length > 0 && (
            <section className="shrink-0 animate-slide-up rounded-[20px] bg-white p-[18px] shadow-card" style={{ animationDelay: '80ms' }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-brand-primary">Updates</h2>
                <Link to="/applicant/notifications" className="text-sm font-semibold text-brand-teal">View all</Link>
              </div>
              <div className="flex flex-col gap-2">
                {unreadNotifs.map(n => {
                  const Icon = notificationIcon(n.type)
                  return (
                    <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-brand-divider bg-brand-bg p-3.5">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-brand-primary">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{n.message}</p>
                      </div>
                      <p className="shrink-0 text-[13px] text-slate-500">{fromNow(n.createdAt)}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
