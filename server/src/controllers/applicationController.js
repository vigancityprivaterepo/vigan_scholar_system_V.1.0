const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { AppError } = require('../middleware/errorHandler');
const { isValidTransition } = require('../utils/statusTransitions');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { toAcademicYear } = require('../utils/academicYear');

const prisma = new PrismaClient();
const OPTIONAL_SCHEMA_ERROR_CODES = new Set(['P2021', 'P2022']);

const roundToTwoDecimals = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const loadLegacyExamSchedules = async (applicationId, take = null) => {
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

  const normalizedRows = rows.map((row) => ({
    ...row,
    examinerId: null,
    examiner: null,
  }));

  return typeof take === 'number' ? normalizedRows.slice(0, take) : normalizedRows;
};

const getApplicationWindow = async () => {
  let rows = [];
  try {
    rows = await prisma.$queryRaw`
      SELECT "application_open", "application_deadline"
      FROM "site_settings"
      WHERE "id" = 'default'
      LIMIT 1
    `;
  } catch {
    // If site_settings does not exist yet, keep defaults (open, no deadline).
    rows = [];
  }

  const applicationOpen = rows[0] ? Boolean(rows[0].application_open) : true;
  const deadlineRaw = rows[0]?.application_deadline;
  const applicationDeadline = deadlineRaw ? new Date(deadlineRaw) : null;
  const isPastDeadline = applicationDeadline ? Date.now() > applicationDeadline.getTime() : false;

  return { applicationOpen, applicationDeadline, isPastDeadline };
};

const ensureSubmissionOpen = async () => {
  const { applicationOpen, applicationDeadline, isPastDeadline } = await getApplicationWindow();

  if (!applicationOpen) {
    throw new AppError('Applications are currently closed. Please check back later.', 403);
  }

  if (isPastDeadline) {
    throw new AppError(
      `The application deadline (${applicationDeadline.toISOString()}) has already passed.`,
      403
    );
  }
};

const submitApplication = async (req, res, next) => {
  try {
    const applicantId = req.user.id;

    // Check if applications are open and deadline has not passed
    await ensureSubmissionOpen();

    // Check if already has application
    const existing = await prisma.application.findFirst({ where: { applicantId } });
    if (existing) throw new AppError('You already have a submitted application', 409);

    const {
      // Personal Info
      lastName, firstName, middleName, placeOfBirth, birthdate, sex, gender,
      age, address, contact, school, course, yearLevel,
      // Family Info
      fatherName, fatherOccupation, motherName, motherOccupation,
      numDependents, familyIncome, incomeSource,
      // Academic
      schoolAddress, yearGraduated, generalAverage, collegePreferences,
      soloParent, fourPs, priorScholarship, scholarshipType,
      gwa, achievements,
    } = req.body;

    if (!lastName || !firstName || !address || !contact || !sex || !gender) {
      throw new AppError('All personal information fields are required', 400);
    }
    if (!fatherName || !motherName || !numDependents || !familyIncome || !incomeSource) {
      throw new AppError('All family information fields are required', 400);
    }
    const normalizedGeneralAverage = roundToTwoDecimals(generalAverage);
    const normalizedGwa = normalizedGeneralAverage ?? roundToTwoDecimals(gwa);

    if (!school || !yearGraduated || normalizedGeneralAverage === null) {
      throw new AppError('All academic fields are required', 400);
    }

    const application = await prisma.application.create({
      data: {
        applicantId,
        // Personal
        lastName, firstName, middleName: middleName || null,
        placeOfBirth: placeOfBirth || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        sex, gender,
        age: age ? parseInt(age) : null,
        address, contact,
        school: school || null,
        course: course || null,
        yearLevel: yearLevel ? parseInt(yearLevel) : null,
        // Family
        fatherName, fatherOccupation: fatherOccupation || null,
        motherName, motherOccupation: motherOccupation || null,
        numDependents: parseInt(numDependents),
        familyIncome: parseFloat(familyIncome),
        incomeSource,
        // Academic
        schoolAddress: schoolAddress || null,
        yearGraduated: parseInt(yearGraduated),
        generalAverage: normalizedGeneralAverage,
        collegePreferences: collegePreferences ? JSON.parse(collegePreferences) : null,
        soloParent: soloParent !== undefined ? (soloParent === 'true' || soloParent === true) : null,
        fourPs: fourPs !== undefined ? (fourPs === 'true' || fourPs === true) : null,
        priorScholarship: priorScholarship === 'true' || priorScholarship === true,
        scholarshipType: scholarshipType || null,
        gwa: normalizedGwa,
        achievements: achievements || null,
        status: 'PENDING_REVIEW',
        academicYear: toAcademicYear(new Date()),
      },
    });

    // Save uploaded files
    if (req.files && req.files.length > 0) {
      const fileData = req.files.map((file) => ({
        applicationId: application.id,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
      await prisma.requirementFile.createMany({ data: fileData });
    }

    // Create notification
    await createNotification({
      userId: applicantId,
      applicationId: application.id,
      title: 'Application Submitted',
      message: `Your scholarship application has been submitted successfully. Reference ID: ${application.id.slice(0, 8).toUpperCase()}`,
      type: 'SUCCESS',
    });

    // Send email
    const user = await prisma.user.findUnique({ where: { id: applicantId } });
    await sendEmail({
      to: user.email,
      subject: `Application Received — Reference #${application.id.slice(0, 8).toUpperCase()}`,
      template: 'applicationSubmitted',
      data: { name: user.fullName, refId: application.id.slice(0, 8).toUpperCase() },
    });

    // Notify all admin users (batch)
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          applicationId: application.id,
          title: 'New Application Received',
          message: `${user.fullName} submitted a new scholarship application. Ref: ${application.id.slice(0, 8).toUpperCase()}`,
          type: 'INFO',
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Application submitted', application });
  } catch (err) {
    next(err);
  }
};

const getMyApplication = async (req, res, next) => {
  try {
    let application;
    try {
      application = await prisma.application.findFirst({
        where: { applicantId: req.user.id },
        include: {
          requirementFiles: true,
          corFiles: { orderBy: { uploadedAt: 'desc' } },
          activityLogs: { orderBy: { createdAt: 'desc' }, take: 10, include: { performedBy: { select: { fullName: true } } } },
          examSchedules: {
            orderBy: { scheduledAt: 'desc' },
            take: 1,
            include: { examiner: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      });
    } catch (err) {
      if (!OPTIONAL_SCHEMA_ERROR_CODES.has(err?.code)) throw err;
      application = await prisma.application.findFirst({
        where: { applicantId: req.user.id },
        include: {
          requirementFiles: true,
          corFiles: { orderBy: { uploadedAt: 'desc' } },
          activityLogs: { orderBy: { createdAt: 'desc' }, take: 10, include: { performedBy: { select: { fullName: true } } } },
        },
      });
      if (application) {
        application.examSchedules = await loadLegacyExamSchedules(application.id, 1);
      }
    }

    if (!application) return res.json({ success: true, application: null });
    res.json({ success: true, application });
  } catch (err) {
    next(err);
  }
};

const resubmit = async (req, res, next) => {
  try {
    await ensureSubmissionOpen();

    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (application.status !== 'INCOMPLETE') {
      throw new AppError('Only incomplete applications can be resubmitted', 400);
    }

    const {
      lastName, firstName, middleName, placeOfBirth, birthdate, sex, gender,
      age, address, contact, school, course, yearLevel,
      fatherName, fatherOccupation, motherName, motherOccupation,
      numDependents, familyIncome, incomeSource,
      schoolAddress, yearGraduated, generalAverage, collegePreferences,
      soloParent, fourPs, priorScholarship, scholarshipType,
      gwa, achievements,
    } = req.body;

    const normalizedGeneralAverage = roundToTwoDecimals(generalAverage);
    const normalizedGwa = normalizedGeneralAverage ?? roundToTwoDecimals(gwa);

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: 'PENDING_REVIEW',
        // Personal
        lastName: lastName || undefined,
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        placeOfBirth: placeOfBirth || undefined,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        sex: sex || undefined,
        gender: gender || undefined,
        age: age ? parseInt(age) : undefined,
        address: address || undefined,
        contact: contact || undefined,
        school: school || undefined,
        course: course || undefined,
        yearLevel: yearLevel ? parseInt(yearLevel) : undefined,
        // Family
        fatherName: fatherName || undefined,
        fatherOccupation: fatherOccupation || undefined,
        motherName: motherName || undefined,
        motherOccupation: motherOccupation || undefined,
        numDependents: numDependents ? parseInt(numDependents) : undefined,
        familyIncome: familyIncome ? parseFloat(familyIncome) : undefined,
        incomeSource: incomeSource || undefined,
        // Academic
        schoolAddress: schoolAddress || undefined,
        yearGraduated: yearGraduated ? parseInt(yearGraduated) : undefined,
        generalAverage: normalizedGeneralAverage !== null ? normalizedGeneralAverage : undefined,
        collegePreferences: collegePreferences ? JSON.parse(collegePreferences) : undefined,
        soloParent: soloParent !== undefined ? (soloParent === 'true' || soloParent === true) : undefined,
        fourPs: fourPs !== undefined ? (fourPs === 'true' || fourPs === true) : undefined,
        priorScholarship: priorScholarship !== undefined ? (priorScholarship === 'true' || priorScholarship === true) : undefined,
        scholarshipType: scholarshipType || undefined,
        gwa: normalizedGwa !== null ? normalizedGwa : undefined,
        achievements: achievements || undefined,
        adminRemarks: null,
        requirementChecklist: undefined,
      },
    });

    // Save new files if any
    if (req.files && req.files.length > 0) {
      const fileData = req.files.map((file) => ({
        applicationId: application.id,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
      }));
      await prisma.requirementFile.createMany({ data: fileData });
    }

    await prisma.activityLog.create({
      data: {
        applicationId: application.id,
        performedById: req.user.id,
        action: 'Resubmitted application',
        fromStatus: 'INCOMPLETE',
        toStatus: 'PENDING_REVIEW',
      },
    });

    // Notify all admin users (batch)
    const resubmitUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const resubmitAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (resubmitAdmins.length > 0) {
      await prisma.notification.createMany({
        data: resubmitAdmins.map(admin => ({
          userId: admin.id,
          applicationId: application.id,
          title: 'Application Resubmitted',
          message: `${resubmitUser.fullName} resubmitted their scholarship application. Ref: ${application.id.slice(0, 8).toUpperCase()}`,
          type: 'INFO',
        })),
      });
    }

    res.json({ success: true, message: 'Application resubmitted', application: updated });
  } catch (err) {
    next(err);
  }
};

const submitCOR = async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (!['APPROVED', 'COR_REJECTED'].includes(application.status)) {
      throw new AppError('COR submission is only allowed when application is approved or COR was rejected', 400);
    }
    if (!req.file) throw new AppError('COR file is required', 400);

    await prisma.corFile.create({
      data: {
        applicationId: application.id,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });

    if (!isValidTransition(application.status, 'COR_SUBMITTED')) {
      throw new AppError(`Cannot submit COR from current status: ${application.status}`, 409);
    }

    await prisma.application.update({
      where: { id: application.id },
      data: { status: 'COR_SUBMITTED' },
    });

    await prisma.activityLog.create({
      data: {
        applicationId: application.id,
        performedById: req.user.id,
        action: 'Submitted COR',
        fromStatus: application.status,
        toStatus: 'COR_SUBMITTED',
      },
    });

    await createNotification({
      userId: req.user.id,
      applicationId: application.id,
      title: 'COR Submitted',
      message: 'Your Certificate of Registration has been submitted for review.',
      type: 'INFO',
    });

    // Notify all admin users (batch)
    const corUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const corAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (corAdmins.length > 0) {
      await prisma.notification.createMany({
        data: corAdmins.map(admin => ({
          userId: admin.id,
          applicationId: application.id,
          title: 'COR Submitted for Review',
          message: `${corUser.fullName} submitted a Certificate of Registration. Ref: ${application.id.slice(0, 8).toUpperCase()}`,
          type: 'INFO',
        })),
      });
    }

    res.json({ success: true, message: 'COR submitted successfully' });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!notification) throw new AppError('Notification not found', 404);

    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

const listMyCommunications = async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
      select: { id: true },
    });
    if (!application) return res.json({ success: true, timeline: [] });

    const [notifications, communicationLogs] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id, applicationId: application.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.communicationLog.findMany({
        where: { userId: req.user.id, applicationId: application.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const timeline = [
      ...notifications.map((item) => ({
        id: `notif_${item.id}`,
        source: 'NOTIFICATION',
        title: item.title,
        message: item.message,
        status: item.type,
        createdAt: item.createdAt,
      })),
      ...communicationLogs.map((item) => ({
        id: `comm_${item.id}`,
        source: item.channel || 'COMMUNICATION',
        title: item.subject || item.channel,
        message: item.message || '',
        status: item.direction || 'OUTBOUND',
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, timeline });
  } catch (err) {
    next(err);
  }
};

const submitAppeal = async (req, res, next) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) throw new AppError('Appeal reason is required.', 400);

    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
      select: { id: true, status: true },
    });
    if (!application) throw new AppError('Application not found.', 404);
    if (!['REJECTED', 'NOT_QUALIFIED', 'FAILED_EXAM'].includes(application.status)) {
      throw new AppError('Appeals are only allowed for rejected applications.', 400);
    }

    const existingPending = await prisma.appeal.findFirst({
      where: { applicationId: application.id, status: 'PENDING' },
      select: { id: true },
    });
    if (existingPending) throw new AppError('You already have a pending appeal.', 409);

    const appeal = await prisma.appeal.create({
      data: {
        applicationId: application.id,
        applicantId: req.user.id,
        reason,
        status: 'PENDING',
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'REVIEWER'] } },
      select: { id: true },
    });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          applicationId: application.id,
          title: 'New Appeal Submitted',
          message: `${req.user.fullName} submitted an appeal for application ${application.id.slice(0, 8).toUpperCase()}.`,
          type: 'WARNING',
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Appeal submitted.', appeal });
  } catch (err) {
    next(err);
  }
};

const listMyAppeals = async (req, res, next) => {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { applicantId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        application: { select: { id: true, status: true, academicYear: true } },
        reviewedBy: { select: { fullName: true, role: true } },
      },
    });
    res.json({ success: true, appeals });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitApplication,
  getMyApplication,
  resubmit,
  submitCOR,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listMyCommunications,
  submitAppeal,
  listMyAppeals,
};
