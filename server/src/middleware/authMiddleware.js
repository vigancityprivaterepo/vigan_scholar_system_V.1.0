const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('./errorHandler');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, fullName: true },
    });

    if (!user) throw new AppError('User not found', 401);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
