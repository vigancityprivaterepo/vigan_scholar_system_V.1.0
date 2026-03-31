import React from 'react'
import { clsx } from 'clsx'
import { STEPS } from '../../utils/statusConfig'

export default function Stepper({ currentStatus }) {
  const stepMap = {
    PENDING_REVIEW: 0, INCOMPLETE: 0,
    ELIGIBILITY_SCREENING: 1, NOT_QUALIFIED: 1,
    EXAM_INTERVIEW: 2, FAILED_EXAM: 2,
    APPROVED: 3,
    COR_SUBMITTED: 4, COR_REJECTED: 4,
    ACCEPTED: 5,
    REJECTED: -1,
  }

  const currentStep = stepMap[currentStatus] ?? 0
  const isRejected = ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM'].includes(currentStatus)

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-max items-center px-4">
        {STEPS.map((step, i) => {
          const isDone = currentStep > i
          const isCurrent = currentStep === i
          const isFailed = isRejected && isCurrent

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300',
                    isDone ? 'border-brand-teal bg-brand-teal text-white' :
                    isFailed ? 'border-red-500 bg-red-500 text-white' :
                    isCurrent ? 'border-brand-primary bg-brand-primary text-white' :
                    'border-slate-300 bg-white text-slate-400'
                  )}
                >
                  {isDone ? '✓' : isFailed ? '×' : i + 1}
                </div>
                <span
                  className={clsx(
                    'whitespace-nowrap text-xs font-medium',
                    isDone ? 'text-brand-teal' :
                    isFailed ? 'text-red-500' :
                    isCurrent ? 'font-semibold text-brand-primary' :
                    'text-slate-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'mx-1 h-0.5 w-12 transition-all duration-500 md:w-20',
                    isDone ? 'bg-brand-teal' : 'bg-slate-200'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
