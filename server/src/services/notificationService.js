const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createNotification = async ({ userId, applicationId, title, message, type = 'INFO' }) => {
  try {
    return await prisma.notification.create({
      data: { userId, applicationId: applicationId || null, title, message, type },
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { createNotification };
