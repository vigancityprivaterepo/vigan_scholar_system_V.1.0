export const STATUS_CONFIG = {
  PENDING_REVIEW: {
    label: 'Pending Review',
    color: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
    step: 1,
  },
  INCOMPLETE: {
    label: 'Incomplete',
    color: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-400',
    step: 1,
  },
  ELIGIBILITY_SCREENING: {
    label: 'Eligibility Screening',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    step: 2,
  },
  NOT_QUALIFIED: {
    label: 'Not Qualified',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    step: 2,
  },
  EXAM_INTERVIEW: {
    label: 'Exam / Interview',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    step: 3,
  },
  FAILED_EXAM: {
    label: 'Failed Exam',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    step: 3,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-teal-100 text-teal-700',
    dot: 'bg-teal-500',
    step: 4,
  },
  COR_SUBMITTED: {
    label: 'COR Submitted',
    color: 'bg-teal-100 text-teal-700',
    dot: 'bg-teal-500',
    step: 5,
  },
  COR_REJECTED: {
    label: 'COR Rejected',
    color: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-400',
    step: 5,
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    step: 6,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    step: 0,
  },
}

export const STEPS = [
  { label: 'Applied', key: 'PENDING_REVIEW' },
  { label: 'Eligibility', key: 'ELIGIBILITY_SCREENING' },
  { label: 'Exam/Interview', key: 'EXAM_INTERVIEW' },
  { label: 'Approved', key: 'APPROVED' },
  { label: 'COR', key: 'COR_SUBMITTED' },
  { label: 'Accepted', key: 'ACCEPTED' },
]

export function getStatusBadge(status) {
  return STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' }
}
