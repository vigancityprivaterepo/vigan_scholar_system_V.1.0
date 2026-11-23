import { APPLICANT_STEPS, APPLICANT_STEP_INDEX } from '../../utils/statusConfig'
import { formatDate } from '../../utils/formatDate'

const ENDED = ['NOT_QUALIFIED', 'FAILED_EXAM', 'REJECTED']

const DESCRIPTIONS = [
  'Your form and documents reached the Scholarship Office.',
  'The office checks your documents and grades against the rules.',
  'You take the exam and interview on your scheduled date.',
  'You submit your COR and the office confirms your scholarship.',
]

// Vertical 4-step timeline for the Status page. Dates come from the status history when a step was reached.
export default function StatusTimeline({ application }) {
  const status = application.status
  const current = APPLICANT_STEP_INDEX[status] ?? 1
  const ended = ENDED.includes(status)
  const finished = status === 'ACCEPTED'
  const reachedOn = (step) => {
    if (step === 1) return application.submittedAt
    const log = [...(application.activityLogs || [])]
      .reverse()
      .find((entry) => (APPLICANT_STEP_INDEX[entry.toStatus] ?? 0) >= step)
    return log?.createdAt || null
  }

  return (
    <ol className="flex flex-col" aria-label="Application progress">
      {APPLICANT_STEPS.map((label, i) => {
        const step = i + 1
        const done = step < current || (finished && step === current)
        const isCurrent = step === current && !finished
        const failed = isCurrent && ended
        const date = step <= current ? reachedOn(step) : null
        const last = i === APPLICANT_STEPS.length - 1
        return (
          <li key={label} className="grid animate-slide-up grid-cols-[32px_1fr] gap-3.5" style={{ animationDelay: `${i * 70}ms` }} aria-current={isCurrent ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span className="relative h-7 w-7 shrink-0">
                {isCurrent && !failed && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-teal" aria-hidden="true" />}
                <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                  done ? 'border-brand-teal bg-brand-teal text-white'
                    : failed ? 'border-red-600 bg-red-600 text-white'
                      : isCurrent ? 'border-brand-teal bg-white text-brand-teal'
                        : 'border-slate-300 bg-white text-slate-400'
                }`}>
                  {done ? '✓' : failed ? '×' : step}
                </span>
              </span>
              {!last && <span className={`min-h-5 w-0.5 flex-1 ${done ? 'bg-brand-teal' : 'bg-slate-200'}`} aria-hidden="true" />}
            </div>
            <div className={`flex flex-col gap-1 pt-0.5 ${last ? '' : 'pb-[22px]'}`}>
              <div className="flex justify-between gap-2">
                <span className={`text-base font-semibold ${step <= current ? 'text-brand-primary' : 'text-slate-500'}`}>{label}</span>
                {date && <span className="whitespace-nowrap text-sm text-slate-500">{formatDate(date)}</span>}
              </div>
              <p className="text-[15px] leading-snug text-slate-600">
                {failed ? 'This is where your application stopped. See the reason below.' : DESCRIPTIONS[i]}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
