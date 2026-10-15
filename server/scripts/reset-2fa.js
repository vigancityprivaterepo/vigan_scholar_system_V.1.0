// Last-resort reset of a staff member's two-step sign-in, run by MIS on the server.
// This is the only way to reset the primary admin's own two-step sign-in.
//   docker compose exec server node scripts/reset-2fa.js <email>
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { resetTwoFactor } = require('../src/services/twoFactorService');

const main = async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/reset-2fa.js <email>');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
    if (!user) {
      console.error(`No account found for ${email}. Nothing was changed.`);
      process.exitCode = 1;
      return;
    }
    await resetTwoFactor(prisma, user.id);
    await prisma.activityLog.create({ data: { action: `Two-step sign-in reset on the server for ${user.email}` } });
    console.log(`Two-step sign-in reset for ${user.email}. They will set it up at next sign-in.`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exitCode = 1;
});
