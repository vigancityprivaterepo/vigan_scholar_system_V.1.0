// Valid status transitions (normal workflow)
const TRANSITIONS = {
  PENDING_REVIEW: ['INCOMPLETE', 'ELIGIBILITY_SCREENING'],
  INCOMPLETE: ['PENDING_REVIEW'],
  ELIGIBILITY_SCREENING: ['NOT_QUALIFIED', 'EXAM_INTERVIEW'],
  NOT_QUALIFIED: ['REJECTED', 'INCOMPLETE'],
  EXAM_INTERVIEW: ['FAILED_EXAM', 'APPROVED'],
  FAILED_EXAM: ['REJECTED'],
  APPROVED: ['COR_SUBMITTED'],
  COR_SUBMITTED: ['COR_REJECTED', 'ACCEPTED'],
  COR_REJECTED: ['COR_SUBMITTED'],
  ACCEPTED: [],
  REJECTED: [],
};

// Appeal-approval reversions — bypasses normal transition validation.
// Each key is a terminal rejection status; the value is the stage the application
// is reinstated to when an admin approves the applicant's appeal.
const APPEAL_REVERT_STATUS = {
  REJECTED: 'PENDING_REVIEW',
  NOT_QUALIFIED: 'ELIGIBILITY_SCREENING',
  FAILED_EXAM: 'EXAM_INTERVIEW',
  COR_REJECTED: 'APPROVED',
};

const isValidTransition = (from, to) => {
  return TRANSITIONS[from]?.includes(to) ?? false;
};

const STATUS_LABELS = {
  PENDING_REVIEW: 'Pending Review',
  INCOMPLETE: 'Incomplete',
  ELIGIBILITY_SCREENING: 'Eligibility Screening',
  NOT_QUALIFIED: 'Not Qualified',
  EXAM_INTERVIEW: 'Exam / Interview',
  FAILED_EXAM: 'Failed Exam',
  APPROVED: 'Approved',
  COR_SUBMITTED: 'COR Submitted',
  COR_REJECTED: 'COR Rejected',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

module.exports = { isValidTransition, STATUS_LABELS, TRANSITIONS, APPEAL_REVERT_STATUS };
