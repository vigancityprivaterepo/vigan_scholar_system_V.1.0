const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { AppError } = require('../middleware/errorHandler');
const { isValidTransition, STATUS_LABELS, APPEAL_REVERT_STATUS: APPEAL_REVERT_STATUS_MAP } = require('../utils/statusTransitions');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { toAcademicYear, parseAcademicYearRange } = require('../utils/academicYear');
const { getPrimaryAdminEmail, isPrimaryAdminEmail, getEffectiveRole } = require('../utils/primaryAdmin');
const { getClientBaseUrl } = require('../utils/clientBaseUrl');
const { formatManilaDate, formatManilaDateTime, parseManilaScheduleInput } = require('../utils/scheduleDateTime');

const prisma = new PrismaClient();
const PRIMARY_ADMIN_EMAIL = getPrimaryAdminEmail();
if (!PRIMARY_ADMIN_EMAIL) {
  console.warn('[adminController] WARNING: PRIMARY_ADMIN_EMAIL env var is not set. User management endpoints will be inaccessible.');
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REJECTION_REQUIRED_STATUSES = ['NOT_QUALIFIED', 'FAILED_EXAM', 'REJECTED', 'COR_REJECTED'];

const BULK_EMAIL_MAX_RECIPIENTS = (() => {
  const parsed = parseInt(process.env.BULK_EMAIL_MAX_RECIPIENTS || '300', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
})();
const BULK_EMAIL_DAILY_CAP_PER_ADMIN = (() => {
  const parsed = parseInt(process.env.BULK_EMAIL_DAILY_CAP_PER_ADMIN || '1000', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
})();
const EMAIL_JOB_DEFAULT_MAX_ATTEMPTS = (() => {
  const parsed = parseInt(process.env.BULK_EMAIL_JOB_MAX_ATTEMPTS || '3', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
})();
const OPTIONAL_SCHEMA_ERROR_CODES = new Set(['P2021', 'P2022']);
const privateUploadsDir = path.join(__dirname, '../../private_uploads');
const legacyUploadsDir = path.join(__dirname, '../../uploads');

const resolveUserFilePath = (fileUrl) => {
  const baseName = path.basename(String(fileUrl || ''));
  if (!baseName || baseName === '.' || baseName === '..') return null;

  const candidates = [
    path.join(privateUploadsDir, baseName),
    path.join(legacyUploadsDir, baseName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const collectUserFileUrls = async (userId) => {
  const [applications, renewals] = await Promise.all([
    prisma.application.findMany({
      where: { applicantId: userId },
      select: {
        requirementFiles: { select: { fileUrl: true } },
        corFiles: { select: { fileUrl: true } },
      },
    }),
    prisma.scholarshipRenewal.findMany({
      where: { applicantId: userId },
      select: {
        renewalFiles: { select: { fileUrl: true } },
      },
    }),
  ]);

  return [
    ...applications.flatMap((application) => [
      ...application.requirementFiles.map((file) => file.fileUrl),
      ...application.corFiles.map((file) => file.fileUrl),
    ]),
    ...renewals.flatMap((renewal) => renewal.renewalFiles.map((file) => file.fileUrl)),
  ].filter(Boolean);
};

const collectApplicationFileUrls = async (applicationId) => {
  const [application, renewals] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        requirementFiles: { select: { fileUrl: true } },
        corFiles: { select: { fileUrl: true } },
      },
    }),
    prisma.scholarshipRenewal.findMany({
      where: { applicationId },
      select: {
        renewalFiles: { select: { fileUrl: true } },
      },
    }),
  ]);

  return [
    ...(application
      ? [
          ...application.requirementFiles.map((file) => file.fileUrl),
          ...application.corFiles.map((file) => file.fileUrl),
        ]
      : []),
    ...renewals.flatMap((renewal) => renewal.renewalFiles.map((file) => file.fileUrl)),
  ].filter(Boolean);
};

const deleteUserUploadedFiles = (fileUrls) => {
  const uniqueUrls = [...new Set(fileUrls)];
  let deletedCount = 0;

  uniqueUrls.forEach((fileUrl) => {
    try {
      const filePath = resolveUserFilePath(fileUrl);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedCount += 1;
      }
    } catch (err) {
      console.warn(`[adminController] Failed to delete uploaded file (${fileUrl}):`, err.message);
    }
  });

  return deletedCount;
};

const ensureAdminDailyCap = async (adminId, requestedCount) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  const count = await prisma.communicationLog.count({
    where: {
      createdById: adminId,
      channel: 'EMAIL',
      createdAt: { gte: start, lte: end },
    },
  });

  if (count + requestedCount > BULK_EMAIL_DAILY_CAP_PER_ADMIN) {
    throw new AppError(`Daily email cap exceeded. Limit is ${BULK_EMAIL_DAILY_CAP_PER_ADMIN} per admin.`, 400);
  }
};

const recordCommunication = async ({
  applicationId,
  userId,
  channel,
  subject,
  message,
  metadata,
  createdById,
}) => prisma.communicationLog.create({
  data: {
    applicationId: applicationId || null,
    userId: userId || null,
    channel,
    subject: subject || null,
    message: message || null,
    metadata: metadata || undefined,
    createdById: createdById || null,
  },
});

const buildSubmittedAtWhere = (submittedFrom, submittedTo) => {
  const fromRaw = String(submittedFrom || '').trim();
  const toRaw = String(submittedTo || '').trim();
  if (!fromRaw && !toRaw) return null;

  let fromDate = null;
  let toDate = null;

  if (fromRaw) {
    const parsed = new Date(fromRaw);
    if (Number.isNaN(parsed.getTime())) throw new AppError('submittedFrom must be a valid date.', 400);
    parsed.setHours(0, 0, 0, 0);
    fromDate = parsed;
  }

  if (toRaw) {
    const parsed = new Date(toRaw);
    if (Number.isNaN(parsed.getTime())) throw new AppError('submittedTo must be a valid date.', 400);
    parsed.setHours(23, 59, 59, 999);
    toDate = parsed;
  }

  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError('submittedFrom cannot be later than submittedTo.', 400);
  }

  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  };
};

const buildBulkEmailWhere = ({
  applicationIds,
  status,
  search,
  submittedFrom,
  submittedTo,
  academicYear,
}) => {
  const where = {};
  const hasApplicationIds = Array.isArray(applicationIds) && applicationIds.length > 0;
  const hasStatusFilter = Boolean(String(status || '').trim());
  const hasSearchFilter = Boolean(String(search || '').trim());
  const hasDateFilter = Boolean(String(submittedFrom || '').trim() || String(submittedTo || '').trim());
  const hasAcademicYearFilter = Boolean(String(academicYear || '').trim());

  if (hasApplicationIds) {
    const uniqueIds = [...new Set(applicationIds.map((value) => String(value).trim()).filter(Boolean))];
    if (!uniqueIds.length) throw new AppError('applicationIds contains no valid ids.', 400);
    where.id = { in: uniqueIds };
    return where;
  }

  if (!hasStatusFilter && !hasSearchFilter && !hasDateFilter && !hasAcademicYearFilter) {
    throw new AppError('Provide applicationIds or a status/search/date/academic year filter for bulk email.', 400);
  }

  if (hasStatusFilter) {
    const statuses = Array.isArray(status) ? status : String(status).split(',');
    where.status = { in: statuses.map((value) => String(value).trim()).filter(Boolean) };
  }

  if (hasSearchFilter) {
    const normalizedSearch = String(search).trim();
    where.applicant = {
      OR: [
        { fullName: { contains: normalizedSearch, mode: 'insensitive' } },
        { email: { contains: normalizedSearch, mode: 'insensitive' } },
      ],
    };
  }

  const submittedAtFilter = buildSubmittedAtWhere(submittedFrom, submittedTo);
  if (submittedAtFilter) where.submittedAt = submittedAtFilter;

  if (hasAcademicYearFilter) {
    const normalizedAy = String(academicYear).trim();
    const ayRange = parseAcademicYearRange(normalizedAy);
    if (ayRange) {
      if (!submittedAtFilter) {
        where.submittedAt = { gte: ayRange.from, lte: ayRange.to };
      }
      // Match records with an explicit academicYear OR legacy records (NULL) within the date range
      where.AND = [...(where.AND || []), { OR: [{ academicYear: normalizedAy }, { academicYear: null }] }];
    } else {
      where.academicYear = normalizedAy;
    }
  }

  return where;
};

const isSchemaDriftError = (err) => OPTIONAL_SCHEMA_ERROR_CODES.has(err?.code);

const buildExamScheduleCreateData = ({ applicationId, scheduledAt, location, type, examinerId }) => ({
  applicationId,
  scheduledAt,
  location: location || null,
  type: type || 'BOTH',
  ...(examinerId ? { examinerId } : {}),
});

const createExamScheduleRecord = async ({ applicationId, scheduledAt, location, type, examinerId }) => {
  try {
    return await prisma.examSchedule.create({
      data: buildExamScheduleCreateData({ applicationId, scheduledAt, location, type, examinerId }),
    });
  } catch (err) {
    if (examinerId && isSchemaDriftError(err)) {
      throw new AppError('Examiner assignment requires the latest database migration on the server. Apply the migration first, or schedule without assigning an examiner for now.', 400);
    }
    throw err;
  }
};

const loadLegacyExamSchedules = async (applicationId) => {
  const rows = await prisma.$queryRaw`
    SELECT
      es."id",
      es."application_id" AS "applicationId",
      es."scheduled_at" AS "scheduledAt",
      es."location",
      es."type"::text AS "type",
      es."status"::text AS "status",
      es."created_at" AS "createdAt"
    FROM "exam_schedules" es
    WHERE es."application_id" = ${applicationId}
    ORDER BY es."scheduled_at" DESC
  `;

  return rows.map((row) => ({
    ...row,
    examinerId: null,
    examiner: null,
  }));
};

const getLatestPreviousStatus = async (applicationId, currentStatus) => {
  const latestStatusChange = await prisma.activityLog.findFirst({
    where: {
      applicationId,
      toStatus: currentStatus,
      fromStatus: { not: null },
      action: { startsWith: 'Status ' },
      NOT: { fromStatus: currentStatus },
    },
    orderBy: { createdAt: 'desc' },
    select: { fromStatus: true },
  });

  return latestStatusChange?.fromStatus || null;
};

const applyStatusUpdate = async ({
  application,
  status,
  remarks,
  rejectionReason,
  examScore,
  interviewScore,
  interviewNotes,
  requirementChecklist,
  performedById,
}) => {
  const normalizedRejectionReason = String(rejectionReason || '').trim();
  let isRollback = false;

  if (application.status === status) {
    return application;
  }

  if (!isValidTransition(application.status, status)) {
    const previousStatus = await getLatestPreviousStatus(application.id, application.status);
    if (previousStatus !== status) {
      throw new AppError(`Invalid status transition from ${application.status} to ${status}`, 400);
    }
    isRollback = true;
  }

  const effectiveRejectionReason = normalizedRejectionReason || (isRollback ? String(application.rejectionReason || '').trim() : '');

  if (REJECTION_REQUIRED_STATUSES.includes(status) && !effectiveRejectionReason) {
    throw new AppError(`Rejection reason is required when setting status to ${status}.`, 400);
  }

  // Check General Average threshold (percentage scale: higher is better)
  const avgValue = application.generalAverage !== null && application.generalAverage !== undefined
    ? parseFloat(application.generalAverage)
    : null;
  if (status === 'EXAM_INTERVIEW' && avgValue !== null) {
    const settingsRows = await prisma.$queryRaw`SELECT "gwa_threshold" FROM "site_settings" WHERE "id" = 'default' LIMIT 1`;
    const threshold = settingsRows[0] ? parseFloat(settingsRows[0].gwa_threshold) : 83;
    if (avgValue < threshold) {
      throw new AppError(
        `Applicant General Average (${avgValue}%) does not meet the minimum threshold of ${threshold}%.`,
        400
      );
    }
  }

  if (status === 'ELIGIBILITY_SCREENING' && requirementChecklist && typeof requirementChecklist === 'object') {
    const allChecked = Object.values(requirementChecklist).every((value) => Boolean(value && value.checked));
    if (!allChecked) {
      throw new AppError('All requirement checklist items must be checked before moving to Eligibility Screening.', 400);
    }
  }

  const updateData = { status };
  if (remarks) updateData.adminRemarks = remarks;
  if (REJECTION_REQUIRED_STATUSES.includes(status)) {
    updateData.rejectionReason = effectiveRejectionReason;
  } else {
    updateData.rejectionReason = null;
  }
  if (examScore !== undefined && examScore !== null && examScore !== '') updateData.examScore = parseFloat(examScore);
  if (interviewScore !== undefined && interviewScore !== null && interviewScore !== '') updateData.interviewScore = parseFloat(interviewScore);
  if (interviewNotes) updateData.interviewNotes = interviewNotes;
  if (requirementChecklist && typeof requirementChecklist === 'object') {
    updateData.requirementChecklist = requirementChecklist;
  }

  // Compute general average for activity log traceability
  const parsedExam = examScore !== undefined && examScore !== null && examScore !== '' ? parseFloat(examScore) : null;
  const parsedInterview = interviewScore !== undefined && interviewScore !== null && interviewScore !== '' ? parseFloat(interviewScore) : null;
  const computedAverage = parsedExam !== null && parsedInterview !== null
    ? ((parsedExam + parsedInterview) / 2).toFixed(2)
    : null;

  // Wrap the DB writes in a transaction so the application update and its
  // activity log entry are always committed together or not at all.
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.application.update({ where: { id: application.id }, data: updateData });
    const scoreNote = computedAverage
      ? `Exam: ${parsedExam}, Interview: ${parsedInterview}, Average: ${computedAverage}`
      : parsedExam !== null
        ? `Exam Score: ${parsedExam}`
        : null;
    await tx.activityLog.create({
      data: {
        applicationId: application.id,
        performedById,
        action: isRollback ? `Status rolled back to ${status}` : `Status changed to ${status}`,
        fromStatus: application.status,
        toStatus: status,
        notes: remarks || scoreNote || effectiveRejectionReason || null,
      },
    });
    return result;
  });

  // Notifications and emails run after the transaction commits - they are
  // intentionally outside the transaction since they cannot be rolled back.
  await handleStatusNotification(application, status, remarks, effectiveRejectionReason, { isRollback });
  return updated;
};

const listApplications = async (req, res, next) => {
  try {
    const ALLOWED_SORT_FIELDS = ['submittedAt', 'updatedAt', 'gwa', 'status', 'examScore'];
  const {
    page = 1,
    limit = 20,
    status,
    search,
    submittedFrom,
    submittedTo,
    academicYear: rawAcademicYear,
    sortBy: rawSortBy = 'submittedAt',
    sortOrder: rawSortOrder = 'desc',
    hasExamScore,
    yearLevel,
  } = req.query;
  const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'submittedAt';
  const sortOrder = rawSortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const academicYear = String(rawAcademicYear || '').trim();

    const where = {};
    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      where.status = { in: statuses };
    }
    if (search) {
      const trimmed = search.replace(/^#/, '').trim();
      where.AND = [...(where.AND || []), {
        OR: [
          { id: { startsWith: trimmed, mode: 'insensitive' } },
          { lastName: { contains: trimmed, mode: 'insensitive' } },
          { firstName: { contains: trimmed, mode: 'insensitive' } },
          { applicant: { fullName: { contains: trimmed, mode: 'insensitive' } } },
          { applicant: { email: { contains: trimmed, mode: 'insensitive' } } },
        ],
      }];
    }
    if (hasExamScore === 'true') where.examScore = { not: null };
    if (yearLevel) where.yearLevel = yearLevel;
    const submittedAtFilter = buildSubmittedAtWhere(submittedFrom, submittedTo);
    if (submittedAtFilter) where.submittedAt = submittedAtFilter;
    if (academicYear) {
      const ayRange = parseAcademicYearRange(academicYear);
      if (ayRange) {
        if (!submittedAtFilter) {
          where.submittedAt = { gte: ayRange.from, lte: ayRange.to };
        }
        // Match records with an explicit academicYear OR legacy records (NULL) within the date range
        where.AND = [...(where.AND || []), { OR: [{ academicYear }, { academicYear: null }] }];
      } else {
        where.academicYear = academicYear;
      }
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          applicant: { select: { fullName: true, email: true } },
          requirementFiles: { select: { id: true } },
          corFiles: {
            orderBy: { uploadedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              uploadedAt: true,
              isApproved: true,
            },
          },
          _count: { select: { requirementFiles: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      success: true,
      applications,
      academicYear,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    let application;
    try {
      application = await prisma.application.findUnique({
        where: { id },
        include: {
          applicant: { select: { id: true, email: true, fullName: true, createdAt: true } },
          requirementFiles: true,
          corFiles: { orderBy: { uploadedAt: 'desc' } },
          activityLogs: {
            orderBy: { createdAt: 'desc' },
            include: { performedBy: { select: { fullName: true, role: true } } },
          },
          examSchedules: {
            orderBy: { scheduledAt: 'desc' },
            include: { examiner: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      });
    } catch (err) {
      if (!isSchemaDriftError(err)) throw err;
      application = await prisma.application.findUnique({
        where: { id },
        include: {
          applicant: { select: { id: true, email: true, fullName: true, createdAt: true } },
          requirementFiles: true,
          corFiles: { orderBy: { uploadedAt: 'desc' } },
          activityLogs: {
            orderBy: { createdAt: 'desc' },
            include: { performedBy: { select: { fullName: true, role: true } } },
          },
        },
      });
      if (application) {
        application.examSchedules = await loadLegacyExamSchedules(id);
      }
    }
    if (!application) throw new AppError('Application not found', 404);
    res.json({ success: true, application });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, rejectionReason, examScore, interviewScore, interviewNotes, requirementChecklist } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);

    const updated = await applyStatusUpdate({
      application,
      status,
      remarks,
      rejectionReason,
      examScore,
      interviewScore,
      interviewNotes,
      requirementChecklist,
      performedById: req.user.id,
    });

    res.json({ success: true, message: 'Status updated', application: updated });
  } catch (err) {
    next(err);
  }
};

const updateApplicationFields = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) throw new AppError('Application not found', 404);

    const {
      lastName, firstName, middleName, placeOfBirth, birthdate, sex, gender,
      age, address, contact,
      fatherName, fatherOccupation, motherName, motherOccupation,
      numDependents, familyIncome, incomeSource,
      school, schoolAddress, yearGraduated, generalAverage,
      collegePreferences, soloParent, fourPs, priorScholarship, scholarshipType,
    } = req.body;

    const data = {};
    if (lastName !== undefined) data.lastName = lastName;
    if (firstName !== undefined) data.firstName = firstName;
    if (middleName !== undefined) data.middleName = middleName || null;
    if (placeOfBirth !== undefined) data.placeOfBirth = placeOfBirth || null;
    if (birthdate !== undefined) data.birthdate = birthdate ? new Date(birthdate) : null;
    if (sex !== undefined) data.sex = sex;
    if (gender !== undefined) data.gender = gender;
    if (age !== undefined) data.age = age ? parseInt(age) : null;
    if (address !== undefined) data.address = address;
    if (contact !== undefined) data.contact = contact;
    if (fatherName !== undefined) data.fatherName = fatherName;
    if (fatherOccupation !== undefined) data.fatherOccupation = fatherOccupation || null;
    if (motherName !== undefined) data.motherName = motherName;
    if (motherOccupation !== undefined) data.motherOccupation = motherOccupation || null;
    if (numDependents !== undefined) data.numDependents = numDependents !== '' ? parseInt(numDependents) : null;
    if (familyIncome !== undefined) data.familyIncome = familyIncome !== '' ? parseFloat(familyIncome) : null;
    if (incomeSource !== undefined) data.incomeSource = incomeSource || null;
    if (school !== undefined) data.school = school;
    if (schoolAddress !== undefined) data.schoolAddress = schoolAddress || null;
    if (yearGraduated !== undefined) data.yearGraduated = yearGraduated ? parseInt(yearGraduated) : null;
    if (generalAverage !== undefined) data.generalAverage = generalAverage !== '' ? parseFloat(generalAverage) : null;
    if (collegePreferences !== undefined) data.collegePreferences = collegePreferences;
    if (soloParent !== undefined) data.soloParent = soloParent === true || soloParent === 'true';
    if (fourPs !== undefined) data.fourPs = fourPs === true || fourPs === 'true';
    if (priorScholarship !== undefined) data.priorScholarship = priorScholarship === true || priorScholarship === 'true';
    if (scholarshipType !== undefined) data.scholarshipType = scholarshipType || null;

    const updated = await prisma.application.update({ where: { id }, data });

    await prisma.activityLog.create({
      data: {
        applicationId: id,
        performedById: req.user.id,
        action: 'Application fields updated by admin',
        fromStatus: application.status,
        toStatus: application.status,
      },
    });

    res.json({ success: true, message: 'Application updated', application: updated });
  } catch (err) {
    next(err);
  }
};

const batchUpdateStatus = async (req, res, next) => {
  try {
    const { applicationIds, status, remarks, rejectionReason, examScore, interviewScore, interviewNotes, requirementChecklist } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new AppError('applicationIds is required and must contain at least one id.', 400);
    }
    if (!status) throw new AppError('Target status is required.', 400);

    const uniqueIds = [...new Set(applicationIds)];
    const applications = await prisma.application.findMany({
      where: { id: { in: uniqueIds } },
      include: { applicant: true },
    });
    const appMap = new Map(applications.map((app) => [app.id, app]));

    const processed = [];
    const skipped = [];

    for (const appId of uniqueIds) {
      const application = appMap.get(appId);
      if (!application) {
        skipped.push({ id: appId, reason: 'Application not found.' });
        continue;
      }

      try {
        const updated = await applyStatusUpdate({
          application,
          status,
          remarks,
          rejectionReason,
          examScore,
          interviewScore,
          interviewNotes,
          requirementChecklist,
          performedById: req.user.id,
        });
        processed.push({ id: appId, previousStatus: application.status, newStatus: updated.status });
      } catch (err) {
        skipped.push({ id: appId, reason: err.message || 'Failed to update status.' });
      }
    }

    res.json({
      success: true,
      message: `Batch status update complete. Updated ${processed.length}, skipped ${skipped.length}.`,
      summary: {
        requested: uniqueIds.length,
        updated: processed.length,
        skipped: skipped.length,
      },
      processed,
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

const previewBulkEmailRecipients = async (req, res, next) => {
  try {
    const {
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
    } = req.body;

    const where = buildBulkEmailWhere({
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
    });

    const [count, sample] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        take: 10,
        orderBy: { submittedAt: 'desc' },
        include: {
          applicant: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      summary: {
        count,
        maxRecipients: BULK_EMAIL_MAX_RECIPIENTS,
        exceedsMax: count > BULK_EMAIL_MAX_RECIPIENTS,
      },
      recipients: sample.map((application) => ({
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        applicant: {
          fullName: application.applicant?.fullName || '',
          email: application.applicant?.email || '',
        },
      })),
    });
  } catch (err) {
    next(err);
  }
};

const sendBulkEmailTest = async (req, res, next) => {
  try {
    const { subject, greeting, message } = req.body;

    const emailSubject = String(subject || '').trim();
    const emailBody = String(message || '').trim();
    const emailGreeting = String(greeting || '').trim();

    if (!emailSubject) throw new AppError('Email subject is required.', 400);
    if (!emailBody) throw new AppError('Email message is required.', 400);

    await sendEmail({
      to: req.user.email,
      subject: emailSubject,
      template: 'adminBroadcast',
      data: {
        name: req.user.fullName || 'Administrator',
        greeting: emailGreeting,
        message: emailBody,
        portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
      },
      throwOnError: true,
    });

    res.json({ success: true, message: `Test email sent to ${req.user.email}.` });
  } catch (err) {
    next(err);
  }
};

const bulkEmailApplicants = async (req, res, next) => {
  try {
    const {
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
      subject,
      greeting,
      message,
    } = req.body;

    const emailSubject = String(subject || '').trim();
    const emailBody = String(message || '').trim();
    const emailGreeting = String(greeting || '').trim();

    if (!emailSubject) throw new AppError('Email subject is required.', 400);
    if (!emailBody) throw new AppError('Email message is required.', 400);

    const where = buildBulkEmailWhere({
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
    });

    const applications = await prisma.application.findMany({
      where,
      include: {
        applicant: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!applications.length) {
      throw new AppError('No recipients found for the given filter.', 404);
    }
    if (applications.length > BULK_EMAIL_MAX_RECIPIENTS) {
      throw new AppError(`Recipient count (${applications.length}) exceeds the max allowed (${BULK_EMAIL_MAX_RECIPIENTS}) for one send. Narrow your filters.`, 400);
    }
    await ensureAdminDailyCap(req.user.id, applications.length);

    const sent = [];
    const skipped = [];

    for (const application of applications) {
      const recipientEmail = String(application.applicant?.email || '').trim().toLowerCase();
      if (!recipientEmail || !emailPattern.test(recipientEmail)) {
        skipped.push({ id: application.id, reason: 'No valid applicant email found.' });
        continue;
      }

      try {
        await sendEmail({
          to: recipientEmail,
          subject: emailSubject,
          template: 'adminBroadcast',
          data: {
            name: application.applicant.fullName,
            greeting: emailGreeting,
            message: emailBody,
            refId: application.id.slice(0, 8).toUpperCase(),
            status: application.status,
            portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
          },
          throwOnError: true,
        });

        await prisma.activityLog.create({
          data: {
            applicationId: application.id,
            performedById: req.user.id,
            action: 'Bulk email sent',
            notes: emailSubject,
          },
        });
        await recordCommunication({
          applicationId: application.id,
          userId: application.applicant.id,
          channel: 'EMAIL',
          subject: emailSubject,
          message: emailBody,
          metadata: { template: 'adminBroadcast', status: application.status, type: 'bulk-send-now' },
          createdById: req.user.id,
        });

        sent.push({ id: application.id, email: recipientEmail });
      } catch (err) {
        skipped.push({ id: application.id, reason: err.message || 'Failed to send email.' });
      }
    }

    res.json({
      success: true,
      message: `Bulk email complete. Sent ${sent.length}, skipped ${skipped.length}.`,
      summary: {
        requested: applications.length,
        sent: sent.length,
        skipped: skipped.length,
      },
      sent,
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

const scheduleBulkEmailApplicants = async (req, res, next) => {
  try {
    const {
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
      subject,
      greeting,
      message,
      runAt,
    } = req.body;

    const emailSubject = String(subject || '').trim();
    const emailBody = String(message || '').trim();
    const emailGreeting = String(greeting || '').trim();
    if (!emailSubject) throw new AppError('Email subject is required.', 400);
    if (!emailBody) throw new AppError('Email message is required.', 400);

    const runAtDate = new Date(runAt);
    if (Number.isNaN(runAtDate.getTime())) throw new AppError('runAt must be a valid datetime.', 400);
    if (runAtDate.getTime() < Date.now() + 30 * 1000) throw new AppError('Scheduled time must be at least 30 seconds in the future.', 400);

    const filterPayload = {
      applicationIds,
      status,
      search,
      submittedFrom,
      submittedTo,
      academicYear,
    };
    const where = buildBulkEmailWhere(filterPayload);
    const count = await prisma.application.count({ where });
    if (!count) throw new AppError('No recipients found for the given filter.', 404);
    if (count > BULK_EMAIL_MAX_RECIPIENTS) throw new AppError(`Recipient count (${count}) exceeds max allowed (${BULK_EMAIL_MAX_RECIPIENTS}) for one send.`, 400);

    const job = await prisma.emailJob.create({
      data: {
        type: 'BULK_EMAIL',
        status: 'PENDING',
        runAt: runAtDate,
        maxAttempts: EMAIL_JOB_DEFAULT_MAX_ATTEMPTS,
        createdById: req.user.id,
        payload: {
          ...filterPayload,
          subject: emailSubject,
          greeting: emailGreeting,
          message: emailBody,
          scheduledBy: { id: req.user.id, email: req.user.email, fullName: req.user.fullName },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Bulk email scheduled for ${runAtDate.toISOString()}.`,
      job: { id: job.id, status: job.status, runAt: job.runAt, createdAt: job.createdAt },
      summary: { recipients: count },
    });
  } catch (err) {
    next(err);
  }
};

const listEmailJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (currentPage - 1) * take;
    const where = {};
    if (String(status || '').trim()) where.status = String(status).trim();

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        skip,
        take,
        orderBy: [{ runAt: 'desc' }, { createdAt: 'desc' }],
        include: { createdBy: { select: { id: true, fullName: true, email: true, role: true } } },
      }),
      prisma.emailJob.count({ where }),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: { page: currentPage, limit: take, total, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
};

const handleStatusNotification = async (application, newStatus, remarks, rejectionReason, options = {}) => {
  const user = application.applicant;
  const refId = application.id.slice(0, 8).toUpperCase();
  const isRollback = options.isRollback === true;

  if (isRollback) {
    const label = STATUS_LABELS[newStatus] || newStatus.replace(/_/g, ' ');
    const message = `An administrator corrected your application status. It is now set back to ${label}.${remarks ? ` Remarks: ${remarks}` : ''}`;

    await createNotification({
      userId: user.id,
      applicationId: application.id,
      title: 'Application Status Corrected',
      message,
      type: 'INFO',
    });
    await recordCommunication({
      applicationId: application.id,
      userId: user.id,
      channel: 'PORTAL_NOTICE',
      subject: 'Application Status Corrected',
      message,
      metadata: { status: newStatus, rollback: true },
      createdById: null,
    });
    return;
  }

  const notificationMap = {
    INCOMPLETE: {
      title: 'Action Required: Incomplete Application',
      message: `Your application requirements are incomplete. Remarks: ${remarks || 'Please review and resubmit.'}`,
      type: 'WARNING',
      email: {
        subject: 'Action Required: Complete Your Requirements',
        template: 'incomplete',
      },
    },
    ELIGIBILITY_SCREENING: {
      title: 'Application Under Eligibility Review',
      message: 'Your application has passed the initial check and is now under eligibility screening.',
      type: 'INFO',
    },
    NOT_QUALIFIED: {
      title: 'Eligibility Screening Result',
      message: 'Unfortunately, your application did not meet the eligibility requirements.',
      type: 'ERROR',
      email: {
        subject: 'Scholarship Application - Eligibility Result',
        template: 'notQualified',
      },
    },
    EXAM_INTERVIEW: {
      title: 'Exam/Interview Stage',
      message: 'Congratulations! You have qualified for the exam and interview stage. Watch for your schedule.',
      type: 'SUCCESS',
    },
    FAILED_EXAM: {
      title: 'Exam/Interview Result',
      message: 'We regret to inform you that you did not pass the exam/interview.',
      type: 'ERROR',
      email: {
        subject: 'Scholarship Application - Exam/Interview Result',
        template: 'failedExam',
      },
    },
    APPROVED: {
      title: 'Application Approved!',
      message: 'Congratulations! Your application has been approved. Please submit your Certificate of Registration (COR).',
      type: 'SUCCESS',
      email: {
        subject: 'Congratulations! Please Submit Your COR',
        template: 'approved',
      },
    },
    COR_REJECTED: {
      title: 'COR Rejected - Resubmission Required',
      message: `Your COR was rejected. Reason: ${rejectionReason || 'Please review and resubmit.'}`,
      type: 'ERROR',
      email: {
        subject: 'Action Required: Resubmit Your COR',
        template: 'corRejected',
      },
    },
    ACCEPTED: {
      title: 'Welcome, Scholar!',
      message: 'Congratulations! Your scholarship application has been fully accepted. Welcome to the program!',
      type: 'SUCCESS',
      email: {
        subject: 'Welcome, Scholar! Your Application is Confirmed',
        template: 'accepted',
      },
    },
    REJECTED: {
      title: 'Scholarship Application Update',
      message: `We regret that your application was not successful. ${rejectionReason || ''}`,
      type: 'ERROR',
      email: {
        subject: 'Scholarship Application Update',
        template: 'rejected',
      },
    },
  };

  const config = notificationMap[newStatus];
  if (!config) return;

  await createNotification({
    userId: user.id,
    applicationId: application.id,
    title: config.title,
    message: config.message,
    type: config.type,
  });
  await recordCommunication({
    applicationId: application.id,
    userId: user.id,
    channel: 'PORTAL_NOTICE',
    subject: config.title,
    message: config.message,
    metadata: { status: newStatus },
    createdById: null,
  });

  if (config.email) {
    await sendEmail({
      to: user.email,
      subject: config.email.subject,
      template: config.email.template,
      data: {
        name: user.fullName,
        refId,
        remarks,
        rejectionReason,
        portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
      },
    });
    await recordCommunication({
      applicationId: application.id,
      userId: user.id,
      channel: 'EMAIL',
      subject: config.email.subject,
      message: rejectionReason || remarks || '',
      metadata: { template: config.email.template, status: newStatus },
      createdById: null,
    });
  }
};

const scheduleExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledAt, location, type, examinerId } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (application.status !== 'EXAM_INTERVIEW') {
      throw new AppError('Application must be in EXAM_INTERVIEW status', 400);
    }

    let examiner = null;
    if (examinerId) {
      examiner = await prisma.user.findFirst({
        where: {
          id: examinerId,
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'] },
        },
        select: { id: true, fullName: true },
      });
      if (!examiner) throw new AppError('Selected examiner was not found.', 400);
    }

    const schedule = await createExamScheduleRecord({
      applicationId: id,
      examinerId: examiner?.id,
      scheduledAt: parseManilaScheduleInput(scheduledAt),
      location,
      type,
    });

    // ExamSchedule is the authoritative source for scheduling data.
    // interviewDate on Application is a deprecated legacy field - do not write to it.

    await createNotification({
      userId: application.applicant.id,
      applicationId: id,
      title: 'Exam/Interview Scheduled',
      message: `Your exam/interview is scheduled for ${formatManilaDateTime(parseManilaScheduleInput(scheduledAt))}${location ? ` at ${location}` : ''}${examiner?.fullName ? `. Examiner: ${examiner.fullName}` : ''}.`,
      type: 'INFO',
    });

    await sendEmail({
      to: application.applicant.email,
      subject: 'Your Exam/Interview is Scheduled',
      template: 'examScheduled',
      data: {
        name: application.applicant.fullName,
        scheduledAt: formatManilaDateTime(parseManilaScheduleInput(scheduledAt)),
        location,
        type,
        examinerName: examiner?.fullName || '',
        portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
      },
    });

    await prisma.activityLog.create({
      data: {
        applicationId: id,
        performedById: req.user.id,
        action: `Scheduled ${type} for ${formatManilaDate(parseManilaScheduleInput(scheduledAt))}`,
        notes: examiner?.fullName ? `Assigned examiner: ${examiner.fullName}` : null,
      },
    });

    res.json({ success: true, message: 'Exam/interview scheduled', schedule });
  } catch (err) {
    next(err);
  }
};

const bulkScheduleExam = async (req, res, next) => {
  try {
    const { applicationIds, scheduledAt, location, type, examinerId } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new AppError('applicationIds must be a non-empty array.', 400);
    }
    if (!scheduledAt) throw new AppError('scheduledAt is required.', 400);
    const scheduledDate = parseManilaScheduleInput(scheduledAt);
    if (isNaN(scheduledDate.getTime())) throw new AppError('scheduledAt must be a valid date.', 400);
    if (scheduledDate <= new Date()) throw new AppError('Scheduled date must be in the future.', 400);

    const uniqueIds = [...new Set(applicationIds)];
    let examiner = null;
    if (examinerId) {
      examiner = await prisma.user.findFirst({
        where: {
          id: examinerId,
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'] },
        },
        select: { id: true, fullName: true },
      });
      if (!examiner) throw new AppError('Selected examiner was not found.', 400);
    }
    const applications = await prisma.application.findMany({
      where: { id: { in: uniqueIds }, status: 'EXAM_INTERVIEW' },
      include: { applicant: true },
    });

    const foundIds = new Set(applications.map((a) => a.id));
    const skipped = uniqueIds
      .filter((id) => !foundIds.has(id))
      .map((id) => ({ id, reason: 'Not found or not in EXAM_INTERVIEW status.' }));

    const scheduled = [];
    const schedType = type || 'BOTH';
    const schedLocation = location || null;

    for (const application of applications) {
      try {
        const schedule = await createExamScheduleRecord({
          applicationId: application.id,
          examinerId: examiner?.id,
          scheduledAt: scheduledDate,
          location: schedLocation,
          type: schedType,
        });

        await createNotification({
          userId: application.applicant.id,
          applicationId: application.id,
          title: 'Exam/Interview Scheduled',
          message: `Your exam/interview is scheduled for ${formatManilaDateTime(scheduledDate)}${schedLocation ? ` at ${schedLocation}` : ''}${examiner?.fullName ? `. Examiner: ${examiner.fullName}` : ''}.`,
          type: 'INFO',
        });

        await sendEmail({
          to: application.applicant.email,
          subject: 'Your Exam/Interview is Scheduled',
          template: 'examScheduled',
          data: {
            name: application.applicant.fullName,
            scheduledAt: formatManilaDateTime(scheduledDate),
            location: schedLocation,
            type: schedType,
            examinerName: examiner?.fullName || '',
            portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
          },
        });

        await prisma.activityLog.create({
          data: {
            applicationId: application.id,
            performedById: req.user.id,
            action: `Bulk scheduled ${schedType} for ${formatManilaDate(scheduledDate)}`,
            notes: examiner?.fullName ? `Assigned examiner: ${examiner.fullName}` : null,
          },
        });

        scheduled.push({ id: application.id, scheduleId: schedule.id });
      } catch (err) {
        skipped.push({ id: application.id, reason: err.message || 'Failed to schedule.' });
      }
    }

    res.json({
      success: true,
      message: `Bulk schedule complete. Scheduled: ${scheduled.length}, skipped: ${skipped.length}.`,
      summary: { requested: uniqueIds.length, scheduled: scheduled.length, skipped: skipped.length },
      scheduled,
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

const listExamScheduleRecords = async (req, res, next) => {
  try {
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;
    const search = String(req.query.search || '').trim();

    const where = search
      ? {
          OR: [
            { application: { applicant: { fullName: { contains: search, mode: 'insensitive' } } } },
            { application: { applicant: { email: { contains: search, mode: 'insensitive' } } } },
            { application: { school: { contains: search, mode: 'insensitive' } } },
            { location: { contains: search, mode: 'insensitive' } },
            { examiner: { fullName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [total, records] = await Promise.all([
      prisma.examSchedule.count({ where }),
      prisma.examSchedule.findMany({
        where,
        include: {
          application: {
            select: {
              id: true,
              school: true,
              status: true,
              generalAverage: true,
              applicant: { select: { fullName: true, email: true } },
            },
          },
          examiner: { select: { fullName: true, role: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { scheduledAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const listAssignableExaminers = async (_req, res, next) => {
  try {
    const examiners = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'] },
      },
      orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      take: 200,
    });

    res.json({ success: true, examiners: examiners.map((user) => ({ ...user, role: getEffectiveRole(user) })) });
  } catch (err) {
    next(err);
  }
};

const reviewCOR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { corFiles: { orderBy: { uploadedAt: 'desc' }, take: 1 }, applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (application.status !== 'COR_SUBMITTED') {
      throw new AppError('Application must be in COR_SUBMITTED status', 400);
    }

    const latestCOR = application.corFiles[0];
    if (latestCOR) {
      await prisma.corFile.update({
        where: { id: latestCOR.id },
        data: { isApproved: approved, reviewedAt: new Date() },
      });
    }

    const newStatus = approved ? 'ACCEPTED' : 'COR_REJECTED';
    await prisma.application.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: !approved ? reason : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        applicationId: id,
        performedById: req.user.id,
        action: approved ? 'COR Approved' : 'COR Rejected',
        fromStatus: 'COR_SUBMITTED',
        toStatus: newStatus,
        notes: reason || null,
      },
    });

    await handleStatusNotification(
      { ...application, applicant: application.applicant },
      newStatus,
      null,
      reason
    );

    res.json({ success: true, message: approved ? 'COR approved - applicant accepted' : 'COR rejected' });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const academicYear = String(req.query.academicYear || '').trim();
    const where = academicYear ? { academicYear } : {};
    const VIGAN_BARANGAYS = [
      'Ayusan Norte','Ayusan Sur','Barangay I (Poblacion)','Barangay II (Poblacion)',
      'Barangay III (Poblacion)','Barangay IV (Poblacion)','Barangay V (Poblacion)',
      'Barangay VI (Poblacion)','Barangay VII (Poblacion)','Barangay VIII (Poblacion)',
      'Barangay IX (Poblacion)','Barraca','Beddeng Daya','Beddeng Laud','Bongtolan',
      'Bulala','Cabalangegan','Cabaroan Daya','Cabaroan Laud','Camangaan','Capangpangan',
      'Mindoro','Nagsangalan','Pantay Daya','Pantay Fatima','Pantay Laud','Paoa',
      'Paratong','Pong-ol','Purok-a-bassit','Purok-a-dakkel','Raois','Rugsuanan',
      'Salindeg','San Jose','San Julian Norte','San Julian Sur','San Pedro','Tamag',
    ];

    const [total, byStatus, recentLogs, topSchoolsRaw, coursePreferenceRows, rejectionRaw, appealStats, barangayAddresses, pendingRenewals] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          application: { include: { applicant: { select: { fullName: true } } } },
          performedBy: { select: { fullName: true } },
        },
      }),
      prisma.application.groupBy({
        by: ['school'],
        where: { ...where, school: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { school: 'desc' } },
        take: 8,
      }),
      prisma.application.findMany({
        where,
        select: {
          course: true,
          collegePreferences: true,
        },
      }),
      prisma.application.groupBy({
        by: ['rejectionReason'],
        where: {
          ...where,
          status: { in: ['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM', 'COR_REJECTED'] },
          rejectionReason: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { rejectionReason: 'desc' } },
        take: 8,
      }),
      prisma.appeal.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.application.findMany({
        where: { ...where, address: { not: null } },
        select: { address: true },
      }),
      prisma.scholarshipRenewal.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);

    const barangayCounts = {};
    for (const { address } of barangayAddresses) {
      const match = VIGAN_BARANGAYS.find((b) => address.toLowerCase().includes(b.toLowerCase()));
      if (match) barangayCounts[match] = (barangayCounts[match] || 0) + 1;
    }
    const topBarangays = Object.entries(barangayCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const preferredCourseCounts = {};
    for (const { course, collegePreferences } of coursePreferenceRows) {
      const firstPreferredCourse = Array.isArray(collegePreferences)
        ? collegePreferences
            .map((preference) => (typeof preference?.course === 'string' ? preference.course.trim() : ''))
            .find(Boolean)
        : '';
      const fallbackCourse = typeof course === 'string' ? course.trim() : '';
      const courseLabel = firstPreferredCourse || fallbackCourse;

      if (!courseLabel) continue;
      preferredCourseCounts[courseLabel] = (preferredCourseCounts[courseLabel] || 0) + 1;
    }

    const topPreferredCourses = Object.entries(preferredCourseCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    const stats = {
      total,
      pendingReview: statusCounts.PENDING_REVIEW || 0,
      eligibilityScreening: statusCounts.ELIGIBILITY_SCREENING || 0,
      examInterview: statusCounts.EXAM_INTERVIEW || 0,
      approved: statusCounts.APPROVED || 0,
      accepted: statusCounts.ACCEPTED || 0,
      rejected: (statusCounts.REJECTED || 0) + (statusCounts.NOT_QUALIFIED || 0) + (statusCounts.FAILED_EXAM || 0),
      byStatus: statusCounts,
      funnel: {
        submitted: total,
        screened: (statusCounts.ELIGIBILITY_SCREENING || 0) + (statusCounts.EXAM_INTERVIEW || 0) + (statusCounts.APPROVED || 0) + (statusCounts.COR_SUBMITTED || 0) + (statusCounts.ACCEPTED || 0),
        exam: (statusCounts.EXAM_INTERVIEW || 0) + (statusCounts.FAILED_EXAM || 0),
        approved: statusCounts.APPROVED || 0,
        accepted: statusCounts.ACCEPTED || 0,
      },
      trends: {
        schools: topSchoolsRaw.map((row) => ({ label: row.school || 'Unknown', count: row._count._all })),
        courses: topPreferredCourses,
        barangays: topBarangays,
      },
      rejectionReasons: rejectionRaw.map((row) => ({ reason: row.rejectionReason || 'Unspecified', count: row._count._all })),
      appeals: Object.fromEntries(appealStats.map((item) => [item.status, item._count._all])),
      pendingRenewals,
    };

    res.json({ success: true, academicYear, stats, recentActivity: recentLogs });
  } catch (err) {
    next(err);
  }
};

const sendManualNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, type } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);

    await createNotification({
      userId: application.applicantId,
      applicationId: id,
      title,
      message,
      type: type || 'INFO',
    });

    await prisma.communicationLog.create({
      data: {
        applicationId: id,
        userId: application.applicantId,
        channel: 'IN_APP',
        direction: 'OUTBOUND',
        subject: title,
        message,
        createdById: req.user.id,
      },
    });

    res.json({ success: true, message: 'Notification sent' });
  } catch (err) {
    next(err);
  }
};

const getActivityLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await prisma.activityLog.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
      include: { performedBy: { select: { fullName: true, role: true } } },
    });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

const listBulkEmailLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', sentFrom, sentTo, academicYear: rawAcademicYear } = req.query;
    const academicYear = String(rawAcademicYear || '').trim();
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (currentPage - 1) * take;

    const where = { action: 'Bulk email sent' };

    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { notes: { contains: normalizedSearch, mode: 'insensitive' } },
        { performedBy: { fullName: { contains: normalizedSearch, mode: 'insensitive' } } },
        { performedBy: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
        { application: { applicant: { fullName: { contains: normalizedSearch, mode: 'insensitive' } } } },
        { application: { applicant: { email: { contains: normalizedSearch, mode: 'insensitive' } } } },
      ];
    }

    const sentAtFilter = buildSubmittedAtWhere(sentFrom, sentTo);
    if (sentAtFilter) where.createdAt = sentAtFilter;
    if (academicYear) where.application = { ...(where.application || {}), academicYear };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: {
            select: { id: true, fullName: true, email: true },
          },
          application: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              applicant: { select: { fullName: true, email: true } },
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: currentPage,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
      academicYear,
    });
  } catch (err) {
    next(err);
  }
};

const listAppeals = async (req, res, next) => {
  try {
    const { status = '', page = 1, limit = 20 } = req.query;
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (currentPage - 1) * take;
    const where = {};
    if (String(status).trim()) where.status = String(status).trim();

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: { select: { id: true, fullName: true, email: true } },
          application: { select: { id: true, status: true, academicYear: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      prisma.appeal.count({ where }),
    ]);

    res.json({
      success: true,
      appeals,
      pagination: { page: currentPage, limit: take, total, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
};

const resolveAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (!['APPROVED', 'DENIED'].includes(normalizedStatus)) throw new AppError('status must be APPROVED or DENIED.', 400);
    const reason = String(resolution || '').trim();
    if (!reason) throw new AppError('resolution is required.', 400);

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: { applicant: true, application: true },
    });
    if (!appeal) throw new AppError('Appeal not found.', 404);
    if (appeal.status !== 'PENDING') throw new AppError('Appeal is already resolved.', 400);

    const updated = await prisma.appeal.update({
      where: { id },
      data: {
        status: normalizedStatus,
        resolution: reason,
        reviewedById: req.user.id,
      },
    });

    if (normalizedStatus === 'APPROVED') {
      const currentAppStatus = appeal.application.status;
      const revertTo = APPEAL_REVERT_STATUS_MAP[currentAppStatus];

      if (revertTo) {
        await prisma.application.update({
          where: { id: appeal.applicationId },
          data: { status: revertTo, rejectionReason: null },
        });

        await prisma.activityLog.create({
          data: {
            applicationId: appeal.applicationId,
            performedById: req.user.id,
            action: `Appeal approved - application reinstated to ${revertTo}`,
            fromStatus: currentAppStatus,
            toStatus: revertTo,
            notes: reason,
          },
        });

        const stageLabels = {
          PENDING_REVIEW: 'Pending Review',
          ELIGIBILITY_SCREENING: 'Eligibility Screening',
          EXAM_INTERVIEW: 'Exam / Interview',
        };
        const stageLabel = stageLabels[revertTo] || revertTo;

        await createNotification({
          userId: appeal.applicantId,
          applicationId: appeal.applicationId,
          title: 'Appeal Approved - Application Reinstated',
          message: `Your appeal has been approved. Your application has been reinstated to the ${stageLabel} stage. Please monitor your portal for further updates.`,
          type: 'SUCCESS',
        });
        await recordCommunication({
          applicationId: appeal.applicationId,
          userId: appeal.applicantId,
          channel: 'PORTAL_NOTICE',
          subject: 'Appeal Approved - Application Reinstated',
          message: reason,
          metadata: { appealId: id, appealStatus: normalizedStatus, revertedTo: revertTo },
          createdById: req.user.id,
        });
      } else {
        // Application is in an unexpected status - still notify, but no automatic reversion
        await createNotification({
          userId: appeal.applicantId,
          applicationId: appeal.applicationId,
          title: 'Appeal Approved',
          message: 'Your appeal has been approved. An administrator will contact you regarding your application status.',
          type: 'SUCCESS',
        });
        await recordCommunication({
          applicationId: appeal.applicationId,
          userId: appeal.applicantId,
          channel: 'PORTAL_NOTICE',
          subject: 'Appeal Approved',
          message: reason,
          metadata: { appealId: id, appealStatus: normalizedStatus },
          createdById: req.user.id,
        });
      }
    } else {
      await createNotification({
        userId: appeal.applicantId,
        applicationId: appeal.applicationId,
        title: 'Appeal Denied',
        message: `Your appeal has been reviewed and denied. Reason: ${reason}`,
        type: 'ERROR',
      });
      await recordCommunication({
        applicationId: appeal.applicationId,
        userId: appeal.applicantId,
        channel: 'PORTAL_NOTICE',
        subject: 'Appeal Denied',
        message: reason,
        metadata: { appealId: id, appealStatus: normalizedStatus },
        createdById: req.user.id,
      });
    }

    res.json({ success: true, message: 'Appeal resolved.', appeal: updated });
  } catch (err) {
    next(err);
  }
};

const getAdminNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const where = { userId: req.user.id };

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.count({ where }),
    ]);

    res.json({ success: true, notifications, unreadCount, total });
  } catch (err) {
    next(err);
  }
};

const markAdminNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const markAllAdminNotificationsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    if (!isPrimaryAdminEmail(req.user.email)) {
      throw new AppError(`Only ${PRIMARY_ADMIN_EMAIL} can manage admin users.`, 403);
    }

    const { role, search } = req.query;
    const where = { AND: [] };

    // Restrict user control to admin accounts only by default.
    const requestedRole = String(role || '').trim().toUpperCase();
    if (requestedRole && ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER', 'APPLICANT'].includes(requestedRole)) {
      if (requestedRole === 'SUPER_ADMIN' && PRIMARY_ADMIN_EMAIL) {
        where.AND.push({
          OR: [
            { role: requestedRole },
            { email: PRIMARY_ADMIN_EMAIL },
          ],
        });
      } else {
        where.AND.push({ role: requestedRole });
      }
    } else {
      where.AND.push({
        OR: [
          { role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'] } },
          ...(PRIMARY_ADMIN_EMAIL ? [{ email: PRIMARY_ADMIN_EMAIL }] : []),
        ],
      });
    }

    if (search) {
      where.AND.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const users = await prisma.user.findMany({
      where: where.AND.length ? where : undefined,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      take: 200,
    });

    const normalizedUsers = users.map((user) => ({
      ...user,
      role: getEffectiveRole(user),
    }));

    res.json({ success: true, users: normalizedUsers });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    if (!isPrimaryAdminEmail(req.user.email)) {
      throw new AppError(`Only ${PRIMARY_ADMIN_EMAIL} can manage admin users.`, 403);
    }

    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER', 'APPLICANT'];
    if (!allowedRoles.includes(role)) {
      throw new AppError(`Role must be one of: ${allowedRoles.join(', ')}.`, 400);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true },
    });
    if (!target) throw new AppError('User not found.', 404);

    if (target.id === req.user.id) {
      throw new AppError('You cannot change your own role.', 400);
    }

    if (target.role === 'APPLICANT' && role !== 'APPLICANT') {
      throw new AppError('Applicants cannot be promoted to admin roles from this panel.', 400);
    }

    if (target.role === role) {
      return res.json({ success: true, message: 'Role is already set.', user: target });
    }

    if (['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'].includes(target.role) && role === 'APPLICANT') {
      const adminCount = await prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'] } } });
      if (adminCount <= 1) {
        throw new AppError('At least one admin account must remain.', 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    res.json({
      success: true,
      message: `${updated.fullName} is now ${updated.role}.`,
      user: updated,
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (!isPrimaryAdminEmail(req.user.email)) {
      throw new AppError(`Only ${PRIMARY_ADMIN_EMAIL} can delete users.`, 403);
    }

    const { id } = req.params;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true },
    });
    if (!target) throw new AppError('User not found.', 404);

    if (target.id === req.user.id) {
      throw new AppError('You cannot delete your own account.', 400);
    }

    const normalizedPrimaryEmail = String(PRIMARY_ADMIN_EMAIL || '').trim().toLowerCase();
    if (normalizedPrimaryEmail && String(target.email || '').trim().toLowerCase() === normalizedPrimaryEmail) {
      throw new AppError('Primary admin account cannot be deleted.', 400);
    }

    const fileUrls = await collectUserFileUrls(target.id);
    await prisma.user.delete({ where: { id: target.id } });
    const deletedFileCount = deleteUserUploadedFiles(fileUrls);

    res.json({
      success: true,
      message: `${target.fullName} and related records have been deleted.`,
      user: { ...target, role: getEffectiveRole(target) },
      deletedFileCount,
    });
  } catch (err) {
    next(err);
  }
};

const deleteApplicant = async (req, res, next) => {
  try {
    if (!isPrimaryAdminEmail(req.user.email)) {
      throw new AppError(`Only ${PRIMARY_ADMIN_EMAIL} can delete applicants.`, 403);
    }

    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
    if (!application) throw new AppError('Application not found.', 404);
    if (!application.applicant) throw new AppError('Applicant account not found.', 404);

    const fileUrls = await collectApplicationFileUrls(application.id);
    await prisma.$transaction(async (tx) => {
      await tx.notification.updateMany({
        where: { applicationId: application.id },
        data: { applicationId: null },
      });

      await tx.activityLog.updateMany({
        where: { applicationId: application.id },
        data: { applicationId: null },
      });

      await tx.application.delete({ where: { id: application.id } });
    });

    const deletedFileCount = deleteUserUploadedFiles(fileUrls);

    res.json({
      success: true,
      message: `${application.applicant.fullName}'s application has been deleted. The applicant account was kept.`,
      applicant: application.applicant,
      applicationId: application.id,
      deletedFileCount,
    });
  } catch (err) {
    next(err);
  }
};

const inviteAdminUser = async (req, res, next) => {
  try {
    if (!isPrimaryAdminEmail(req.user.email)) {
      throw new AppError(`Only ${PRIMARY_ADMIN_EMAIL} can invite admin users.`, 403);
    }

    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const fullName = String(req.body.fullName || '').trim();

    if (!rawEmail) throw new AppError('Email is required.', 400);
    if (!emailPattern.test(rawEmail)) throw new AppError('Enter a valid email address.', 400);
    if (!fullName) throw new AppError('Full name is required.', 400);

    let user = await prisma.user.findUnique({ where: { email: rawEmail } });

    if (user && user.role !== 'ADMIN') {
      throw new AppError('This email is already registered as an applicant and cannot be invited as admin.', 400);
    }

    if (!user) {
      const tempPassword = `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await prisma.user.create({
        data: {
          email: rawEmail,
          fullName,
          passwordHash,
          role: 'ADMIN',
          isEmailVerified: true,
        },
      });
    } else if (fullName && user.fullName !== fullName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { fullName },
      });
    }

    const inviteToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '48h' }
    );

    const baseUrl = getClientBaseUrl(req);
    const inviteUrl = `${baseUrl}/forgot-password?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      to: user.email,
      subject: 'You have been invited as Scholarship Admin',
      template: 'adminInvite',
      data: {
        name: user.fullName,
        inviteUrl,
        invitedBy: req.user.fullName || PRIMARY_ADMIN_EMAIL,
      },
      throwOnError: true,
    });

    res.status(201).json({
      success: true,
      message: `Admin invitation sent to ${user.email}.`,
      invitedUser: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

const processDueEmailJobs = async () => {
  const dueJobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ['PENDING', 'RETRY'] },
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: 'asc' },
    take: 5,
  });

  for (const job of dueJobs) {
    const lock = await prisma.emailJob.updateMany({
      where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
      data: { status: 'PROCESSING' },
    });
    if (!lock.count) continue;

    try {
      const payload = job.payload || {};
      if (job.type !== 'BULK_EMAIL') throw new AppError(`Unsupported email job type: ${job.type}`, 400);

      const fakeReq = {
        body: payload,
        user: {
          id: payload.scheduledBy?.id || job.createdById || null,
          email: payload.scheduledBy?.email || '',
          fullName: payload.scheduledBy?.fullName || 'Scheduler',
        },
      };

      await bulkEmailApplicants(
        fakeReq,
        { json: () => null },
        (err) => { if (err) throw err; }
      );

      await prisma.emailJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', processedAt: new Date(), lastError: null },
      });
    } catch (err) {
      const nextAttempts = (job.attempts || 0) + 1;
      const failed = nextAttempts >= (job.maxAttempts || EMAIL_JOB_DEFAULT_MAX_ATTEMPTS);
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          attempts: nextAttempts,
          status: failed ? 'FAILED' : 'RETRY',
          runAt: failed ? job.runAt : new Date(Date.now() + 15 * 60 * 1000),
          lastError: String(err.message || 'Unknown job failure').slice(0, 1000),
          processedAt: failed ? new Date() : null,
        },
      });

      // Notify all super-admins when a job permanently fails
      if (failed) {
        const superAdmins = await prisma.user.findMany({
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
          select: { id: true },
        });
        if (superAdmins.length > 0) {
          await prisma.notification.createMany({
            data: superAdmins.map(u => ({
              userId: u.id,
              title: 'Bulk Email Job Failed',
              message: `A scheduled bulk email job (ID: ${job.id.slice(0, 8)}) permanently failed after ${nextAttempts} attempts. Check Bulk Email ? History for details.`,
              type: 'ERROR',
            })),
          });
        }
      }
    }
  }
};

module.exports = {
  listApplications,
  getApplication,
  updateStatus,
  updateApplicationFields,
  batchUpdateStatus,
  previewBulkEmailRecipients,
  sendBulkEmailTest,
  bulkEmailApplicants,
  scheduleBulkEmailApplicants,
  listEmailJobs,
  scheduleExam,
  bulkScheduleExam,
  listExamScheduleRecords,
  reviewCOR,
  getDashboardStats,
  sendManualNotification,
  getActivityLogs,
  listBulkEmailLogs,
  listAssignableExaminers,
  listAppeals,
  resolveAppeal,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  listUsers,
  updateUserRole,
  deleteUser,
  deleteApplicant,
  inviteAdminUser,
  processDueEmailJobs,
};

