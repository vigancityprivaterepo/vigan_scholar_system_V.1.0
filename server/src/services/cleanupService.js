const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete RefreshToken rows that have already expired.
 * Runs on a 24-hour interval so the refresh_tokens table does not grow unbounded.
 */
const purgeExpiredRefreshTokens = async () => {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (result.count > 0) {
    console.log(`[cleanup] Purged ${result.count} expired refresh token(s).`);
  }
};

module.exports = { purgeExpiredRefreshTokens };
