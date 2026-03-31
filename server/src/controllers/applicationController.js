const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { AppError } = require('../middleware/errorHandler');
const { isValidTransition } = require('../utils/statusTransitions');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

const prisma = new PrismaClient();

const submitApplication = async (req, res, next) => {
  try {
    const applicantId = req.user.id;

    // Check if already has application
    const existing = await prisma.application.findFirst({ where: { applicantId } });
    if (existing) throw new AppError('You already have a submitted application', 409);

    const { age, address, contact, school, course, yearLevel, gwa, achievements } = req.body;

    if (!age || !address || !contact || !school || !course || !yearLevel || !gwa) {
      throw new AppError('All personal and academic fields are required', 400);
    }

    const application = await prisma.application.create({
      data: {
        applicantId,
        age: parseInt(age),
        address,
        contact,
        school,
        course,
        yearLevel: parseInt(yearLevel),
        gwa: parseFloat(gwa),
        achievements: achievements || null,
        status: 'PENDING_REVIEW',
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

    // Notify all admin users
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        applicationId: application.id,
        title: 'New Application Received',
        message: `${user.fullName} submitted a new scholarship application. Ref: ${application.id.slice(0, 8).toUpperCase()}`,
        type: 'INFO',
      });
    }

    res.status(201).json({ success: true, message: 'Application submitted', application });
  } catch (err) {
    next(err);
  }
};

const getMyApplication = async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
      include: {
        requirementFiles: true,
        corFiles: { orderBy: { uploadedAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 10, include: { performedBy: { select: { fullName: true } } } },
        examSchedules: { orderBy: { scheduledAt: 'desc' }, take: 1 },
      },
    });

    if (!application) return res.json({ success: true, application: null });
    res.json({ success: true, application });
  } catch (err) {
    next(err);
  }
};

const resubmit = async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantId: req.user.id },
    });
    if (!application) throw new AppError('Application not found', 404);
    if (application.status !== 'INCOMPLETE') {
      throw new AppError('Only incomplete applications can be resubmitted', 400);
    }

    const { age, address, contact, school, course, yearLevel, gwa, achievements } = req.body;

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: 'PENDING_REVIEW',
        age: age ? parseInt(age) : undefined,
        address: address || undefined,
        contact: contact || undefined,
        school: school || undefined,
        course: course || undefined,
        yearLevel: yearLevel ? parseInt(yearLevel) : undefined,
        gwa: gwa ? parseFloat(gwa) : undefined,
        achievements: achievements || undefined,
        adminRemarks: null,
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

    // Notify all admin users
    const corUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        applicationId: application.id,
        title: 'COR Submitted for Review',
        message: `${corUser.fullName} submitted a Certificate of Registration. Ref: ${application.id.slice(0, 8).toUpperCase()}`,
        type: 'INFO',
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

module.exports = {
  submitApplication,
  getMyApplication,
  resubmit,
  submitCOR,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
