// v2 status palette. `color` stays a Tailwind class string so StatusBadge and existing callers keep working.
export const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending review', color: 'bg-status-pending-bg text-status-pending-fg', dot: 'bg-slate-400', step: 1 },
  INCOMPLETE: { label: 'Incomplete', color: 'bg-status-incomplete-bg text-status-incomplete-fg', dot: 'bg-orange-500', step: 1 },
  ELIGIBILITY_SCREENING: { label: 'Eligibility screening', color: 'bg-status-screening-bg text-status-screening-fg', dot: 'bg-blue-600', step: 2 },
  NOT_QUALIFIED: { label: 'Not qualified', color: 'bg-status-rejected-bg text-status-rejected-fg', dot: 'bg-red-600', step: 2 },
  EXAM_INTERVIEW: { label: 'Exam / interview', color: 'bg-status-exam-bg text-status-exam-fg', dot: 'bg-indigo-600', step: 3 },
  FAILED_EXAM: { label: 'Failed exam', color: 'bg-status-rejected-bg text-status-rejected-fg', dot: 'bg-red-600', step: 3 },
  APPROVED: { label: 'Approved', color: 'bg-status-approved-bg text-status-approved-fg', dot: 'bg-teal-600', step: 4 },
  COR_SUBMITTED: { label: 'COR submitted', color: 'bg-status-approved-bg text-status-approved-fg', dot: 'bg-teal-600', step: 5 },
  COR_REJECTED: { label: 'COR returned', color: 'bg-status-incomplete-bg text-status-incomplete-fg', dot: 'bg-orange-500', step: 5 },
  ACCEPTED: { label: 'Accepted', color: 'bg-status-accepted-bg text-status-accepted-fg', dot: 'bg-green-600', step: 6 },
  REJECTED: { label: 'Rejected', color: 'bg-status-rejected-bg text-status-rejected-fg', dot: 'bg-red-600', step: 0 },
}

// Internal 6-step pipeline (admin) is unchanged.
export const STEPS = [
  { label: 'Applied', key: 'PENDING_REVIEW' },
  { label: 'Eligibility', key: 'ELIGIBILITY_SCREENING' },
  { label: 'Exam/Interview', key: 'EXAM_INTERVIEW' },
  { label: 'Approved', key: 'APPROVED' },
  { label: 'COR', key: 'COR_SUBMITTED' },
  { label: 'Accepted', key: 'ACCEPTED' },
]

// Applicant-facing 4-step timeline. Maps every internal status to one of 4 steps.
export const APPLICANT_STEPS = ['Submitted', 'Under review', 'Interview', 'Result']
export const APPLICANT_STEP_INDEX = {
  PENDING_REVIEW: 1, INCOMPLETE: 1, ELIGIBILITY_SCREENING: 1, NOT_QUALIFIED: 1,
  EXAM_INTERVIEW: 2, FAILED_EXAM: 2,
  APPROVED: 3, COR_SUBMITTED: 3, COR_REJECTED: 3, ACCEPTED: 4, REJECTED: 3,
}

export function getStatusBadge(status) {
  return STATUS_CONFIG[status] || { label: status, color: 'bg-status-pending-bg text-status-pending-fg', dot: 'bg-slate-400' }
}
