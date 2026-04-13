const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { hashToken } = require('./tokenHash');
const prisma = new PrismaClient();

const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId, token: hashToken(refreshToken), expiresAt },
  });

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
