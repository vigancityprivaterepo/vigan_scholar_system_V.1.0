const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');
const { isValidTransition } = require('../utils/statusTransitions');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

const prisma = new PrismaClient();
const PRIMARY_ADMIN_EMAIL = 'data@vigancity.gov.ph';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const applyStatusUpdate = async ({
  application,
  status,
  remarks,
  rejectionReason,
  examScore,
  interviewNotes,
  performedById,
}) => {
  if (application.status === status) {
    return application;
  }

  if (!isValidTransition(application.status, status)) {
    throw new AppError(`Invalid status transition from ${application.status} to ${status}`, 400);
  }

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

  const updated = await prisma.application.update({ where: { id: application.id }, data: updateData });

  await prisma.activityLog.create({
    data: {
      applicationId: application.id,
      performedById,
      action: `Status changed to ${status}`,
      fromStatus: application.status,
      toStatus: status,
      notes: remarks || rejectionReason || null,
    },
  });

  await handleStatusNotification(application, status, remarks, rejectionReason);
  return updated;
};

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

    const updated = await applyStatusUpdate({
      application,
      status,
      remarks,
      rejectionReason,
      examScore,
      interviewNotes,
      performedById: req.user.id,
    });

    res.json({ success: true, message: 'Status updated', application: updated });
  } catch (err) {
    next(err);
  }
};

const batchUpdateStatus = async (req, res, next) => {
  try {
    const { applicationIds, status, remarks, rejectionReason, examScore, interviewNotes } = req.body;

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
          interviewNotes,
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

    res.json({ success: true, message: approved ? 'COR approved - applicant accepted' : 'COR rejected' });
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

const listUsers = async (req, res, next) => {
  try {
    if ((req.user.email || '').toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
      throw new AppError('Only data@vigancity.gov.ph can manage admin users.', 403);
    }

    const { role, search } = req.query;
    const where = {};

    // Restrict user control to admin accounts only.
    where.role = 'ADMIN';

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
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

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    if ((req.user.email || '').toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
      throw new AppError('Only data@vigancity.gov.ph can manage admin users.', 403);
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'APPLICANT'].includes(role)) {
      throw new AppError('Role must be ADMIN or APPLICANT.', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true },
    });
    if (!target) throw new AppError('User not found.', 404);

    if (target.id === req.user.id) {
      throw new AppError('You cannot change your own role.', 400);
    }

    if (target.role === 'APPLICANT' && role === 'ADMIN') {
      throw new AppError('Applicants cannot be promoted to admin from this panel.', 400);
    }

    if (target.role === role) {
      return res.json({ success: true, message: 'Role is already set.', user: target });
    }

    if (target.role === 'ADMIN' && role === 'APPLICANT') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
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

const inviteAdminUser = async (req, res, next) => {
  try {
    if ((req.user.email || '').toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
      throw new AppError('Only data@vigancity.gov.ph can invite admin users.', 403);
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
      `${process.env.JWT_SECRET}${user.passwordHash}`,
      { expiresIn: '48h' }
    );

    const inviteUrl = `${process.env.CLIENT_URL}/forgot-password?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(user.email)}`;

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
module.exports = {
  listApplications,
  getApplication,
  updateStatus,
  batchUpdateStatus,
  scheduleExam,
  reviewCOR,
  getDashboardStats,
  sendManualNotification,
  getActivityLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  listUsers,
  updateUserRole,
  inviteAdminUser,
};





