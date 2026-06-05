const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('./emailService');
const { createNotification } = require('./notificationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

let lastRunAt = 0;
const MIN_INTERVAL_MS = 60 * 60 * 1000; // hourly
const REMINDER_WORKER_LOCK_KEY = 41021;
const INCOMPLETE_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const INCOMPLETE_REMINDER_SUBJECT = 'Reminder: Incomplete Scholarship Requirements';
const INCOMPLETE_REMINDER_TITLE = 'Reminder: Complete Missing Requirements';
const INCOMPLETE_REMINDER_MESSAGE = 'Your application is still incomplete. Please upload missing documents to continue the review.';
const COR_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const COR_REMINDER_TITLE = 'Reminder: Submit COR';
const COR_REMINDER_MESSAGE = 'Your application is approved. Please submit your COR to complete your acceptance.';
const COR_REMINDER_SUBJECT = 'Reminder: Submit COR';

const tryAcquireReminderWorkerLock = async () => {
  const result = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${REMINDER_WORKER_LOCK_KEY}) AS locked`;
  return Boolean(result?.[0]?.locked);
};

const releaseReminderWorkerLock = async () => {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${REMINDER_WORKER_LOCK_KEY})`;
};

const runAutomatedReminders = async () => {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  const lockAcquired = await tryAcquireReminderWorkerLock();
  if (!lockAcquired) {
    logger.info('Skipping automated reminders: another server instance holds the worker lock.');
    return;
  }

  lastRunAt = now;

  try {
    const incompleteReminderCutoff = new Date(now - INCOMPLETE_REMINDER_INTERVAL_MS);
    const corReminderCutoff = new Date(now - COR_REMINDER_INTERVAL_MS);

    // Missing docs / incomplete applications
    const incompleteApps = await prisma.application.findMany({
      where: {
        status: 'INCOMPLETE',
        NOT: {
          communicationLogs: {
            some: {
              channel: 'EMAIL',
              subject: INCOMPLETE_REMINDER_SUBJECT,
              createdAt: { gte: incompleteReminderCutoff },
            },
          },
        },
      },
      take: 100,
      include: { applicant: { select: { id: true, email: true, fullName: true } } },
    });

    for (const app of incompleteApps) {
      try {
        await sendEmail({
          to: app.applicant.email,
          subject: INCOMPLETE_REMINDER_SUBJECT,
          template: 'adminBroadcast',
          data: {
            name: app.applicant.fullName,
            greeting: 'Greetings from the Scholarship Office.',
            message: 'Your scholarship application remains incomplete. Please submit the missing requirements as soon as possible.',
            portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
          },
          throwOnError: true,
        });

        await prisma.communicationLog.create({
          data: {
            applicationId: app.id,
            userId: app.applicantId,
            channel: 'EMAIL',
            subject: INCOMPLETE_REMINDER_SUBJECT,
            message: INCOMPLETE_REMINDER_MESSAGE,
            metadata: {
              template: 'adminBroadcast',
              reminderType: 'INCOMPLETE_REQUIREMENTS',
              automated: true,
            },
          },
        });

        await createNotification({
          userId: app.applicantId,
          applicationId: app.id,
          title: INCOMPLETE_REMINDER_TITLE,
          message: INCOMPLETE_REMINDER_MESSAGE,
          type: 'WARNING',
        });
      } catch (err) {
        logger.error('Failed to send incomplete application reminder', {
          applicationId: app.id,
          applicantId: app.applicantId,
          message: err.message,
        });
      }
    }

    // Upcoming exam/interview within 48h
    const in48h = new Date(now + 48 * 60 * 60 * 1000);
    const upcomingSchedules = await prisma.examSchedule.findMany({
      where: { scheduledAt: { gte: new Date(now), lte: in48h }, status: 'SCHEDULED' },
      take: 100,
      include: { application: { include: { applicant: { select: { id: true, email: true, fullName: true } } } } },
    });

    for (const schedule of upcomingSchedules) {
      await createNotification({
        userId: schedule.application.applicantId,
        applicationId: schedule.applicationId,
        title: 'Reminder: Upcoming Exam/Interview',
        message: `You have a scheduled ${String(schedule.type || 'exam/interview').toLowerCase()} on ${new Date(schedule.scheduledAt).toLocaleString()}.`,
        type: 'INFO',
      });
    }

    // Pending COR reminder
    const approvedApps = await prisma.application.findMany({
      where: {
        status: 'APPROVED',
        NOT: {
          communicationLogs: {
            some: {
              channel: 'PORTAL_NOTICE',
              subject: COR_REMINDER_SUBJECT,
              createdAt: { gte: corReminderCutoff },
            },
          },
        },
      },
      take: 100,
      include: { applicant: { select: { id: true, email: true, fullName: true } } },
    });
    for (const app of approvedApps) {
      try {
        await prisma.communicationLog.create({
          data: {
            applicationId: app.id,
            userId: app.applicantId,
            channel: 'PORTAL_NOTICE',
            subject: COR_REMINDER_SUBJECT,
            message: COR_REMINDER_MESSAGE,
            metadata: {
              reminderType: 'SUBMIT_COR',
              automated: true,
            },
          },
        });

        await createNotification({
          userId: app.applicantId,
          applicationId: app.id,
          title: COR_REMINDER_TITLE,
          message: COR_REMINDER_MESSAGE,
          type: 'INFO',
        });
      } catch (err) {
        logger.error('Failed to send COR submission reminder', {
          applicationId: app.id,
          applicantId: app.applicantId,
          message: err.message,
        });
      }
    }
  } finally {
    await releaseReminderWorkerLock().catch((err) => {
      logger.error('Failed to release automated reminder worker lock', { message: err.message });
    });
  }
};

module.exports = { runAutomatedReminders };
