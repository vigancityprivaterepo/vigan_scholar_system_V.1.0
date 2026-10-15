// The applicant portal is public-facing; the admin side is internal. Everything an
// applicant endpoint returns goes through these functions, so staff-only data
// (checklists, interview notes, scores, who did what, storage paths, staff
// emails) never leaves the server on the public side.

const toApplicantFile = ({ id, fileName, fileType, docType, uploadedAt, isApproved }) => ({
  id,
  fileName,
  ...(fileType !== undefined ? { fileType } : {}),
  ...(docType !== undefined ? { docType } : {}),
  uploadedAt,
  ...(isApproved !== undefined ? { isApproved } : {}),
});

const toApplicantApplication = (application) => {
  if (!application) return null;
  const {
    // staff-only fields
    requirementChecklist,
    interviewNotes,
    examScore,
    interviewScore,
    corHardCopyReceivedById,
    corHardCopyReceivedBy,
    applicant,
    // relations reshaped below
    activityLogs,
    examSchedules,
    requirementFiles,
    corFiles,
    ...visible
  } = application;

  return {
    ...visible,
    ...(requirementFiles ? { requirementFiles: requirementFiles.map(toApplicantFile) } : {}),
    ...(corFiles ? { corFiles: corFiles.map(toApplicantFile) } : {}),
    ...(examSchedules ? {
      examSchedules: examSchedules.map((schedule) => ({
        id: schedule.id,
        scheduledAt: schedule.scheduledAt,
        location: schedule.location,
        type: schedule.type,
        status: schedule.status,
        examiner: schedule.examiner?.fullName ? { fullName: schedule.examiner.fullName } : null,
      })),
    } : {}),
    // Only status changes, without staff notes or names.
    ...(activityLogs ? {
      activityLogs: activityLogs
        .filter((log) => log.toStatus && log.fromStatus !== log.toStatus)
        .map((log) => ({ id: log.id, fromStatus: log.fromStatus, toStatus: log.toStatus, createdAt: log.createdAt })),
    } : {}),
  };
};

const toApplicantRenewal = (renewal) => {
  if (!renewal) return null;
  const { renewalFiles, ...visible } = renewal;
  return {
    ...visible,
    ...(renewalFiles ? { renewalFiles: renewalFiles.map(toApplicantFile) } : {}),
  };
};

const toApplicantAppeal = (appeal) => {
  if (!appeal) return null;
  const { reviewedBy, reviewedById, ...visible } = appeal;
  return visible;
};

module.exports = { toApplicantApplication, toApplicantRenewal, toApplicantAppeal };
