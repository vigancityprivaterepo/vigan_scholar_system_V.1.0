const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('./emailService');
const { createNotification } = require('./notificationService');

const prisma = new PrismaClient();

let lastRunAt = 0;
const MIN_INTERVAL_MS = 60 * 60 * 1000; // hourly

const runAutomatedReminders = async () => {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;

  // Missing docs / incomplete applications
  const incompleteApps = await prisma.application.findMany({
    where: { status: 'INCOMPLETE' },
    take: 100,
    include: { applicant: { select: { id: true, email: true, fullName: true } } },
  });

  for (const app of incompleteApps) {
    await createNotification({
      userId: app.applicantId,
      applicationId: app.id,
      title: 'Reminder: Complete Missing Requirements',
      message: 'Your application is still incomplete. Please upload missing documents to continue the review.',
      type: 'WARNING',
    });
    await sendEmail({
      to: app.applicant.email,
      subject: 'Reminder: Incomplete Scholarship Requirements',
      template: 'adminBroadcast',
      data: {
        name: app.applicant.fullName,
        greeting: 'Greetings from the Scholarship Office.',
        message: 'Your scholarship application remains incomplete. Please submit the missing requirements as soon as possible.',
        portalUrl: `${process.env.CLIENT_URL}/applicant/status`,
      },
    });
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
    where: { status: 'APPROVED' },
    take: 100,
    include: { applicant: { select: { id: true, email: true, fullName: true } } },
  });
  for (const app of approvedApps) {
    await createNotification({
      userId: app.applicantId,
      applicationId: app.id,
      title: 'Reminder: Submit COR',
      message: 'Your application is approved. Please submit your COR to complete your acceptance.',
      type: 'INFO',
    });
  }
};

module.exports = { runAutomatedReminders };
