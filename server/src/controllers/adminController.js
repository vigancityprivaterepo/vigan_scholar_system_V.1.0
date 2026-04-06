const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');
const { isValidTransition } = require('../utils/statusTransitions');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

const prisma = new PrismaClient();

const listApplications = async (req, res, next) => {
  try {
    const ALLOWED_SORT_FIELDS = ['submittedAt', 'updatedAt', 'gwa', 'status'];
  const { page = 1, limit = 20, status, search, sortBy: rawSortBy = 'submittedAt', sortOrder: rawSortOrder = 'desc' } = req.query;
  const sortBy = ALLOWED_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'submittedAt';
  const sortOrder = rawSortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      where.status = { in: statuses };
    }
    if (search) {
      where.applicant = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
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
          _count: { select: { requirementFiles: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      success: true,
      applications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, email: true, fullName: true, createdAt: true } },
        requirementFiles: true,
        corFiles: { orderBy: { uploadedAt: 'desc' } },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: { performedBy: { select: { fullName: true, role: true } } },
        },
        examSchedules: { orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!application) throw new AppError('Application not found', 404);
    res.json({ success: true, application });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, rejectionReason, examScore, interviewNotes } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);

    if (!isValidTransition(application.status, status)) {
      throw new AppError(
        `Invalid status transition from ${application.status} to ${status}`,
        400
      );
    }

    // Enforce GWA threshold when moving to NOT_QUALIFIED via eligibility screening
    if (status === 'ELIGIBILITY_SCREENING' || status === 'NOT_QUALIFIED') {
      // No GWA block here — admin decides; threshold is advisory on the frontend
    }

    // When admin qualifies to EXAM_INTERVIEW, check GWA against saved threshold
    if (status === 'EXAM_INTERVIEW' && application.gwa !== null) {
      const settingsRows = await prisma.$queryRaw`SELECT "gwa_threshold" FROM "site_settings" WHERE "id" = 'default' LIMIT 1`;
      const threshold = settingsRows[0] ? parseFloat(settingsRows[0].gwa_threshold) : 2.0;
      if (parseFloat(application.gwa) > threshold) {
        throw new AppError(
          `Applicant GWA (${application.gwa}) does not meet the minimum threshold of ${threshold}.`,
          400
        );
      }
    }

    const updateData = { status };
    if (remarks) updateData.adminRemarks = remarks;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (examScore !== undefined) updateData.examScore = parseFloat(examScore);
    if (interviewNotes) updateData.interviewNotes = interviewNotes;

    const updated = await prisma.application.update({ where: { id }, data: updateData });

    // Log activity
    await prisma.activityLog.create({
      data: {
        applicationId: id,
        performedById: req.user.id,
        action: `Status changed to ${status}`,
        fromStatus: application.status,
        toStatus: status,
        notes: remarks || rejectionReason || null,
      },
    });

    // Send notifications based on new status
    await handleStatusNotification(application, status, remarks, rejectionReason);

    res.json({ success: true, message: 'Status updated', application: updated });
  } catch (err) {
    next(err);
  }
};

const handleStatusNotification = async (application, newStatus, remarks, rejectionReason) => {
  const user = application.applicant;
  const refId = application.id.slice(0, 8).toUpperCase();

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
        subject: 'Scholarship Application — Eligibility Result',
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
        subject: 'Scholarship Application — Exam/Interview Result',
        template: 'failedExam',
      },
    },
    APPROVED: {
      title: '🎉 Application Approved!',
      message: 'Congratulations! Your application has been approved. Please submit your Certificate of Registration (COR).',
      type: 'SUCCESS',
      email: {
        subject: 'Congratulations! Please Submit Your COR',
        template: 'approved',
      },
    },
    COR_REJECTED: {
      title: 'COR Rejected — Resubmission Required',
      message: `Your COR was rejected. Reason: ${rejectionReason || 'Please review and resubmit.'}`,
      type: 'ERROR',
      email: {
        subject: 'Action Required: Resubmit Your COR',
        template: 'corRejected',
      },
    },
    ACCEPTED: {
      title: '🎉 Welcome, Scholar!',
      message: 'Congratulations! Your scholarship application has been fully accepted. Welcome to the program!',
      type: 'SUCCESS',
      email: {
        subject: '🎉 Welcome, Scholar! Your Application is Confirmed',
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
  }
};

const scheduleExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledAt, location, type } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (application.status !== 'EXAM_INTERVIEW') {
      throw new AppError('Application must be in EXAM_INTERVIEW status', 400);
    }

    const schedule = await prisma.examSchedule.create({
      data: {
        applicationId: id,
        scheduledAt: new Date(scheduledAt),
        location: location || null,
        type: type || 'BOTH',
      },
    });

    await prisma.application.update({
      where: { id },
      data: { interviewDate: new Date(scheduledAt) },
    });

    await createNotification({
      userId: application.applicant.id,
      applicationId: id,
      title: 'Exam/Interview Scheduled',
      message: `Your exam/interview is scheduled for ${new Date(scheduledAt).toLocaleString()}${location ? ` at ${location}` : ''}.`,
      type: 'INFO',
    });

    await sendEmail({
      to: application.applicant.email,
      subject: 'Your Exam/Interview is Scheduled',
      template: 'examScheduled',
      data: {
        name: application.applicant.fullName,
        scheduledAt: new Date(scheduledAt).toLocaleString(),
        location,
        type,
        portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
      },
    });

    await prisma.activityLog.create({
      data: {
        applicationId: id,
        performedById: req.user.id,
        action: `Scheduled ${type} for ${new Date(scheduledAt).toLocaleDateString()}`,
      },
    });

    res.json({ success: true, message: 'Exam/interview scheduled', schedule });
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

    res.json({ success: true, message: approved ? 'COR approved — applicant accepted' : 'COR rejected' });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [total, byStatus, recentLogs] = await Promise.all([
      prisma.application.count(),
      prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          application: { include: { applicant: { select: { fullName: true } } } },
          performedBy: { select: { fullName: true } },
        },
      }),
    ]);

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
    };

    res.json({ success: true, stats, recentActivity: recentLogs });
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

const getAdminNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, notifications });
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

module.exports = {
  listApplications,
  getApplication,
  updateStatus,
  scheduleExam,
  reviewCOR,
  getDashboardStats,
  sendManualNotification,
  getActivityLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
};
